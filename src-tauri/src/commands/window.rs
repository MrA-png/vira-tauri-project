use tauri::Manager;

#[cfg(target_os = "macos")]
use crate::utils::window::{apply_window_overrides, OVERLAY_WINDOW_LEVEL};

async fn create_overlay_window(
    handle: &tauri::AppHandle,
    label: &str,
    title: &str,
    width: f64,
    height: f64,
    resizable: bool,
) -> Result<(), String> {
    if let Some(window) = handle.get_webview_window(label) {
        log::info!("Window {} already exists — focusing", label);
        window.show().map_err(|e| e.to_string())?;
        window.set_focus().map_err(|e| e.to_string())?;
        return Ok(());
    }

    log::info!("Creating window {}…", label);

    let window = tauri::WebviewWindowBuilder::new(
        handle,
        label,
        tauri::WebviewUrl::App("index.html".into()),
    )
    .title(title)
    .inner_size(width, height)
    .transparent(true)
    .decorations(false)
    .always_on_top(true)
    .resizable(resizable)
    .shadow(true)
    .center()
    .build()
    .map_err(|e| {
        log::error!("Failed to create window {}: {}", label, e);
        e.to_string()
    })?;

    window.show().map_err(|e| e.to_string())?;
    window.set_focus().map_err(|e| e.to_string())?;

    #[cfg(target_os = "macos")]
    {
        let window_clone = window.clone();
        let handle_clone = handle.clone();
        tokio::time::sleep(std::time::Duration::from_millis(200)).await;
        handle_clone
            .run_on_main_thread(move || {
                apply_window_overrides(&window_clone, OVERLAY_WINDOW_LEVEL);
            })
            .map_err(|e| e.to_string())?;
    }

    Ok(())
}

#[tauri::command]
pub async fn open_settings_window(handle: tauri::AppHandle) -> Result<(), String> {
    create_overlay_window(&handle, "settings", "Settings", 400.0, 400.0, false).await
}

#[tauri::command]
pub async fn open_history_window(handle: tauri::AppHandle) -> Result<(), String> {
    create_overlay_window(&handle, "history", "History", 600.0, 500.0, true).await
}

#[tauri::command]
pub async fn open_ai_window(handle: tauri::AppHandle) -> Result<(), String> {
    create_overlay_window(&handle, "ai", "VIRA AI", 450.0, 600.0, true).await
}
