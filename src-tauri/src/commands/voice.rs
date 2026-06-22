use tauri::{AppHandle, Emitter, Manager};
use crate::services::{permissions, selection::capture};
use crate::stores::settings::SettingsState;
use crate::types::Result;

#[tauri::command]
pub async fn voice_text_pipeline(app: AppHandle) -> Result<()> {
    let settings = app.state::<SettingsState>().0.lock().unwrap().get();

    if let Err(e) = permissions::ensure_quick_translate_permissions().await {
        let _ = app.emit("voice:error", &e);
        return Result::err(crate::types::AppErrorCode::SelectionCaptureFailed, e);
    }

    if let Some(w) = app.get_webview_window("main") {
        if w.is_visible().unwrap_or(false) && w.is_focused().unwrap_or(false) {
            let _ = w.hide();
        }
    }

    tokio::time::sleep(std::time::Duration::from_millis(220)).await;

    let text = match capture::capture_selected_text(
        &app,
        settings.auto_copy_delay_ms as u64,
        settings.restore_clipboard,
    )
    .await
    {
        Ok(t) => t,
        Err(e) => {
            let _ = app.emit("voice:error", &e);
            return Result::err(crate::types::AppErrorCode::SelectionCaptureFailed, e);
        }
    };

    let _ = app.emit("voice:speak", serde_json::json!({ "text": text }));
    Result::ok(())
}
