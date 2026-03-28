use crate::config::AppConfig;
use crate::errors::AppError;
use crate::services::audio;
use crate::services::stt::SttService;
use crate::state::AppState;
use log::{error, info, warn};
use tauri::State;
use tokio::sync::mpsc;

#[tauri::command]
pub async fn start_interview(
    window: tauri::Window,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let config = AppConfig::from_env().map_err(|e| e.to_string())?;
    let (tx, rx) = mpsc::channel(100);

    info!("Starting audio capture…");
    let stream = audio::start_audio_capture(tx).map_err(|e: AppError| e.to_string())?;

    *state.stream.lock().unwrap() = Some(stream);
    info!("Audio capture started and stored in AppState");

    let stt = SttService::new(&config.deepgram_api_key).map_err(|e: AppError| e.to_string())?;

    tokio::spawn(async move {
        info!("STT task spawned");
        if let Err(e) = stt.run_stream(rx, window).await {
            error!("STT task ended with error: {}", e);
        } else {
            info!("STT task ended");
        }
    });

    Ok(())
}

#[tauri::command]
pub async fn stop_interview(state: State<'_, AppState>) -> Result<(), String> {
    info!("Stopping audio capture…");
    let mut stream_opt = state.stream.lock().unwrap();

    if let Some(stream) = stream_opt.take() {
        stream
            .stop_capture()
            .map_err(|e| AppError::Audio(format!("{:?}", e)).to_string())?;
        info!("Audio capture stopped");
    } else {
        warn!("stop_interview called but no active stream found");
    }

    Ok(())
}
