import { app, BrowserWindow, screen, shell } from "electron";
import { suppressMainOnActivateFor } from "../activate-guard";
import { isAppQuitting } from "../app-quit-state";
import fs from "node:fs";
import path from "node:path";

// Injected by Electron Forge VitePlugin
declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string | undefined;
declare const MAIN_WINDOW_VITE_NAME: string;
declare const QUICK_WINDOW_VITE_DEV_SERVER_URL: string | undefined;
declare const QUICK_WINDOW_VITE_NAME: string;
declare const LOADING_WINDOW_VITE_DEV_SERVER_URL: string | undefined;
declare const LOADING_WINDOW_VITE_NAME: string;

/** Preload output is `.vite/build/preload.js`; `__dirname` is usually that folder but can be `.vite` in some runs. */
function resolvePreloadPath(): string {
  const sameDir = path.join(__dirname, "preload.js");
  const underBuild = path.join(__dirname, "build", "preload.js");
  if (fs.existsSync(sameDir)) return sameDir;
  if (fs.existsSync(underBuild)) return underBuild;
  return sameDir;
}

const PRELOAD_PATH = resolvePreloadPath();

/** Unpackaged app = local development (Forge start / not `electron-forge package`) */
const isDev = !app.isPackaged;

/** Default window tuned for compact translate UI; content scrolls inside the tab */
const MAIN_WINDOW_SIZE = { width: 720, height: 520 };
/** Compact floating panel; content scrolls inside */
const QUICK_WINDOW_SIZE = { width: 320, height: 240 };
/** Tiny loader indicator shown near cursor while processing shortcuts */
const LOADING_WINDOW_SIZE = { width: 44, height: 44 };

const CURSOR_OFFSET = 12;

/** Avoid uncaught exceptions when the native window is torn down between check and hide(). */
function safeHideBrowserWindow(win: BrowserWindow): void {
  try {
    if (!win.isDestroyed()) win.hide();
  } catch {
    // ignore — window already destroyed
  }
}

function clampQuickWindowToWorkArea(
  x: number,
  y: number,
  width: number,
  height: number,
): [number, number] {
  const display = screen.getDisplayNearestPoint({ x, y });
  const { workArea } = display;
  const maxX = workArea.x + workArea.width - width;
  const maxY = workArea.y + workArea.height - height;
  return [
    Math.round(Math.min(Math.max(x, workArea.x), maxX)),
    Math.round(Math.min(Math.max(y, workArea.y), maxY)),
  ];
}

class WindowManager {
  private mainWindow: BrowserWindow | null = null;
  private quickWindow: BrowserWindow | null = null;
  private loadingWindow: BrowserWindow | null = null;

  createMainWindow(): BrowserWindow {
    const appIcon = app.isPackaged
      ? path.join(process.resourcesPath, "assets", "logo.png")
      : path.join(__dirname, "../../assets/logo.png");

    this.mainWindow = new BrowserWindow({
      ...MAIN_WINDOW_SIZE,
      minWidth: 600,
      minHeight: 480,
      title: "NextG Translate",
      icon: appIcon,
      show: false,
      autoHideMenuBar: true,
      webPreferences: {
        preload: PRELOAD_PATH,
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false, // sandbox:true breaks preload module loading with Vite
        webSecurity: true,
      },
    });

    this.mainWindow.setMenu(null);

    this.mainWindow.webContents.setWindowOpenHandler(({ url }) => {
      shell.openExternal(url);
      return { action: "deny" };
    });

    if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
      this.mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
    } else {
      this.mainWindow.loadFile(
        path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
      );
    }

    this.mainWindow.once("ready-to-show", () => {
      this.mainWindow?.show();
      if (isDev) {
        this.mainWindow?.webContents.openDevTools();
      }
    });

    // Hide instead of destroying so shortcuts / Dock / second-instance can show again.
    // (Menu bar tray is only used on Windows/Linux; see tray-manager.)
    // Minimize does not fire `close` — only closing the window hides quick too.
    this.mainWindow.on("close", (e) => {
      if (isAppQuitting()) {
        return;
      }
      e.preventDefault();
      this.hideQuick();
      this.hideLoading();
      const mw = this.mainWindow;
      if (mw && !mw.isDestroyed()) {
        try {
          mw.hide();
        } catch {
          /* ignore */
        }
      }
    });

    return this.mainWindow;
  }

  createQuickWindow(): BrowserWindow {
    this.quickWindow = new BrowserWindow({
      ...QUICK_WINDOW_SIZE,
      show: false,
      frame: false,
      resizable: false,
      skipTaskbar: true,
      alwaysOnTop: true,
      transparent: false,
      webPreferences: {
        preload: PRELOAD_PATH,
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false,
        webSecurity: true,
      },
    });

    this.quickWindow.webContents.setWindowOpenHandler(() => ({
      action: "deny",
    }));

    // Dev server URL is the host root (`/`) — that serves `index.html` (main app). Quick UI lives in `index-quick.html`.
    if (QUICK_WINDOW_VITE_DEV_SERVER_URL) {
      const base = QUICK_WINDOW_VITE_DEV_SERVER_URL.replace(/\/$/, "");
      this.quickWindow.loadURL(`${base}/index-quick.html`);
    } else {
      this.quickWindow.loadFile(
        path.join(
          __dirname,
          `../renderer/${QUICK_WINDOW_VITE_NAME}/index-quick.html`,
        ),
      );
    }

    this.quickWindow.on("blur", () => {
      suppressMainOnActivateFor(1500);
      this.hideQuick({ suppressMainFocus: true });
    });

    if (isDev) {
      this.quickWindow.webContents.once("did-finish-load", () => {
        this.quickWindow?.webContents.openDevTools({ mode: "detach" });
      });
    }

    return this.quickWindow;
  }

  createLoadingWindow(): BrowserWindow {
    this.loadingWindow = new BrowserWindow({
      ...LOADING_WINDOW_SIZE,
      show: false,
      frame: false,
      resizable: false,
      skipTaskbar: true,
      alwaysOnTop: true,
      transparent: true,
      focusable: false,
      webPreferences: {
        preload: PRELOAD_PATH,
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false,
        webSecurity: true,
      },
    });

    this.loadingWindow.setIgnoreMouseEvents(true);
    this.loadingWindow.webContents.setWindowOpenHandler(() => ({
      action: "deny",
    }));

    if (LOADING_WINDOW_VITE_DEV_SERVER_URL) {
      const base = LOADING_WINDOW_VITE_DEV_SERVER_URL.replace(/\/$/, "");
      this.loadingWindow.loadURL(`${base}/index-loading.html`);
    } else {
      this.loadingWindow.loadFile(
        path.join(
          __dirname,
          `../renderer/${LOADING_WINDOW_VITE_NAME}/index-loading.html`,
        ),
      );
    }

    return this.loadingWindow;
  }

  getMainWindow(): BrowserWindow | null {
    return this.mainWindow;
  }

  getQuickWindow(): BrowserWindow | null {
    const w = this.quickWindow;
    if (!w || w.isDestroyed()) return null;
    return w;
  }

  getLoadingWindow(): BrowserWindow | null {
    const w = this.loadingWindow;
    if (!w || w.isDestroyed()) return null;
    return w;
  }

  showMain(): void {
    if (!this.mainWindow) return;
    if (this.mainWindow.isMinimized()) this.mainWindow.restore();
    this.mainWindow.show();
    this.mainWindow.focus();
  }

  hideMain(): void {
    this.mainWindow?.hide();
  }

  toggleMain(): void {
    if (!this.mainWindow) return;
    if (this.mainWindow.isVisible() && !this.mainWindow.isMinimized()) {
      this.hideMain();
    } else {
      this.showMain();
    }
  }

  /**
   * UX for the "toggle app" shortcut:
   * - If the window is hidden to tray or minimized: always show/restore.
   * - If it's visible but not focused (background): bring it to front (don't hide).
   * - Only hide when it's already visible + focused.
   */
  toggleMainFromShortcut(): void {
    const w = this.mainWindow;
    if (!w || w.isDestroyed()) return;

    if (!w.isVisible() || w.isMinimized()) {
      this.showMain();
      return;
    }

    if (!w.isFocused()) {
      this.showMain();
      return;
    }

    this.hideMain();
  }

  /**
   * Show the quick panel without stealing focus from the app that had text selected
   * (critical so global shortcut + simulated Cmd+C target the correct window).
   */
  showQuick(alwaysOnTop: boolean): void {
    const w = this.quickWindow;
    if (!w || w.isDestroyed()) return;
    w.setAlwaysOnTop(alwaysOnTop);
    const point = screen.getCursorScreenPoint();
    const bounds = w.getBounds();
    const width = bounds.width > 0 ? bounds.width : QUICK_WINDOW_SIZE.width;
    const height = bounds.height > 0 ? bounds.height : QUICK_WINDOW_SIZE.height;
    const [x, y] = clampQuickWindowToWorkArea(
      point.x + CURSOR_OFFSET,
      point.y + CURSOR_OFFSET,
      width,
      height,
    );
    w.setPosition(x, y);
    w.showInactive();
  }

  showLoading(alwaysOnTop: boolean): void {
    const w = this.loadingWindow;
    if (!w || w.isDestroyed()) return;
    w.setAlwaysOnTop(alwaysOnTop);
    const point = screen.getCursorScreenPoint();
    const bounds = w.getBounds();
    const width = bounds.width > 0 ? bounds.width : LOADING_WINDOW_SIZE.width;
    const height =
      bounds.height > 0 ? bounds.height : LOADING_WINDOW_SIZE.height;
    const [x, y] = clampQuickWindowToWorkArea(
      point.x + CURSOR_OFFSET,
      point.y + CURSOR_OFFSET,
      width,
      height,
    );
    w.setPosition(x, y);
    w.showInactive();
  }

  /**
   * Hide the quick panel. When `suppressMainFocus` is true (default), avoid bringing the main
   * window to the front / stealing focus after the floating panel closes (Electron otherwise
   * focuses the next window in the same app).
   */
  hideQuick(options?: { suppressMainFocus?: boolean }): void {
    const suppressMainFocus = options?.suppressMainFocus !== false;
    const w = this.quickWindow;
    if (!w || w.isDestroyed()) return;

    // Prevent focus handoff to our own app windows while the quick panel is closing.
    if (suppressMainFocus) {
      try {
        w.setFocusable(false);
      } catch {
        /* ignore */
      }
    }

    safeHideBrowserWindow(w);

    if (suppressMainFocus) {
      const restore = (): void => {
        try {
          if (w.isDestroyed()) return;
          w.setFocusable(true);
        } catch {
          /* ignore */
        }
      };
      setImmediate(restore);
      setTimeout(restore, 50);
    }
  }

  hideLoading(): void {
    const w = this.loadingWindow;
    if (!w || w.isDestroyed()) return;
    safeHideBrowserWindow(w);
  }

  setQuickAlwaysOnTop(value: boolean): void {
    const w = this.quickWindow;
    if (!w || w.isDestroyed()) return;
    w.setAlwaysOnTop(value);
  }
}

let manager: WindowManager | null = null;

export function getWindowManager(): WindowManager {
  if (!manager) manager = new WindowManager();
  return manager;
}
