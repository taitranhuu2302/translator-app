use tauri::AppHandle;
use tauri_plugin_clipboard_manager::ClipboardExt;

pub struct ClipboardSnapshot {
    pub text: String,
}

pub fn snapshot(app: &AppHandle) -> ClipboardSnapshot {
    let text = app.clipboard().read_text().unwrap_or_default();
    ClipboardSnapshot { text }
}

pub fn restore(app: &AppHandle, snap: &ClipboardSnapshot) {
    let _ = app.clipboard().write_text(&snap.text);
}
