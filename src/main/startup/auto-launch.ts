import { app } from "electron";

export function applyAutoLaunchOnSystemStart(enabled: boolean): void {
  // Login item registration is relevant for packaged desktop builds.
  if (!app.isPackaged) return;

  app.setLoginItemSettings({
    openAtLogin: enabled,
  });
}
