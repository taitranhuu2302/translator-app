use tauri::State;
use crate::stores::settings::SettingsState;
use crate::types::{AppSettings, Result};

#[tauri::command]
pub fn settings_get(state: State<SettingsState>) -> AppSettings {
    let store = state.0.lock().unwrap();
    store.get()
}

#[tauri::command]
pub fn settings_update(
    state: State<SettingsState>,
    patch: serde_json::Value,
) -> Result<AppSettings> {
    let mut store = state.0.lock().unwrap();
    match store.update(patch) {
        Ok(settings) => Result::ok(settings),
        Err(e) => Result::err(crate::types::AppErrorCode::Unknown, e),
    }
}

#[tauri::command]
pub fn settings_reset_shortcuts(state: State<SettingsState>) -> Result<AppSettings> {
    let mut store = state.0.lock().unwrap();
    match store.reset_shortcuts() {
        Ok(settings) => Result::ok(settings),
        Err(e) => Result::err(crate::types::AppErrorCode::Unknown, e),
    }
}
