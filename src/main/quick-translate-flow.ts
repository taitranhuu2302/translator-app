import { clipboard } from "electron";
import { PUSH } from "../shared/ipc-channels";
import { ok, err, isErr, type Result } from "../shared/types";
import { getSettingsStore } from "./settings/settings-store";
import { getWindowManager } from "./windows/window-manager";
import { getSelectionCaptureService } from "./selection/selection-capture-service";
import { getClipboardSnapshotService } from "./selection/clipboard-snapshot-service";
import { ShellNativeInputAdapter } from "./selection/native-input-adapter";
import { getTranslationProvider } from "./translation/google-translate-provider";
import { ensureQuickTranslatePermissions } from "./permissions/macos-permissions";

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeTranslateError(error: unknown): Result<never> {
  const msg = error instanceof Error ? error.message : String(error);
  if (msg.startsWith("TIMEOUT:"))
    return err("TIMEOUT", msg.replace("TIMEOUT: ", ""));
  if (msg.startsWith("NETWORK_ERROR:"))
    return err("NETWORK_ERROR", msg.replace("NETWORK_ERROR: ", ""));
  if (msg.startsWith("API_ERROR:"))
    return err("API_ERROR", msg.replace("API_ERROR: ", ""));
  return err("UNKNOWN", msg);
}

/**
 * 1) Hide quick + main windows if visible so focus returns to the app where text is selected.
 * 2) Wait briefly for macOS / Windows to restore the previous app as key window.
 * 3) Simulate Cmd+C / Ctrl+C and read clipboard — **before** showing the floating panel (always-on-top
 *    would otherwise steal focus and break selection).
 * 4) Show the panel only for loading (translate API) or error/result.
 */
export async function runQuickTranslatePipeline(): Promise<Result<void>> {
  const wm = getWindowManager();
  const quickWin = wm.getQuickWindow();
  if (!quickWin) {
    return err("POPUP_NOT_READY", "Quick window is not initialized");
  }

  const settings = getSettingsStore();
  const s = settings.get();

  if (quickWin.isVisible()) {
    wm.hideQuick({ suppressMainFocus: true });
  }
  // Show immediate visual feedback near cursor on shortcut press.
  wm.showLoading(s.popupAlwaysOnTop);

  if (process.platform === "darwin") {
    const permission = await ensureQuickTranslatePermissions();
    if ("ok" in permission && permission.ok === false) {
      wm.hideLoading();
      quickWin.webContents.send(PUSH.QUICK_ERROR, permission.message);
      wm.showQuick(s.popupAlwaysOnTop);
      return err("SELECTION_CAPTURE_FAILED", permission.message);
    }
  }

  const mainWin = wm.getMainWindow();
  if (mainWin?.isVisible() && mainWin.isFocused()) {
    mainWin.hide();
  }
  await delay(220);

  const capture = getSelectionCaptureService();
  const provider = getTranslationProvider();

  let text: string;
  try {
    text = await capture.captureSelectedText({
      delayMs: s.autoCopyDelayMs,
      restoreClipboard: s.restoreClipboard,
    });
  } catch (error: unknown) {
    wm.hideLoading();
    const msg = error instanceof Error ? error.message : String(error);
    const clean = msg.replace("SELECTION_CAPTURE_FAILED: ", "");
    quickWin.webContents.send(PUSH.QUICK_ERROR, clean);
    wm.showQuick(s.popupAlwaysOnTop);
    return err("SELECTION_CAPTURE_FAILED", clean);
  }

  try {
    const result = await provider.translate({
      source: "auto",
      target: s.quickTargetLanguage,
      text,
    });
    wm.hideLoading();
    quickWin.webContents.send(PUSH.QUICK_SHOW, {
      original: text,
      translated: result.translation,
      source: result.source,
      target: result.target,
    });
    wm.showQuick(s.popupAlwaysOnTop);
    return ok(undefined);
  } catch (error: unknown) {
    wm.hideLoading();
    const r = normalizeTranslateError(error);
    if (isErr(r)) {
      quickWin.webContents.send(PUSH.QUICK_ERROR, r.error.message);
      wm.showQuick(s.popupAlwaysOnTop);
    }
    return r;
  }
}

export async function runQuickTranslateReplacePipeline(): Promise<
  Result<void>
> {
  const wm = getWindowManager();
  const quickWin = wm.getQuickWindow();
  if (!quickWin) {
    return err("POPUP_NOT_READY", "Quick window is not initialized");
  }

  const settings = getSettingsStore();
  const s = settings.get();
  // Show immediate visual feedback near cursor on shortcut press.
  wm.showLoading(s.popupAlwaysOnTop);

  const capture = getSelectionCaptureService();
  const provider = getTranslationProvider();
  const clipboardService = getClipboardSnapshotService();
  const nativeInput = new ShellNativeInputAdapter();

  if (process.platform === "darwin") {
    const permission = await ensureQuickTranslatePermissions();
    if ("ok" in permission && permission.ok === false) {
      wm.hideLoading();
      return err("SELECTION_CAPTURE_FAILED", permission.message);
    }
  }

  const mainWin = wm.getMainWindow();
  if (mainWin?.isVisible() && mainWin.isFocused()) {
    mainWin.hide();
  }
  await delay(220);

  let selectedText: string;
  try {
    selectedText = await capture.captureSelectedText({
      delayMs: s.autoCopyDelayMs,
      restoreClipboard: false,
    });
  } catch (error: unknown) {
    wm.hideLoading();
    const msg = error instanceof Error ? error.message : String(error);
    const clean = msg.replace("SELECTION_CAPTURE_FAILED: ", "");
    return err("SELECTION_CAPTURE_FAILED", clean);
  }

  let translatedText: string;
  try {
    const result = await provider.translate({
      source: "auto",
      target: s.quickReplaceTargetLanguage,
      text: selectedText,
    });
    translatedText = result.translation;
  } catch (error: unknown) {
    wm.hideLoading();
    const r = normalizeTranslateError(error);
    if (isErr(r)) {
      quickWin.webContents.send(PUSH.QUICK_ERROR, r.error.message);
      wm.showQuick(s.popupAlwaysOnTop);
    }
    return r;
  }

  const snapshot = clipboardService.snapshot();
  try {
    clipboard.writeText(translatedText);
    // Give OS clipboard a moment before sending paste keystroke.
    await delay(80);
    await nativeInput.simulatePasteShortcut();
    // Keep translated clipboard available briefly so target app can consume it.
    await delay(120);
  } catch (error: unknown) {
    wm.hideLoading();
    const msg = error instanceof Error ? error.message : String(error);
    quickWin.webContents.send(
      PUSH.QUICK_ERROR,
      `Could not replace selected text. ${msg}`,
    );
    wm.showQuick(s.popupAlwaysOnTop);
    return err(
      "SELECTION_CAPTURE_FAILED",
      `Could not replace selected text. ${msg}`,
    );
  } finally {
    if (s.restoreClipboard) {
      try {
        clipboardService.restore(snapshot);
      } catch (restoreError: unknown) {
        console.warn("[QuickReplace] Clipboard restore failed:", restoreError);
      }
    }
  }

  wm.hideLoading();
  wm.hideQuick({ suppressMainFocus: true });
  return ok(undefined);
}
