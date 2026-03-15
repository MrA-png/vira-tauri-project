mod audio;
mod stt;

use std::sync::Mutex;
use screencapturekit::stream::SCStream;
use log::{info, error, warn};

pub struct AppState {
    pub stream: Mutex<Option<SCStream>>,
}

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
async fn start_interview(window: tauri::Window, state: tauri::State<'_, AppState>) -> Result<(), String> {
    let (tx, rx) = tokio::sync::mpsc::channel(100);
    
    // Start audio capture in background
    info!("Starting audio capture...");
    let stream = audio::start_audio_capture(tx).map_err(|e: Box<dyn std::error::Error>| e.to_string())?;
    
    // Store stream in state to prevent it from being dropped
    *state.stream.lock().unwrap() = Some(stream);
    info!("Audio capture started successfully and stored in AppState");
    
    // Start STT in background
    let api_key = std::env::var("DEEPGRAM_API_KEY").map_err(|_| "DEEPGRAM_API_KEY not found in .env".to_string())?;
    let stt = stt::SttManager::new(api_key);
    
    tokio::spawn(async move {
        info!("STT Task spawned");
        if let Err(e) = stt.start_stream(rx, window).await {
            error!("STT Error: {:?}", e);
        }
        info!("STT Task ended");
    });

    Ok(())
}

#[tauri::command]
async fn stop_interview(state: tauri::State<'_, AppState>) -> Result<(), String> {
    info!("Stopping audio capture...");
    let mut stream_opt = state.stream.lock().unwrap();
    if let Some(stream) = stream_opt.take() {
        let _ = stream.stop_capture();
        info!("Audio capture stopped successfully");
    } else {
        warn!("No active stream to stop");
    }
    Ok(())
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    dotenvy::dotenv().ok();
    
    tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::new()
            .targets([
                tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::Stdout),
                tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::Folder {
                    path: std::path::PathBuf::from("logs"),
                    file_name: Some("app".into()),
                }),
                tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::Webview),
            ])
            .build())
        .manage(AppState { stream: Mutex::new(None) })
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![greet, start_interview, stop_interview])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
