use tauri::AppHandle;
use tauri::Manager;
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};

pub fn electron_to_platform(accelerator: &str, is_macos: bool) -> Result<String, String> {
    let parts: Vec<&str> = accelerator.split('+').collect();
    if parts.is_empty() {
        return Err("SHORTCUT_INVALID: Empty accelerator".into());
    }

    let key = parts[parts.len() - 1];
    let key_name = electron_key_to_code_name(key)?;

    let mut result_parts: Vec<String> = Vec::new();
    for i in 0..parts.len() - 1 {
        match parts[i].to_lowercase().as_str() {
            "commandorcontrol" | "cmdorctrl" => {
                if is_macos { result_parts.push("Cmd".into()); }
                else { result_parts.push("Ctrl".into()); }
            }
            "command" | "cmd" | "super" | "meta" | "win" => result_parts.push("Super".into()),
            "control" | "ctrl" => result_parts.push("Ctrl".into()),
            "alt" | "option" => result_parts.push("Alt".into()),
            "shift" => result_parts.push("Shift".into()),
            other => return Err(format!("SHORTCUT_INVALID: Unknown modifier '{}'", other)),
        }
    }
    result_parts.push(key_name);

    Ok(result_parts.join("+"))
}

fn electron_key_to_code_name(key: &str) -> Result<String, String> {
    let upper = key.to_uppercase();

    if upper.len() == 1 {
        let c = upper.chars().next().unwrap();
        if c.is_ascii_alphabetic() {
            return Ok(format!("Key{}", upper));
        }
        if c.is_ascii_digit() {
            return Ok(format!("Digit{}", upper));
        }
    }

    if upper.starts_with('F') && upper.len() > 1 {
        let num: i32 = upper[1..].parse().unwrap_or(0);
        if (1..=24).contains(&num) {
            return Ok(upper);
        }
    }

    let name = match upper.as_str() {
        "SPACE" => "Space",
        "TAB" => "Tab",
        "ESCAPE" | "ESC" => "Escape",
        "ENTER" | "RETURN" => "Enter",
        "BACKSPACE" => "Backspace",
        "DELETE" => "Delete",
        "HOME" => "Home",
        "END" => "End",
        "PAGEUP" | "PRIOR" => "PageUp",
        "PAGEDOWN" | "NEXT" => "PageDown",
        "INSERT" => "Insert",
        "ARROWUP" | "UP" => "ArrowUp",
        "ARROWDOWN" | "DOWN" => "ArrowDown",
        "ARROWLEFT" | "LEFT" => "ArrowLeft",
        "ARROWRIGHT" | "RIGHT" => "ArrowRight",
        "CAPSLOCK" => "CapsLock",
        "NUMLOCK" | "NUM_LOCK" => "NumLock",
        "SCROLLLOCK" | "SCROLL_LOCK" => "ScrollLock",
        "PAUSE" | "BREAK" => "Pause",
        "PRINTSCREEN" | "PRINT" => "PrintScreen",
        "MINUS" | "-" => "Minus",
        "EQUAL" | "=" | "PLUS" => "Equal",
        "COMMA" | "," => "Comma",
        "PERIOD" | "." => "Period",
        "SLASH" | "/" => "Slash",
        "SEMICOLON" | ";" => "Semicolon",
        "QUOTE" | "'" | "\"" => "Quote",
        "BRACKETLEFT" | "[" => "BracketLeft",
        "BRACKETRIGHT" | "]" => "BracketRight",
        "BACKSLASH" | "\\" => "Backslash",
        "BACKQUOTE" | "`" | "~" => "Backquote",
        _ => return Err(format!("SHORTCUT_INVALID: Unknown key '{}'", key)),
    };
    Ok(name.into())
}

pub fn validate_format(accelerator: &str) -> Result<(), String> {
    if accelerator.trim().is_empty() {
        return Err("SHORTCUT_INVALID: Accelerator is empty".into());
    }

    let parts: Vec<&str> = accelerator.split('+').collect();
    if parts.len() < 2 {
        return Err("SHORTCUT_INVALID: Accelerator must have at least one modifier and a key (e.g. Ctrl+Q)".into());
    }

    for i in 0..parts.len() - 1 {
        let m = parts[i].to_lowercase();
        match m.as_str() {
            "commandorcontrol" | "cmdorctrl" | "command" | "cmd"
            | "control" | "ctrl" | "alt" | "option" | "shift"
            | "super" | "meta" | "win" => {}
            _ => return Err(format!("SHORTCUT_INVALID: Unknown modifier '{}'", parts[i])),
        }
    }

    electron_key_to_code_name(parts[parts.len() - 1]).map(|_| ())
}

pub fn register_default_shortcuts(app: &AppHandle, is_macos: bool) -> Result<(), String> {
    let settings_state = app.state::<crate::stores::settings::SettingsState>();
    let settings = settings_state.0.lock().unwrap().get();

    for (role, accelerator) in [
        ("toggleApp", &settings.toggle_app_shortcut),
        ("quickTranslate", &settings.quick_translate_shortcut),
        ("quickTranslateReplace", &settings.quick_translate_replace_shortcut),
        ("voiceText", &settings.voice_text_shortcut),
    ] {
        if !accelerator.is_empty() {
            register_shortcut(app, role, accelerator, is_macos)?;
        }
    }

    Ok(())
}

pub fn register_shortcut(app: &AppHandle, _role: &str, accelerator: &str, is_macos: bool) -> Result<(), String> {
    let platform_str = electron_to_platform(accelerator, is_macos)?;

    let role = _role.to_string();
    let handle = app.clone();

    app.global_shortcut()
        .on_shortcut(platform_str.as_str(), move |app_sh, _shortcut, event| {
            if event.state == ShortcutState::Pressed {
                match role.as_str() {
                    "toggleApp" => {
                        if let Some(window) = app_sh.get_webview_window("main") {
                            if window.is_visible().unwrap_or(false) {
                                let _ = window.hide();
                            } else {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                    }
                    "quickTranslate" => {
                        let h = app_sh.clone();
                        tauri::async_runtime::spawn(async move {
                            let _ = crate::commands::quick::quick_translate_now(h).await;
                        });
                    }
                    "quickTranslateReplace" => {
                        let h = app_sh.clone();
                        tauri::async_runtime::spawn(async move {
                            let _ = crate::commands::quick::quick_translate_replace(h).await;
                        });
                    }
                    "voiceText" => {
                        let h = app_sh.clone();
                        tauri::async_runtime::spawn(async move {
                            let _ = crate::commands::voice::voice_text_pipeline(h).await;
                        });
                    }
                    _ => {}
                }
            }
        })
        .map_err(|e| format!("SHORTCUT_REGISTER_FAILED: {}", e))?;

    Ok(())
}

pub fn unregister_shortcut(app: &AppHandle, accelerator: &str, is_macos: bool) -> Result<(), String> {
    let platform_str = electron_to_platform(accelerator, is_macos)?;
    app.global_shortcut()
        .unregister(platform_str.as_str())
        .map_err(|e| e.to_string())?;
    Ok(())
}

