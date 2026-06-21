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
    manual: (
      _request: TranslationRequest,
    ): Promise<Result<TranslationResult>> =>
      Promise.reject(new Error("not implemented in Tauri yet")),
  },

  improve: {
    run: (_request: ImproveRequest): Promise<Result<ImproveResult>> =>
      Promise.reject(new Error("not implemented in Tauri yet")),
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
    listGroq: (_apiKey: string): Promise<AiModelOption[]> =>
      Promise.resolve([]),
    listGemini: (_apiKey: string): Promise<AiModelOption[]> =>
      Promise.resolve([]),
  },

  quick: {
    translateNow: (): Promise<Result<void>> =>
      Promise.reject(new Error("not implemented")),
    retranslate: (
      _request: TranslationRequest,
    ): Promise<Result<TranslationResult>> =>
      Promise.reject(new Error("not implemented")),
    close: (): Promise<void> => Promise.resolve(),
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
    validate: (_accelerator: string): Promise<Result<void>> =>
      Promise.reject(new Error("not implemented")),
    update: (
      _key: string,
      _value: string,
    ): Promise<Result<AppSettings>> =>
      Promise.reject(new Error("not implemented")),
  },

  app: {
    openSettings: (): Promise<void> => Promise.resolve(),
    openFull: (): Promise<void> => Promise.resolve(),
    toggle: (): Promise<void> => Promise.resolve(),
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
