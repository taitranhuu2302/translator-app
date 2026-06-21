use tauri::Manager;
use crate::services::shortcuts;
use crate::stores::settings::SettingsState;
use crate::types::Result;
use tauri::AppHandle;

const SHORTCUT_KEYS: &[&str] = &[
    "quickTranslateShortcut",
    "quickTranslateReplaceShortcut",
    "toggleAppShortcut",
    "voiceTextShortcut",
];

#[tauri::command]
pub fn shortcut_validate(accelerator: String) -> Result<()> {
    match shortcuts::validate_format(&accelerator) {
        Ok(()) => Result::ok(()),
        Err(e) => Result::err(crate::types::AppErrorCode::ShortcutInvalid, e),
    }
}

#[tauri::command]
pub async fn shortcut_update(
    app: AppHandle,
    key: String,
    value: String,
) -> Result<crate::types::AppSettings> {
    // Validate accelerator format
    if let Err(e) = shortcuts::validate_format(&value) {
        return Result::err(crate::types::AppErrorCode::ShortcutInvalid, e);
    }

    // Validate key name
    if !SHORTCUT_KEYS.contains(&key.as_str()) {
        return Result::err(
            crate::types::AppErrorCode::ShortcutInvalid,
            format!("Unknown shortcut key: {}", key),
        );
    }

    let is_macos = cfg!(target_os = "macos");

    // Try to register the new shortcut
    let role = match key.as_str() {
        "toggleAppShortcut" => "toggleApp",
        "quickTranslateShortcut" => "quickTranslate",
        "quickTranslateReplaceShortcut" => "quickTranslateReplace",
        "voiceTextShortcut" => "voiceText",
        _ => unreachable!(),
    };

    // Unregister old shortcut, register new one
    let settings_state = app.state::<SettingsState>();
    {
        let mut store = settings_state.0.lock().unwrap();
        let old_accelerator = match key.as_str() {
            "toggleAppShortcut" => store.get().toggle_app_shortcut.clone(),
            "quickTranslateShortcut" => store.get().quick_translate_shortcut.clone(),
            "quickTranslateReplaceShortcut" => store.get().quick_translate_replace_shortcut.clone(),
            "voiceTextShortcut" => store.get().voice_text_shortcut.clone(),
            _ => return Result::err(crate::types::AppErrorCode::ShortcutInvalid, "unknown key"),
        };

        // Unregister old
        let _ = shortcuts::unregister_shortcut(&app, &old_accelerator, is_macos);

        // Register new
        if let Err(e) = shortcuts::register_shortcut(&app, role, &value, is_macos) {
            // Rollback: re-register old shortcut
            let _ = shortcuts::register_shortcut(&app, role, &old_accelerator, is_macos);
            return Result::err(crate::types::AppErrorCode::ShortcutRegisterFailed, e);
        }

        // Persist to settings
        let patch = serde_json::json!({ key.as_str(): value });
        match store.update(patch) {
            Ok(settings) => Result::ok(settings),
            Err(e) => Result::err(crate::types::AppErrorCode::Unknown, e),
        }
    }
}
