import type { ElectronAPI } from "../../preload";

type UnsubscribeFn = () => void;

function getPlatform(): string {
  if (typeof navigator !== "undefined") {
    return navigator.platform.toLowerCase().includes("mac") ? "darwin" : "win32";
  }
  return "darwin";
}

function createTauriBridge(): ElectronAPI {
  const invoke = (cmd: string, args?: Record<string, unknown>) =>
    import("@tauri-apps/api/core").then((m) => m.invoke(cmd, args));

  const noopSubscribe: () => UnsubscribeFn = () => () => {};

  return {
    runtime: { platform: getPlatform() },
    settings: {
      get: () => invoke("settings_get"),
      update: (patch: any) => invoke("settings_update", { patch }),
      resetShortcuts: () => invoke("settings_reset_shortcuts"),
    },
    translate: {
      manual: () => Promise.reject(new Error("not implemented in Tauri yet")),
    },
    improve: {
      run: () => Promise.reject(new Error("not implemented in Tauri yet")),
    },
    history: {
      list: (opts?: any) => invoke("history_list", { opts }),
      delete: (id: number) => invoke("history_delete", { id }),
      clear: () => invoke("history_clear"),
    },
    models: {
      listGroq: () => Promise.resolve([] as any),
      listGemini: () => Promise.resolve([] as any),
    },
    quick: {
      translateNow: () => Promise.reject(new Error("not implemented")),
      retranslate: () => Promise.reject(new Error("not implemented")),
      close: () => Promise.resolve(),
      onLoading: noopSubscribe,
      onShow: noopSubscribe as any,
      onError: noopSubscribe as any,
    },
    voice: {
      onSpeak: noopSubscribe as any,
      onError: noopSubscribe as any,
    },
    shortcuts: {
      validate: () => Promise.reject(new Error("not implemented")),
      update: () => Promise.reject(new Error("not implemented")),
    },
    app: {
      openSettings: () => Promise.resolve(),
      openFull: () => Promise.resolve(),
      toggle: () => Promise.resolve(),
      onNavigate: noopSubscribe as any,
    },
    clipboard: {
      writeText: (text: string) => invoke("clipboard_write", { text }),
    },
    macos: {
      requestQuickPermissions: () =>
        Promise.resolve({
          ok: false as const,
          message: "not implemented",
          missing: "accessibility" as const,
        }),
      openPrivacySettings: () => Promise.resolve(),
    },
  };
}

// When running in Electron, use the preload-injected API.
// In Tauri, fall back to a bridge that calls invoke().
const electronApi =
  typeof window !== "undefined" ? (window as any).electronAPI : undefined;

export const bridge: ElectronAPI = electronApi ?? createTauriBridge();

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
