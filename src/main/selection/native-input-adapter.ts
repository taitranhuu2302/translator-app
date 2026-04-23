import { execSync, spawnSync } from "node:child_process";

export interface NativeInputAdapter {
  simulateCopyShortcut(): Promise<void>;
  simulatePasteShortcut(): Promise<void>;
}

/**
 * Uses OS shell commands to simulate the copy shortcut.
 * - macOS: AppleScript via osascript (requires Accessibility permissions)
 * - Windows: PowerShell WScript.Shell SendKeys
 * - Linux: xdotool (if installed)
 */
function execSyncErrorText(err: unknown): string {
  if (!(err instanceof Error)) return String(err);
  const any = err as Error & { stderr?: Buffer | string };
  const stderr = any.stderr != null ? String(any.stderr) : "";
  return `${err.message}\n${stderr}`;
}

export class ShellNativeInputAdapter implements NativeInputAdapter {
  async simulateCopyShortcut(): Promise<void> {
    const platform = process.platform;

    if (platform === "darwin") {
      try {
        execSync(
          `osascript -e 'tell application "System Events" to keystroke "c" using {command down}'`,
          { timeout: 2000 },
        );
      } catch (err: unknown) {
        const text = execSyncErrorText(err);
        if (/not allowed to send keystrokes|\(1002\)/i.test(text)) {
          throw new Error(
            "SELECTION_CAPTURE_FAILED: macOS blocked automated keyboard input (Accessibility). " +
              "Open System Settings → Privacy & Security → Accessibility, enable this app. " +
              "If you run via `npm start`, also enable Terminal or your IDE.",
          );
        }
        throw err;
      }
    } else if (platform === "win32") {
      // Spawn powershell.exe directly — avoids the cmd.exe wrapper that execSync
      // adds on Windows, cutting startup overhead and preventing ETIMEDOUT.
      const result = spawnSync(
        "powershell",
        [
          "-NoProfile",
          "-NonInteractive",
          "-Command",
          '$wshell = New-Object -ComObject wscript.shell; $wshell.SendKeys("^c")',
        ],
        { timeout: 5000 },
      );
      if (result.error) throw result.error;
      if (result.status !== 0) {
        const stderr = result.stderr?.toString().trim() || "";
        throw new Error(stderr || "PowerShell SendKeys failed");
      }
    } else {
      // Linux fallback via xdotool
      execSync("xdotool key ctrl+c", { timeout: 2000 });
    }
  }

  async simulatePasteShortcut(): Promise<void> {
    const platform = process.platform;

    if (platform === "darwin") {
      try {
        execSync(
          `osascript -e 'tell application "System Events" to keystroke "v" using {command down}'`,
          { timeout: 2000 },
        );
      } catch (err: unknown) {
        const text = execSyncErrorText(err);
        if (/not allowed to send keystrokes|\(1002\)/i.test(text)) {
          throw new Error(
            "SELECTION_CAPTURE_FAILED: macOS blocked automated keyboard input (Accessibility). " +
              "Open System Settings → Privacy & Security → Accessibility, enable this app. " +
              "If you run via `npm start`, also enable Terminal or your IDE.",
          );
        }
        throw err;
      }
    } else if (platform === "win32") {
      const result = spawnSync(
        "powershell",
        [
          "-NoProfile",
          "-NonInteractive",
          "-Command",
          '$wshell = New-Object -ComObject wscript.shell; $wshell.SendKeys("^v")',
        ],
        { timeout: 5000 },
      );
      if (result.error) throw result.error;
      if (result.status !== 0) {
        const stderr = result.stderr?.toString().trim() || "";
        throw new Error(stderr || "PowerShell SendKeys failed");
      }
    } else {
      execSync("xdotool key ctrl+v", { timeout: 2000 });
    }
  }
}

/**
 * Fallback adapter that informs the user to manually copy the text.
 * Used when native automation is not configured.
 */
export class ManualFallbackNativeInputAdapter implements NativeInputAdapter {
  async simulateCopyShortcut(): Promise<void> {
    throw new Error(
      "SELECTION_CAPTURE_FAILED: Automatic text capture is not available. " +
        "Please copy the text manually (Ctrl+C / Cmd+C) before pressing the quick translate shortcut.",
    );
  }

  async simulatePasteShortcut(): Promise<void> {
    throw new Error(
      "SELECTION_CAPTURE_FAILED: Automatic text replace is not available. " +
        "Please paste manually (Ctrl+V / Cmd+V).",
    );
  }
}
