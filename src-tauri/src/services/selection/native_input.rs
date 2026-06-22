use std::process::Command;

pub async fn simulate_copy_shortcut() -> Result<(), String> {
    let platform = std::env::consts::OS;
    match platform {
        "macos" => {
            let output = Command::new("osascript")
                .args([
                    "-e",
                    r#"tell application "System Events" to keystroke "c" using {command down}"#,
                ])
                .output()
                .map_err(|e| format!("NETWORK_ERROR: {}", e))?;
            if !output.status.success() {
                let stderr = String::from_utf8_lossy(&output.stderr);
                if stderr.to_lowercase().contains("not allowed to send keystrokes")
                    || stderr.contains("1002")
                {
                    return Err(
                        "SELECTION_CAPTURE_FAILED: macOS blocked automated keyboard input (Accessibility). \
                         Open System Settings → Privacy & Security → Accessibility, enable this app."
                            .into(),
                    );
                }
                return Err(format!("SELECTION_CAPTURE_FAILED: osascript failed — {}", stderr));
            }
            Ok(())
        }
        "windows" => {
            let output = Command::new("powershell")
                .args([
                    "-NoProfile",
                    "-NonInteractive",
                    "-Command",
                    r#"$wshell = New-Object -ComObject wscript.shell; $wshell.SendKeys("^c")"#,
                ])
                .output()
                .map_err(|e| format!("NETWORK_ERROR: {}", e))?;
            if !output.status.success() {
                let stderr = String::from_utf8_lossy(&output.stderr);
                return Err(format!("SELECTION_CAPTURE_FAILED: PowerShell failed — {}", stderr));
            }
            Ok(())
        }
        "linux" => {
            Command::new("xdotool")
                .args(["key", "ctrl+c"])
                .output()
                .map_err(|e| format!("NETWORK_ERROR: {}", e))?;
            Ok(())
        }
        _ => Err(format!("SELECTION_CAPTURE_FAILED: Unsupported platform '{}'", platform)),
    }
}

pub async fn simulate_paste_shortcut() -> Result<(), String> {
    let platform = std::env::consts::OS;
    match platform {
        "macos" => {
            let output = Command::new("osascript")
                .args([
                    "-e",
                    r#"tell application "System Events" to keystroke "v" using {command down}"#,
                ])
                .output()
                .map_err(|e| format!("NETWORK_ERROR: {}", e))?;
            if !output.status.success() {
                let stderr = String::from_utf8_lossy(&output.stderr);
                if stderr.to_lowercase().contains("not allowed to send keystrokes")
                    || stderr.contains("1002")
                {
                    return Err(
                        "SELECTION_CAPTURE_FAILED: macOS blocked automated keyboard input (Accessibility). \
                         Open System Settings → Privacy & Security → Accessibility, enable this app."
                            .into(),
                    );
                }
                return Err(format!("SELECTION_CAPTURE_FAILED: osascript failed — {}", stderr));
            }
            Ok(())
        }
        "windows" => {
            let output = Command::new("powershell")
                .args([
                    "-NoProfile",
                    "-NonInteractive",
                    "-Command",
                    r#"$wshell = New-Object -ComObject wscript.shell; $wshell.SendKeys("^v")"#,
                ])
                .output()
                .map_err(|e| format!("NETWORK_ERROR: {}", e))?;
            if !output.status.success() {
                let stderr = String::from_utf8_lossy(&output.stderr);
                return Err(format!("SELECTION_CAPTURE_FAILED: PowerShell failed — {}", stderr));
            }
            Ok(())
        }
        "linux" => {
            Command::new("xdotool")
                .args(["key", "ctrl+v"])
                .output()
                .map_err(|e| format!("NETWORK_ERROR: {}", e))?;
            Ok(())
        }
        _ => Err(format!("SELECTION_CAPTURE_FAILED: Unsupported platform '{}'", platform)),
    }
}
