use crate::models::{Session};
use tauri::{AppHandle, Manager};
use std::fs;

#[tauri::command]
pub async fn save_session(app_handle: AppHandle, session: Session) -> Result<(), String> {
    let app_data_dir = app_handle.path().app_data_dir().map_err(|e| e.to_string())?;
    let history_dir = app_data_dir.join("history");

    if !history_dir.exists() {
        fs::create_dir_all(&history_dir).map_err(|e| e.to_string())?;
    }

    let file_name = format!("{}.json", session.id);
    let file_path = history_dir.join(file_name);

    let json = serde_json::to_string_pretty(&session).map_err(|e| e.to_string())?;
    fs::write(file_path, json).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn get_all_sessions(app_handle: AppHandle) -> Result<Vec<Session>, String> {
    let app_data_dir = app_handle.path().app_data_dir().map_err(|e| e.to_string())?;
    let history_dir = app_data_dir.join("history");

    if !history_dir.exists() {
        return Ok(vec![]);
    }

    let mut sessions = Vec::new();
    for entry in fs::read_dir(history_dir).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        
        if path.extension().and_then(|s| s.to_str()) == Some("json") {
            let content = fs::read_to_string(path).map_err(|e| e.to_string())?;
            if let Ok(session) = serde_json::from_str::<Session>(&content) {
                sessions.push(session);
            }
        }
    }

    // Sort by created_at descending (newest first)
    sessions.sort_by(|a, b| b.created_at.cmp(&a.created_at));

    Ok(sessions)
}

#[tauri::command]
pub async fn delete_session(app_handle: AppHandle, id: String) -> Result<(), String> {
    let app_data_dir = app_handle.path().app_data_dir().map_err(|e| e.to_string())?;
    let file_path = app_data_dir.join("history").join(format!("{}.json", id));

    if file_path.exists() {
        fs::remove_file(file_path).map_err(|e| e.to_string())?;
    }

    Ok(())
}
