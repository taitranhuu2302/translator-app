import { clipboard, ipcMain } from "electron";
import { IPC } from "../../shared/ipc-channels";
import {
  ok,
  err,
  TranslationRequest,
  AppSettings,
  DEFAULT_SETTINGS,
  ImproveRequest,
} from "../../shared/types";
import { getSettingsStore } from "../settings/settings-store";
import { getTranslationProvider } from "../translation/google-translate-provider";
import { runQuickTranslatePipeline } from "../quick-translate-flow";
import { suppressMainOnActivateFor } from "../activate-guard";
import { getWindowManager } from "../windows/window-manager";
import {
  getShortcutManager,
  registerDefaultShortcuts,
} from "../shortcuts/shortcut-manager";
import { runImprove, listGroqModels, listGeminiModels } from "../ai/ai-service";
import {
  addHistory,
  listHistory,
  clearHistory,
  deleteHistoryItem,
} from "../history/history-store";
import {
  ensureQuickTranslatePermissions,
  openMacPrivacySettings,
} from "../permissions/macos-permissions";

function normalizeTranslationError(error: unknown): ReturnType<typeof err> {
  const msg = error instanceof Error ? error.message : String(error);
  if (msg.startsWith("TIMEOUT:"))
    return err("TIMEOUT", msg.replace("TIMEOUT: ", ""));
  if (msg.startsWith("NETWORK_ERROR:"))
    return err("NETWORK_ERROR", msg.replace("NETWORK_ERROR: ", ""));
  if (msg.startsWith("API_ERROR:"))
    return err("API_ERROR", msg.replace("API_ERROR: ", ""));
  return err("UNKNOWN", msg);
}

export function registerIpcHandlers(handlers: {
  toggleApp: () => void;
  quickTranslate: () => void;
  quickTranslateReplace: () => void;
}): void {
  const settings = getSettingsStore();
  const provider = getTranslationProvider();
  const wm = getWindowManager();
  const sm = getShortcutManager();

  // ── Settings ───────────────────────────────────────────────────────────────

  ipcMain.handle(IPC.SETTINGS_GET, () => {
    return settings.get();
  });

  ipcMain.handle(IPC.SETTINGS_UPDATE, (_e, patch: Partial<AppSettings>) => {
    try {
      const updated = settings.update(patch);
      if (patch.popupAlwaysOnTop !== undefined) {
        wm.setQuickAlwaysOnTop(patch.popupAlwaysOnTop);
      }
      return ok(updated);
    } catch (error) {
      return err("UNKNOWN", String(error));
    }
  });

  ipcMain.handle(IPC.SETTINGS_RESET_SHORTCUTS, () => {
    try {
      const s = settings.get();
      const resetPatch: Partial<AppSettings> = {
        quickTranslateShortcut: DEFAULT_SETTINGS.quickTranslateShortcut,
        quickTranslateReplaceShortcut:
          DEFAULT_SETTINGS.quickTranslateReplaceShortcut,
        toggleAppShortcut: DEFAULT_SETTINGS.toggleAppShortcut,
      };

      // Re-register with defaults
      const result1 = sm.updateShortcut(
        "quickTranslate",
        resetPatch.quickTranslateShortcut!,
        handlers.quickTranslate,
      );
      const result2 = sm.updateShortcut(
        "quickTranslateReplace",
        resetPatch.quickTranslateReplaceShortcut!,
        handlers.quickTranslateReplace,
      );
      const result3 = sm.updateShortcut(
        "toggleApp",
        resetPatch.toggleAppShortcut!,
        handlers.toggleApp,
      );

      if (!result1.success || !result2.success || !result3.success) {
        return err(
          "SHORTCUT_REGISTER_FAILED",
          result1.error ??
            result2.error ??
            result3.error ??
            "Could not register default shortcuts",
        );
      }

      const updated = settings.update(resetPatch);
      return ok(updated);
    } catch (error) {
      return err("UNKNOWN", String(error));
    }
  });

  // ── Translation ────────────────────────────────────────────────────────────

  ipcMain.handle(
    IPC.TRANSLATE_MANUAL,
    async (_e, request: TranslationRequest) => {
      if (!request.text || request.text.trim() === "") {
        return err("EMPTY_TEXT", "Please enter some text to translate");
      }
      try {
        const result = await provider.translate(request);
        await addHistory(
          {
            type: "translate",
            input: request.text,
            output: result.translation,
            langFrom: request.source,
            langTo: request.target,
          },
          settings.get().maxHistoryItems,
        );
        return ok(result);
      } catch (error) {
        return normalizeTranslationError(error);
      }
    },
  );

  // ── Improve ────────────────────────────────────────────────────────────────

  ipcMain.handle(IPC.IMPROVE, async (_e, request: ImproveRequest) => {
    if (!request.text || request.text.trim() === "") {
      return err("EMPTY_TEXT", "Please enter some text to improve");
    }
    try {
      const s = settings.get();
      const result = await runImprove(request, s);
      await addHistory(
        {
          type: "improve",
          input: request.text,
          output: result.corrected,
          output2: result.suggestion,
          langFrom: "auto",
          langTo: request.outputLang,
          provider: `${result.provider}/${result.model}`,
        },
        settings.get().maxHistoryItems,
      );
      return ok(result);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.startsWith("API_ERROR:"))
        return err("API_ERROR", msg.replace("API_ERROR: ", ""));
      if (msg.includes("429") || msg.toLowerCase().includes("rate limit"))
        return err(
          "API_ERROR",
          "Rate limit reached. Try again shortly or switch provider in Settings.",
        );
      return err("UNKNOWN", msg);
    }
  });

  // ── History ────────────────────────────────────────────────────────────────

  ipcMain.handle(
    IPC.HISTORY_LIST,
    async (_e, opts: { limit?: number; type?: "translate" | "improve" }) => {
      return await listHistory(opts);
    },
  );

  ipcMain.handle(IPC.HISTORY_CLEAR, async () => {
    await clearHistory();
  });

  ipcMain.handle(IPC.HISTORY_DELETE, async (_e, id: number) => {
    await deleteHistoryItem(id);
  });

  // ── Model listing ──────────────────────────────────────────────────────────

  ipcMain.handle(IPC.MODELS_LIST_GROQ, (_e, apiKey: string) => {
    return listGroqModels(apiKey);
  });

  ipcMain.handle(IPC.MODELS_LIST_GEMINI, (_e, apiKey: string) => {
    return listGeminiModels(apiKey);
  });

  // ── Quick translate ────────────────────────────────────────────────────────

  ipcMain.handle(IPC.QUICK_TRANSLATE_NOW, () => runQuickTranslatePipeline());

  ipcMain.handle(
    IPC.QUICK_RETRANSLATE,
    async (_e, request: TranslationRequest) => {
      if (!request.text || request.text.trim() === "") {
        return err("EMPTY_TEXT", "Text is empty");
      }
      try {
        const result = await provider.translate(request);
        return ok(result);
      } catch (error) {
        return normalizeTranslationError(error);
      }
    },
  );

  ipcMain.handle(IPC.QUICK_CLOSE, () => {
    suppressMainOnActivateFor(1500);
    wm.hideLoading();
    wm.hideQuick({ suppressMainFocus: true });
  });

  // ── Shortcuts ──────────────────────────────────────────────────────────────

  ipcMain.handle(IPC.SHORTCUT_VALIDATE, (_e, accelerator: string) => {
    const valid = sm.validateFormat(accelerator);
    if (valid) return ok(undefined);
    return err(
      "SHORTCUT_INVALID",
      `"${accelerator}" is not a valid Electron accelerator`,
    );
  });

  ipcMain.handle(
    IPC.SHORTCUT_UPDATE,
    (
      _e,
      {
        key,
        value,
      }: {
        key:
          | "quickTranslateShortcut"
          | "quickTranslateReplaceShortcut"
          | "toggleAppShortcut";
        value: string;
      },
    ) => {
      const role = key === "quickTranslateShortcut"
        ? "quickTranslate"
        : key === "quickTranslateReplaceShortcut"
          ? "quickTranslateReplace"
          : "toggleApp";
      const handler = role === "quickTranslate"
        ? handlers.quickTranslate
        : role === "quickTranslateReplace"
          ? handlers.quickTranslateReplace
          : handlers.toggleApp;

      const result = sm.updateShortcut(role, value, handler);
      if (!result.success) {
        const code = result.error?.includes("in use")
          ? "SHORTCUT_CONFLICT"
          : "SHORTCUT_REGISTER_FAILED";
        return err(code, result.error ?? "Unknown error");
      }

      const updated = settings.update({ [key]: value });
      return ok(updated);
    },
  );

  // ── App navigation ─────────────────────────────────────────────────────────

  ipcMain.handle(IPC.APP_OPEN_SETTINGS, () => {
    wm.showMain();
    wm.getMainWindow()?.webContents.send("app:navigate", "/settings");
  });

  ipcMain.handle(IPC.APP_OPEN_FULL, () => {
    wm.showMain();
    wm.hideQuick({ suppressMainFocus: false });
  });

  ipcMain.handle(IPC.APP_TOGGLE, () => {
    wm.toggleMain();
  });

  // ── Clipboard ─────────────────────────────────────────────────────────────

  ipcMain.handle(IPC.CLIPBOARD_WRITE, (_e, text: string) => {
    clipboard.writeText(text);
  });

  // ── macOS permissions ─────────────────────────────────────────────────────

  ipcMain.handle(IPC.MACOS_REQUEST_QUICK_PERMISSIONS, async () => {
    return await ensureQuickTranslatePermissions();
  });

  ipcMain.handle(
    IPC.MACOS_OPEN_PRIVACY_SETTINGS,
    async (_e, pane: "accessibility" | "automation") => {
      await openMacPrivacySettings(pane);
    },
  );
}
