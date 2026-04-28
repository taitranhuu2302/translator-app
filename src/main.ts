import { app, session } from "electron";
import started from "electron-squirrel-startup";
import { appBus } from "./main/app-bus";
import { getWindowManager } from "./main/windows/window-manager";
import {
  createTray,
  destroyTray,
  usesMenuBarTray,
} from "./main/tray/tray-manager";
import { getSettingsStore } from "./main/settings/settings-store";
import {
  registerDefaultShortcuts,
  getShortcutManager,
} from "./main/shortcuts/shortcut-manager";
import { registerIpcHandlers } from "./main/ipc/register-ipc-handlers";
import {
  runQuickTranslatePipeline,
  runQuickTranslateReplacePipeline,
} from "./main/quick-translate-flow";
import { runVoiceTextPipeline } from "./main/voice-text-flow";
import { shouldSuppressMainOnActivate } from "./main/activate-guard";
import { setAppQuitting } from "./main/app-quit-state";

if (started) app.quit();

// Enable Web Speech API audio capture in Electron's Chromium
app.commandLine.appendSwitch("enable-speech-input");
app.commandLine.appendSwitch("enable-features", "WebSpeechAPI");

// Prevent multiple instances
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    getWindowManager().showMain();
  });
}

app.whenReady().then(() => {
  // Grant microphone / audio-capture permissions so Web Speech API
  // (SpeechRecognition) can stream audio to Google's speech service.
  //
  // TWO handlers are required:
  //  • setPermissionRequestHandler – approves the initial permission request
  //  • setPermissionCheckHandler   – approves every subsequent synchronous
  //    check Chromium makes while the audio upload pipe is live. Without
  //    this the mojo data pipe is killed mid-stream → ERR_FAILED (-2).
  const SPEECH_PERMISSIONS = new Set(["media", "audioCapture"]);

  session.defaultSession.setPermissionCheckHandler((_webContents, permission) =>
    SPEECH_PERMISSIONS.has(permission),
  );

  session.defaultSession.setPermissionRequestHandler(
    (_webContents, permission, callback) => {
      callback(SPEECH_PERMISSIONS.has(permission));
    },
  );

  const settings = getSettingsStore();
  const s = settings.get();
  const wm = getWindowManager();

  wm.createMainWindow();
  wm.createQuickWindow();
  wm.createLoadingWindow();

  if (usesMenuBarTray) {
    createTray();
  }

  // ── Shortcut handlers ────────────────────────────────────────────────────
  const toggleApp = () => wm.toggleMainFromShortcut();

  const quickTranslate = () => {
    void runQuickTranslatePipeline();
  };
  const quickTranslateReplace = () => {
    void runQuickTranslateReplacePipeline();
  };
  const voiceText = () => {
    void runVoiceTextPipeline();
  };

  // Allow tray to trigger quick translate
  appBus.on("quick-translate-trigger", quickTranslate);

  registerIpcHandlers({ toggleApp, quickTranslate, quickTranslateReplace, voiceText });
  registerDefaultShortcuts(s, { toggleApp, quickTranslate, quickTranslateReplace, voiceText });

  const startHiddenToTray = usesMenuBarTray && s.startMinimized;
  if (!startHiddenToTray) {
    wm.showMain();
  }
});

app.on("window-all-closed", () => {
  // Windows/Linux: keep running for menu bar tray. macOS: Dock keeps the app alive until Cmd+Q.
});

app.on("before-quit", () => {
  setAppQuitting(true);
  getShortcutManager().unregisterAll();
  destroyTray();
});

app.on("activate", () => {
  if (shouldSuppressMainOnActivate()) return;
  getWindowManager().showMain();
});
