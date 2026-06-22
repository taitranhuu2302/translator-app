use tauri::AppHandle;
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut};

pub fn electron_to_code_modifiers(accelerator: &str) -> Result<(Option<Modifiers>, Code), String> {
    let parts: Vec<&str> = accelerator.split('+').collect();
    if parts.is_empty() {
        return Err("SHORTCUT_INVALID: Empty accelerator".into());
    }

    let mut mods = Modifiers::empty();
    let key_part = parts[parts.len() - 1];

    for i in 0..parts.len() - 1 {
        match parts[i].to_lowercase().as_str() {
            "commandorcontrol" | "cmdorctrl" => {
                #[cfg(target_os = "macos")]
                { mods |= Modifiers::SUPER; }
                #[cfg(not(target_os = "macos"))]
                { mods |= Modifiers::CONTROL; }
            }
            "command" | "cmd" | "super" | "meta" | "win" => mods |= Modifiers::SUPER,
            "control" | "ctrl" => mods |= Modifiers::CONTROL,
            "alt" | "option" => mods |= Modifiers::ALT,
            "shift" => mods |= Modifiers::SHIFT,
            other => return Err(format!("SHORTCUT_INVALID: Unknown modifier '{}'", other)),
        }
    }

    let code = parse_key_code(key_part)?;
    Ok((Some(mods), code))
}

fn parse_key_code(key: &str) -> Result<Code, String> {
    use Code::*;
    let upper = key.to_uppercase();
    let code = match upper.as_str() {
        "A" | "KEYA" => KeyA, "B" | "KEYB" => KeyB, "C" | "KEYC" => KeyC,
        "D" | "KEYD" => KeyD, "E" | "KEYE" => KeyE, "F" | "KEYF" => KeyF,
        "G" | "KEYG" => KeyG, "H" | "KEYH" => KeyH, "I" | "KEYI" => KeyI,
        "J" | "KEYJ" => KeyJ, "K" | "KEYK" => KeyK, "L" | "KEYL" => KeyL,
        "M" | "KEYM" => KeyM, "N" | "KEYN" => KeyN, "O" | "KEYO" => KeyO,
        "P" | "KEYP" => KeyP, "Q" | "KEYQ" => KeyQ, "R" | "KEYR" => KeyR,
        "S" | "KEYS" => KeyS, "T" | "KEYT" => KeyT, "U" | "KEYU" => KeyU,
        "V" | "KEYV" => KeyV, "W" | "KEYW" => KeyW, "X" | "KEYX" => KeyX,
        "Y" | "KEYY" => KeyY, "Z" | "KEYZ" => KeyZ,
        "0" | "DIGIT0" => Digit0, "1" | "DIGIT1" => Digit1,
        "2" | "DIGIT2" => Digit2, "3" | "DIGIT3" => Digit3,
        "4" | "DIGIT4" => Digit4, "5" | "DIGIT5" => Digit5,
        "6" | "DIGIT6" => Digit6, "7" | "DIGIT7" => Digit7,
        "8" | "DIGIT8" => Digit8, "9" | "DIGIT9" => Digit9,
        "F1" => F1, "F2" => F2, "F3" => F3, "F4" => F4,
        "F5" => F5, "F6" => F6, "F7" => F7, "F8" => F8,
        "F9" => F9, "F10" => F10, "F11" => F11, "F12" => F12,
        "F13" => F13, "F14" => F14, "F15" => F15, "F16" => F16,
        "F17" => F17, "F18" => F18, "F19" => F19, "F20" => F20,
        "F21" => F21, "F22" => F22, "F23" => F23, "F24" => F24,
        "SPACE" => Space,
        "TAB" => Tab,
        "ESCAPE" | "ESC" => Escape,
        "ENTER" | "RETURN" => Enter,
        "BACKSPACE" => Backspace,
        "DELETE" => Delete,
        "HOME" => Home,
        "END" => End,
        "PAGEUP" | "PRIOR" => PageUp,
        "PAGEDOWN" | "NEXT" => PageDown,
        "INSERT" => Insert,
        "ARROWUP" | "UP" => ArrowUp,
        "ARROWDOWN" | "DOWN" => ArrowDown,
        "ARROWLEFT" | "LEFT" => ArrowLeft,
        "ARROWRIGHT" | "RIGHT" => ArrowRight,
        "CAPSLOCK" => CapsLock,
        "NUMLOCK" | "NUM_LOCK" => NumLock,
        "SCROLLLOCK" | "SCROLL_LOCK" => ScrollLock,
        "PAUSE" | "BREAK" => Pause,
        "PRINTSCREEN" | "PRINT" => PrintScreen,
        "MINUS" | "-" => Minus,
        "EQUAL" | "=" | "PLUS" => Equal,
        "COMMA" | "," => Comma,
        "PERIOD" | "." => Period,
        "SLASH" | "/" => Slash,
        "SEMICOLON" | ";" => Semicolon,
        "QUOTE" | "'" => Quote,
        "BRACKETLEFT" | "[" => BracketLeft,
        "BRACKETRIGHT" | "]" => BracketRight,
        "BACKSLASH" | "\\" => Backslash,
        "BACKQUOTE" | "`" => Backquote,
        _ => return Err(format!("SHORTCUT_INVALID: Unknown key '{}'", key)),
    };
    Ok(code)
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
    parse_key_code(parts[parts.len() - 1]).map(|_| ())
}

pub fn register_shortcut(app: &AppHandle, accelerator: &str) -> Result<(), String> {
    let (mods, code) = electron_to_code_modifiers(accelerator)?;
    let shortcut = Shortcut::new(mods, code);
    app.global_shortcut()
        .register(shortcut)
        .map_err(|e| format!("SHORTCUT_REGISTER_FAILED: {}", e))?;
    Ok(())
}

pub fn unregister_shortcut(app: &AppHandle, accelerator: &str) -> Result<(), String> {
    let (mods, code) = electron_to_code_modifiers(accelerator)?;
    let shortcut = Shortcut::new(mods, code);
    app.global_shortcut()
        .unregister(shortcut)
        .map_err(|e| e.to_string())?;
    Ok(())
}
