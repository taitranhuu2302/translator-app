use tauri::AppHandle;
use tauri_plugin_clipboard_manager::ClipboardExt;
use crate::types::Result;

#[tauri::command]
pub fn clipboard_write(app: AppHandle, text: String) -> Result<()> {
    match app.clipboard().write_text(text) {
        Ok(()) => Result::ok(()),
        Err(e) => Result::err(crate::types::AppErrorCode::Unknown, e.to_string()),
    }
}
