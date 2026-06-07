import type {
  AppSettings,
  TranslationRequest,
  TranslationResult,
  QuickTranslatePayload,
  ImproveRequest,
  ImproveResult,
  HistoryItem,
  AiModelOption,
  Result,
} from "./types";

// ─── Invoke channels (renderer → main, awaited) ──────────────────────────────

export const IPC = {
  SETTINGS_GET: "settings:get",
  SETTINGS_UPDATE: "settings:update",
  SETTINGS_RESET_SHORTCUTS: "settings:reset-shortcuts",

  TRANSLATE_MANUAL: "translate:manual",

  IMPROVE: "improve:run",

  HISTORY_LIST: "history:list",
  HISTORY_DELETE: "history:delete",
  HISTORY_CLEAR: "history:clear",

  MODELS_LIST_GROQ: "models:list-groq",
  MODELS_LIST_GEMINI: "models:list-gemini",

  QUICK_TRANSLATE_NOW: "quick:translate-now",
  QUICK_RETRANSLATE: "quick:retranslate",
  QUICK_CLOSE: "quick:close",

  SHORTCUT_VALIDATE: "shortcut:validate",
  SHORTCUT_UPDATE: "shortcut:update",

  APP_OPEN_SETTINGS: "app:open-settings",
  APP_OPEN_FULL: "app:open-full",
  APP_TOGGLE: "app:toggle",

  CLIPBOARD_WRITE: "clipboard:write",

  MACOS_REQUEST_QUICK_PERMISSIONS: "macos:request-quick-permissions",
  MACOS_OPEN_PRIVACY_SETTINGS: "macos:open-privacy-settings",
} as const;

// ─── Push channels (main → renderer, one-way events) ─────────────────────────

export const PUSH = {
  QUICK_LOADING: "quick:loading",
  QUICK_SHOW: "quick:show",
  QUICK_ERROR: "quick:error",
  VOICE_SPEAK: "voice:speak",
  VOICE_ERROR: "voice:error",
} as const;

// ─── Typed IPC map ────────────────────────────────────────────────────────────

export interface IpcInvokeMap {
  [IPC.SETTINGS_GET]: { args: []; ret: AppSettings };
  [IPC.SETTINGS_UPDATE]: {
    args: [Partial<AppSettings>];
    ret: Result<AppSettings>;
  };
  [IPC.SETTINGS_RESET_SHORTCUTS]: { args: []; ret: Result<AppSettings> };

  [IPC.TRANSLATE_MANUAL]: {
    args: [TranslationRequest];
    ret: Result<TranslationResult>;
  };

  [IPC.IMPROVE]: { args: [ImproveRequest]; ret: Result<ImproveResult> };

  [IPC.HISTORY_LIST]: {
    args: [{ limit?: number; type?: "translate" | "improve" }];
    ret: HistoryItem[];
  };
  [IPC.HISTORY_DELETE]: { args: [number]; ret: void };
  [IPC.HISTORY_CLEAR]: { args: []; ret: void };

  [IPC.MODELS_LIST_GROQ]: { args: [string]; ret: AiModelOption[] };
  [IPC.MODELS_LIST_GEMINI]: { args: [string]; ret: AiModelOption[] };

  [IPC.QUICK_TRANSLATE_NOW]: { args: []; ret: Result<void> };
  [IPC.QUICK_RETRANSLATE]: {
    args: [TranslationRequest];
    ret: Result<TranslationResult>;
  };
  [IPC.QUICK_CLOSE]: { args: []; ret: void };

  [IPC.SHORTCUT_VALIDATE]: { args: [string]; ret: Result<void> };
  [IPC.SHORTCUT_UPDATE]: {
    args: [
      {
        key:
          | "quickTranslateShortcut"
          | "quickTranslateReplaceShortcut"
          | "toggleAppShortcut"
          | "voiceTextShortcut";
        value: string;
      },
    ];
    ret: Result<AppSettings>;
  };

  [IPC.APP_OPEN_SETTINGS]: { args: []; ret: void };
  [IPC.APP_OPEN_FULL]: { args: []; ret: void };
  [IPC.APP_TOGGLE]: { args: []; ret: void };

  [IPC.CLIPBOARD_WRITE]: { args: [string]; ret: void };

  [IPC.MACOS_REQUEST_QUICK_PERMISSIONS]: {
    args: [];
    ret:
      | { ok: true }
      | { ok: false; message: string; missing: "accessibility" | "automation" };
  };
  [IPC.MACOS_OPEN_PRIVACY_SETTINGS]: {
    args: ["accessibility" | "automation"];
    ret: void;
  };
}

export interface IpcPushMap {
  [PUSH.QUICK_LOADING]: void;
  [PUSH.QUICK_SHOW]: QuickTranslatePayload;
  [PUSH.QUICK_ERROR]: string;
  [PUSH.VOICE_SPEAK]: { text: string };
  [PUSH.VOICE_ERROR]: string;
}
