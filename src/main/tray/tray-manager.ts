import { Tray, Menu, nativeImage, app } from "electron";
import path from "node:path";
import { getWindowManager } from "../windows/window-manager";
import { appBus } from "../app-bus";

let tray: Tray | null = null;

/** Menu bar tray is for Windows/Linux; macOS uses the Dock + standard window chrome. */
export const usesMenuBarTray = process.platform !== "darwin";

/** macOS: empty tray images + rapid setContextMenu can trigger NSMenu representedObject warnings. */
const FALLBACK_TRAY_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

function buildMenu(mainVisible: boolean): Menu {
  const wm = getWindowManager();
  return Menu.buildFromTemplate([
    {
      label: mainVisible ? "Hide Neris Translator" : "Show Neris Translator",
      click: () => wm.toggleMain(),
    },
    {
      label: "Neris Translator Now",
      click: () => appBus.emit("quick-translate-trigger"),
    },
    { type: "separator" },
    {
      label: "Settings",
      click: () => {
        wm.showMain();
        const mainWin = wm.getMainWindow();
        mainWin?.webContents.send("app:navigate", "/settings");
      },
    },
    { type: "separator" },
    {
      label: "Quit",
      click: () => {
        app.removeAllListeners("window-all-closed");
        app.quit();
      },
    },
  ]);
}

export function createTray(): void {
  if (!usesMenuBarTray) return;

  const iconSize = { width: 24, height: 24 };

  // Never use createEmpty() on macOS — use a minimal valid PNG instead.
  let icon: Electron.NativeImage;
  try {
    // In production (packaged): assets are in process.resourcesPath/assets/
    // In development: assets are 2 levels up from .vite/build/ -> project root/assets/
    const iconPath = app.isPackaged
      ? path.join(process.resourcesPath, "assets", "logo.png")
      : path.join(__dirname, "../../assets/logo.png");
    icon = nativeImage.createFromPath(iconPath).resize(iconSize);
    if (icon.isEmpty()) throw new Error("empty");
  } catch {
    icon = nativeImage
      .createFromBuffer(Buffer.from(FALLBACK_TRAY_PNG_BASE64, "base64"))
      .resize(iconSize);
  }

  tray = new Tray(icon);
  tray.setToolTip("Neris Translator");

  const wm = getWindowManager();
  const mainWin = wm.getMainWindow();

  let lastMainVisible: boolean | undefined;

  const refresh = () => {
    const visible = mainWin?.isVisible() ?? false;
    if (visible === lastMainVisible) return;
    lastMainVisible = visible;
    // Defer setContextMenu off the show/hide stack — avoids macOS menu bridge churn / warnings.
    setImmediate(() => {
      if (!tray) return;
      tray.setContextMenu(buildMenu(visible));
    });
  };

  mainWin?.on("show", refresh);
  mainWin?.on("hide", refresh);

  tray.on("click", () => wm.toggleMain());

  refresh();
}

export function destroyTray(): void {
  tray?.destroy();
  tray = null;
}
