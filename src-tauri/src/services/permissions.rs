pub async fn ensure_quick_translate_permissions() -> Result<(), String> {
    if std::env::consts::OS != "macos" {
        return Ok(());
    }

    // Check Accessibility permission by attempting a simple osascript
    let output = std::process::Command::new("osascript")
        .args([
            "-e",
            r#"tell application "System Events" to get name of every process"#,
        ])
        .output()
        .map_err(|e| format!("NETWORK_ERROR: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).to_lowercase();
        if stderr.contains("not allowed") || stderr.contains("-1743") {
            return Err(
                "Quick Translate needs Automation permission to control \"System Events\" on macOS. \
                 Please allow it in System Settings > Privacy & Security > Automation, then try again."
                    .into(),
            );
        }
        // other osascript error — likely no permission at all
        return Err(
            "Quick Translate needs Accessibility permission on macOS. \
             Please allow this app in System Settings > Privacy & Security > Accessibility, then try again."
                .into(),
        );
    }

    Ok(())
}

pub async fn open_mac_privacy_settings(kind: &str) -> Result<(), String> {
    if std::env::consts::OS != "macos" {
        return Ok(());
    }

    let deep_link = match kind {
        "accessibility" => "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility",
        "automation" => "x-apple.systempreferences:com.apple.preference.security?Privacy_Automation",
        _ => "x-apple.systempreferences:com.apple.preference.security",
    };

    // Use the `open` command to open the deep link
    std::process::Command::new("open")
        .arg(deep_link)
        .output()
        .map_err(|e| format!("Failed to open settings: {}", e))?;

    Ok(())
}
