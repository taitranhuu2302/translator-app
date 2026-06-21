use tauri::{AppHandle, Manager};
use crate::services::ai;
use crate::stores::settings::SettingsState;
use crate::types::{Result, TranslationRequest, TranslationResult};

#[tauri::command]
pub async fn translate_manual(
    app: AppHandle,
    request: TranslationRequest,
) -> Result<TranslationResult> {
    let settings = app.state::<SettingsState>().0.lock().unwrap().get();
    match ai::run_ai_translate(request, settings, true).await {
        Ok(data) => Result::ok(data),
        Err(e) => Result::err(crate::types::AppErrorCode::ApiError, e),
    }
}
