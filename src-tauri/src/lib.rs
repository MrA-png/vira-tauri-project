pub mod commands;
pub mod config;
pub mod errors;
pub mod models;
pub mod services;
pub mod state;
pub mod utils;

use state::AppState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    dotenvy::dotenv().ok();

    tauri::Builder::default()
        .plugin(
            tauri_plugin_log::Builder::new()
                .targets([
                    tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::Stdout),
                    tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::Folder {
                        path: std::path::PathBuf::from("logs"),
                        file_name: Some("app".into()),
                    }),
                    tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::Webview),
                ])
                .build(),
        )
        .plugin(tauri_plugin_opener::init())
        .manage(AppState::default())
        .invoke_handler(tauri::generate_handler![
            commands::interview::start_interview,
            commands::interview::stop_interview,
            commands::window::open_settings_window,
            commands::window::open_history_window,
            commands::history::save_session,
            commands::history::get_all_sessions,
            commands::history::delete_session,
        ])
        .setup(|app| {
            #[cfg(target_os = "macos")]
            {
                use tauri::Manager;
                use utils::window::{apply_window_overrides, MAIN_WINDOW_LEVEL};

                for window in app.webview_windows().values() {
                    apply_window_overrides(window, MAIN_WINDOW_LEVEL);
                }
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
