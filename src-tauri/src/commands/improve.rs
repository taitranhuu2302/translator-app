use tauri::{AppHandle, Manager};
use crate::services::ai;
use crate::stores::settings::SettingsState;
use crate::types::{ImproveRequest, ImproveResult, Result};

#[tauri::command]
pub async fn improve_run(
    app: AppHandle,
    request: ImproveRequest,
) -> Result<ImproveResult> {
    let settings = app.state::<SettingsState>().0.lock().unwrap().get();
    match ai::run_improve(request, settings).await {
        Ok(data) => Result::ok(data),
        Err(e) => Result::err(crate::types::AppErrorCode::ApiError, e),
    }
}
