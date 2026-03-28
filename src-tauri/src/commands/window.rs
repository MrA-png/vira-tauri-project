use tauri::Manager;

#[cfg(target_os = "macos")]
use crate::utils::window::{apply_window_overrides, OVERLAY_WINDOW_LEVEL};

#[tauri::command]
pub async fn open_settings_window(handle: tauri::AppHandle) -> Result<(), String> {
    const LABEL: &str = "settings";

    if let Some(window) = handle.get_webview_window(LABEL) {
        log::info!("Settings window already exists — focusing");
        window.show().map_err(|e| e.to_string())?;
        window.set_focus().map_err(|e| e.to_string())?;
        return Ok(());
    }

    log::info!("Creating settings window…");

    let window = tauri::WebviewWindowBuilder::new(
        &handle,
        LABEL,
        tauri::WebviewUrl::App("index.html".into()),
    )
    .title("Settings")
    .inner_size(400.0, 400.0)
    .transparent(true)
    .decorations(false)
    .always_on_top(true)
    .resizable(false)
    .shadow(true)
    .center()
    .build()
    .map_err(|e| {
        log::error!("Failed to create settings window: {}", e);
        e.to_string()
    })?;

    window.show().map_err(|e| e.to_string())?;
    window.set_focus().map_err(|e| e.to_string())?;

    #[cfg(target_os = "macos")]
    {
        let window_clone = window.clone();
        tokio::time::sleep(std::time::Duration::from_millis(200)).await;
        handle
            .run_on_main_thread(move || {
                apply_window_overrides(&window_clone, OVERLAY_WINDOW_LEVEL);
            })
            .map_err(|e| e.to_string())?;
    }

    Ok(())
}
