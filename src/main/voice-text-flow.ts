import { PUSH } from "../shared/ipc-channels";
import { err, ok, type Result } from "../shared/types";
import { getSettingsStore } from "./settings/settings-store";
import { getWindowManager } from "./windows/window-manager";
import { getSelectionCaptureService } from "./selection/selection-capture-service";
import { ensureQuickTranslatePermissions } from "./permissions/macos-permissions";

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function runVoiceTextPipeline(): Promise<Result<void>> {
  const wm = getWindowManager();
  const mainWin = wm.getMainWindow();
  if (!mainWin) return err("UNKNOWN", "Main window is not initialized");

  const settings = getSettingsStore();
  const s = settings.get();

  // Visual feedback near cursor on shortcut press.
  wm.showLoading(s.popupAlwaysOnTop);

  if (process.platform === "darwin") {
    const permission = await ensureQuickTranslatePermissions();
    if ("ok" in permission && permission.ok === false) {
      wm.hideLoading();
      mainWin.webContents.send(PUSH.VOICE_ERROR, permission.message);
      return err("SELECTION_CAPTURE_FAILED", permission.message);
    }
  }

  // If our app currently owns focus, hide so selection/copy targets the active app.
  if (mainWin.isVisible() && mainWin.isFocused()) {
    mainWin.hide();
  }
  await delay(220);

  const capture = getSelectionCaptureService();

  try {
    const text = await capture.captureSelectedText({
      delayMs: s.autoCopyDelayMs,
      restoreClipboard: s.restoreClipboard,
    });

    wm.hideLoading();
    mainWin.webContents.send(PUSH.VOICE_SPEAK, { text });
    return ok(undefined);
  } catch (error: unknown) {
    wm.hideLoading();
    const msg = error instanceof Error ? error.message : String(error);
    const clean = msg.replace("SELECTION_CAPTURE_FAILED: ", "");
    mainWin.webContents.send(PUSH.VOICE_ERROR, clean);
    return err("SELECTION_CAPTURE_FAILED", clean);
  }
}

