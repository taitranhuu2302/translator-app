use tauri::AppHandle;
use tauri_plugin_clipboard_manager::ClipboardExt;
use crate::services::selection::{clipboard, native_input};

pub async fn capture_selected_text(
    app: &AppHandle,
    delay_ms: u64,
    restore_clipboard: bool,
) -> Result<String, String> {
    let snap = clipboard::snapshot(app);

    let sentinel = format!(
        "__neris_sentinel_{}__",
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_nanos()
    );
    app.clipboard()
        .write_text(&sentinel)
        .map_err(|e| format!("CLIPBOARD_RESTORE_FAILED: {}", e))?;

    native_input::simulate_copy_shortcut().await?;

    let max_wait_ms = delay_ms.max(800);
    let poll_ms = 30u64;
    let start = std::time::Instant::now();
    let mut captured = String::new();

    loop {
        if start.elapsed().as_millis() >= max_wait_ms as u128 {
            break;
        }
        tokio::time::sleep(std::time::Duration::from_millis(poll_ms)).await;
        if let Ok(text) = app.clipboard().read_text() {
            if text != sentinel {
                captured = text;
                break;
            }
        }
    }

    if restore_clipboard {
        clipboard::restore(app, &snap);
    }

    if captured.trim().is_empty() {
        return Err(
            "SELECTION_CAPTURE_FAILED: Could not get the selected text. \
             Please select text first, then press the shortcut."
                .into(),
        );
    }

    Ok(captured)
}
