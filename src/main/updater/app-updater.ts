import { app } from "electron";
import {
  makeUserNotifier,
  updateElectronApp,
  UpdateSourceType,
} from "update-electron-app";

const GITHUB_REPO = "taitranhuu2302/translator-app";

const updateLogger = {
  log(message: string, ...args: unknown[]) {
    console.log("[updater]", message, ...args);
  },
  info(message: string, ...args: unknown[]) {
    console.info("[updater]", message, ...args);
  },
  warn(message: string, ...args: unknown[]) {
    console.warn("[updater]", message, ...args);
  },
  error(message: string, ...args: unknown[]) {
    console.error("[updater]", message, ...args);
  },
};

export function initAutoUpdater(): void {
  if (!app.isPackaged) {
    updateLogger.info("Skipping auto-update in development mode");
    return;
  }

  if (process.platform !== "win32" && process.platform !== "darwin") {
    updateLogger.info(`Skipping auto-update on unsupported platform: ${process.platform}`);
    return;
  }

  try {
    updateLogger.info("Initializing auto-update");

    updateElectronApp({
      // update.electronjs.org requires public GitHub Releases.
      // If releases become private later, migrate to a custom feed or electron-updater.
      updateSource: {
        type: UpdateSourceType.ElectronPublicUpdateService,
        repo: GITHUB_REPO,
      },
      updateInterval: "1 hour",
      logger: updateLogger,
      notifyUser: true,
      onNotifyUser: makeUserNotifier({
        title: "Update Ready",
        detail:
          "A new version has been downloaded. Restart the app to apply the update.",
        restartButtonText: "Restart Now",
        laterButtonText: "Later",
      }),
    });
  } catch (error) {
    updateLogger.error("Failed to initialize auto-update", error);
  }
}

