import { contextBridge, ipcRenderer } from "electron";
import { IPC, PUSH } from "./shared/ipc-channels";
import type {
  AppSettings,
  TranslationRequest,
  QuickTranslatePayload,
  ImproveRequest,
  ImproveResult,
  HistoryItem,
  HistoryItemType,
  AiModelOption,
  Result,
  TranslationResult,
} from "./shared/types";

type UnsubscribeFn = () => void;

const api = {
  /** Node/Electron process info (renderer has no global `process`) */
  runtime: {
    platform: process.platform,
  },

  // ── Settings ──────────────────────────────────────────────────────────────
  settings: {
    get: (): Promise<AppSettings> => ipcRenderer.invoke(IPC.SETTINGS_GET),
    update: (patch: Partial<AppSettings>): Promise<Result<AppSettings>> =>
      ipcRenderer.invoke(IPC.SETTINGS_UPDATE, patch),
    resetShortcuts: (): Promise<Result<AppSettings>> =>
      ipcRenderer.invoke(IPC.SETTINGS_RESET_SHORTCUTS),
  },

  // ── Translation ───────────────────────────────────────────────────────────
  translate: {
    manual: (request: TranslationRequest): Promise<Result<TranslationResult>> =>
      ipcRenderer.invoke(IPC.TRANSLATE_MANUAL, request),
  },

  // ── Improve ───────────────────────────────────────────────────────────────
  improve: {
    run: (request: ImproveRequest): Promise<Result<ImproveResult>> =>
      ipcRenderer.invoke(IPC.IMPROVE, request),
  },

  // ── History ───────────────────────────────────────────────────────────────
  history: {
    list: (
      opts: { limit?: number; type?: HistoryItemType } = {},
    ): Promise<HistoryItem[]> => ipcRenderer.invoke(IPC.HISTORY_LIST, opts),
    delete: (id: number): Promise<void> =>
      ipcRenderer.invoke(IPC.HISTORY_DELETE, id),
    clear: (): Promise<void> => ipcRenderer.invoke(IPC.HISTORY_CLEAR),
  },

  // ── Models ────────────────────────────────────────────────────────────────
  models: {
    listGroq: (apiKey: string): Promise<AiModelOption[]> =>
      ipcRenderer.invoke(IPC.MODELS_LIST_GROQ, apiKey),
    listGemini: (apiKey: string): Promise<AiModelOption[]> =>
      ipcRenderer.invoke(IPC.MODELS_LIST_GEMINI, apiKey),
  },

  // ── Quick translate ───────────────────────────────────────────────────────
  quick: {
    translateNow: (): Promise<Result<void>> =>
      ipcRenderer.invoke(IPC.QUICK_TRANSLATE_NOW),
    retranslate: (
      request: TranslationRequest,
    ): Promise<Result<TranslationResult>> =>
      ipcRenderer.invoke(IPC.QUICK_RETRANSLATE, request),
    close: (): Promise<void> => ipcRenderer.invoke(IPC.QUICK_CLOSE),
    onLoading: (cb: () => void): UnsubscribeFn => {
      const listener = () => cb();
      ipcRenderer.on(PUSH.QUICK_LOADING, listener);
      return () => ipcRenderer.removeListener(PUSH.QUICK_LOADING, listener);
    },
    onShow: (cb: (payload: QuickTranslatePayload) => void): UnsubscribeFn => {
      const listener = (
        _: Electron.IpcRendererEvent,
        p: QuickTranslatePayload,
      ) => cb(p);
      ipcRenderer.on(PUSH.QUICK_SHOW, listener);
      return () => ipcRenderer.removeListener(PUSH.QUICK_SHOW, listener);
    },
    onError: (cb: (message: string) => void): UnsubscribeFn => {
      const listener = (_: Electron.IpcRendererEvent, msg: string) => cb(msg);
      ipcRenderer.on(PUSH.QUICK_ERROR, listener);
      return () => ipcRenderer.removeListener(PUSH.QUICK_ERROR, listener);
    },
  },

  // ── Voice (TTS shortcuts) ────────────────────────────────────────────────
  voice: {
    onSpeak: (cb: (payload: { text: string }) => void): UnsubscribeFn => {
      const listener = (_: Electron.IpcRendererEvent, p: { text: string }) =>
        cb(p);
      ipcRenderer.on(PUSH.VOICE_SPEAK, listener);
      return () => ipcRenderer.removeListener(PUSH.VOICE_SPEAK, listener);
    },
    onError: (cb: (message: string) => void): UnsubscribeFn => {
      const listener = (_: Electron.IpcRendererEvent, msg: string) => cb(msg);
      ipcRenderer.on(PUSH.VOICE_ERROR, listener);
      return () => ipcRenderer.removeListener(PUSH.VOICE_ERROR, listener);
    },
  },

  // ── Shortcuts ─────────────────────────────────────────────────────────────
  shortcuts: {
    validate: (accelerator: string): Promise<Result<void>> =>
      ipcRenderer.invoke(IPC.SHORTCUT_VALIDATE, accelerator),
    update: (
      key:
        | "quickTranslateShortcut"
        | "quickTranslateReplaceShortcut"
        | "toggleAppShortcut"
        | "voiceTextShortcut",
      value: string,
    ): Promise<Result<AppSettings>> =>
      ipcRenderer.invoke(IPC.SHORTCUT_UPDATE, { key, value }),
  },

  // ── App actions ───────────────────────────────────────────────────────────
  app: {
    openSettings: (): Promise<void> =>
      ipcRenderer.invoke(IPC.APP_OPEN_SETTINGS),
    openFull: (): Promise<void> => ipcRenderer.invoke(IPC.APP_OPEN_FULL),
    toggle: (): Promise<void> => ipcRenderer.invoke(IPC.APP_TOGGLE),
    onNavigate: (cb: (route: string) => void): UnsubscribeFn => {
      const listener = (_: Electron.IpcRendererEvent, route: string) =>
        cb(route);
      ipcRenderer.on("app:navigate", listener);
      return () => ipcRenderer.removeListener("app:navigate", listener);
    },
  },

  // ── Clipboard ─────────────────────────────────────────────────────────────
  clipboard: {
    writeText: (text: string): Promise<void> =>
      ipcRenderer.invoke(IPC.CLIPBOARD_WRITE, text),
  },

  // ── macOS permissions ─────────────────────────────────────────────────────
  macos: {
    requestQuickPermissions: (): Promise<
      | { ok: true }
      | { ok: false; message: string; missing: "accessibility" | "automation" }
    > => ipcRenderer.invoke(IPC.MACOS_REQUEST_QUICK_PERMISSIONS),
    openPrivacySettings: (
      pane: "accessibility" | "automation",
    ): Promise<void> =>
      ipcRenderer.invoke(IPC.MACOS_OPEN_PRIVACY_SETTINGS, pane),
  },
} as const;

contextBridge.exposeInMainWorld("electronAPI", api);

export type ElectronAPI = typeof api;
