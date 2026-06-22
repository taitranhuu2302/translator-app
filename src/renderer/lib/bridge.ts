import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
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

function getPlatform(): "darwin" | "win32" {
  return navigator.platform.toLowerCase().includes("mac") ? "darwin" : "win32";
}

function noop(): UnlistenFn {
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
      invoke<Result<void>>("quick_translate_now"),
    retranslate: (
      request: TranslationRequest,
    ): Promise<Result<TranslationResult>> =>
      invoke<Result<TranslationResult>>("quick_retranslate", { request }),
    close: (): Promise<void> => invoke<void>("quick_close"),
    onLoading: (cb: () => void): UnlistenFn => noop(),
    onShow: (cb: (payload: QuickTranslatePayload) => void): UnlistenFn => {
      const unlisten = listen<QuickTranslatePayload>("quick:show", (event) => {
        cb(event.payload);
      });
      return () => { unlisten.then((f) => f()); };
    },
    onError: (cb: (message: string) => void): UnlistenFn => {
      const unlisten = listen<string>("quick:error", (event) => {
        cb(event.payload);
      });
      return () => { unlisten.then((f) => f()); };
    },
  },

  voice: {
    onSpeak: (
      cb: (payload: { text: string }) => void,
    ): UnlistenFn => {
      const unlisten = listen<{ text: string }>("voice:speak", (event) => {
        cb(event.payload);
      });
      return () => { unlisten.then((f) => f()); };
    },
    onError: (cb: (message: string) => void): UnlistenFn => {
      const unlisten = listen<string>("voice:error", (event) => {
        cb(event.payload);
      });
      return () => { unlisten.then((f) => f()); };
    },
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
    onNavigate: (cb: (route: string) => void): UnlistenFn => {
      const unlisten = listen<string>("app:navigate", (event) => {
        cb(event.payload);
      });
      return () => { unlisten.then((f) => f()); };
    },
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
      invoke("macos_request_quick_permissions"),
    openPrivacySettings: (pane: string): Promise<void> =>
      invoke<void>("macos_open_privacy_settings", { kind: pane }),
  },
};
