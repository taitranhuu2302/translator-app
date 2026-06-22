use crate::services::permissions;
use crate::types::Result;

#[tauri::command]
pub async fn macos_request_quick_permissions() -> Result<serde_json::Value> {
    match permissions::ensure_quick_translate_permissions().await {
        Ok(()) => Result::ok(serde_json::json!({ "ok": true })),
        Err(msg) => Result::ok(serde_json::json!({
            "ok": false,
            "message": msg,
            "missing": "accessibility"
        })),
    }
}

#[tauri::command]
pub async fn macos_open_privacy_settings(kind: String) -> Result<()> {
    match permissions::open_mac_privacy_settings(&kind).await {
        Ok(()) => Result::ok(()),
        Err(e) => Result::err(crate::types::AppErrorCode::Unknown, e),
    }
}
