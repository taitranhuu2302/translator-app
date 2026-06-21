import { invoke } from "@tauri-apps/api/core";
import type {
  AppSettings,
  HistoryItem,
  HistoryItemType,
  TranslationRequest,
  TranslationResult,
  ImproveRequest,
  ImproveResult,
  AiModelOption,
  QuickTranslatePayload,
  Result,
} from "../../shared/types";

type UnsubscribeFn = () => void;

function getPlatform(): "darwin" | "win32" {
  return navigator.platform.toLowerCase().includes("mac") ? "darwin" : "win32";
}

function noop(): UnsubscribeFn {
  return () => {};
}

export const bridge = {
  runtime: {
    platform: getPlatform(),
  },

  settings: {
    get: (): Promise<AppSettings> => invoke<AppSettings>("settings_get"),
    update: (patch: Partial<AppSettings>): Promise<Result<AppSettings>> =>
      invoke<Result<AppSettings>>("settings_update", { patch }),
    resetShortcuts: (): Promise<Result<AppSettings>> =>
      invoke<Result<AppSettings>>("settings_reset_shortcuts"),
  },

  translate: {
    manual: (request: TranslationRequest): Promise<Result<TranslationResult>> =>
      invoke<Result<TranslationResult>>("translate_manual", { request }),
  },

  improve: {
    run: (request: ImproveRequest): Promise<Result<ImproveResult>> =>
      invoke<Result<ImproveResult>>("improve_run", { request }),
  },

  history: {
    list: (
      opts?: { limit?: number; type?: HistoryItemType },
    ): Promise<HistoryItem[]> =>
      invoke<HistoryItem[]>("history_list", { opts }),
    delete: (id: number): Promise<void> =>
      invoke<void>("history_delete", { id }),
    clear: (): Promise<void> => invoke<void>("history_clear"),
  },

  models: {
    listGroq: (apiKey: string): Promise<AiModelOption[]> =>
      invoke<AiModelOption[]>("models_list_groq", { apiKey }),
    listGemini: (apiKey: string): Promise<AiModelOption[]> =>
      invoke<AiModelOption[]>("models_list_gemini", { apiKey }),
  },

  quick: {
    translateNow: (): Promise<Result<void>> =>
      Promise.reject(new Error("not implemented")),
    retranslate: (
      _request: TranslationRequest,
    ): Promise<Result<TranslationResult>> =>
      Promise.reject(new Error("not implemented")),
    close: (): Promise<void> => invoke<void>("quick_close"),
    onLoading: (_cb: () => void): UnsubscribeFn => noop(),
    onShow: (
      _cb: (payload: QuickTranslatePayload) => void,
    ): UnsubscribeFn => noop(),
    onError: (_cb: (message: string) => void): UnsubscribeFn => noop(),
  },

  voice: {
    onSpeak: (
      _cb: (payload: { text: string }) => void,
    ): UnsubscribeFn => noop(),
    onError: (_cb: (message: string) => void): UnsubscribeFn => noop(),
  },

  shortcuts: {
    validate: (accelerator: string): Promise<Result<void>> =>
      invoke<Result<void>>("shortcut_validate", { accelerator }),
    update: (
      key: string,
      value: string,
    ): Promise<Result<AppSettings>> =>
      invoke<Result<AppSettings>>("shortcut_update", { key, value }),
  },

  app: {
    openSettings: (): Promise<void> =>
      invoke<void>("app_open_settings"),
    openFull: (): Promise<void> =>
      invoke<void>("app_open_full"),
    toggle: (): Promise<void> =>
      invoke<void>("app_toggle"),
    onNavigate: (_cb: (route: string) => void): UnsubscribeFn => noop(),
  },

  clipboard: {
    writeText: (text: string): Promise<void> =>
      invoke<void>("clipboard_write", { text }),
  },

  macos: {
    requestQuickPermissions: (): Promise<
      | { ok: true }
      | { ok: false; message: string; missing: "accessibility" | "automation" }
    > =>
      Promise.resolve({
        ok: false as const,
        message: "not implemented",
        missing: "accessibility" as const,
      }),
    openPrivacySettings: (_pane: string): Promise<void> =>
      Promise.resolve(),
  },
};
