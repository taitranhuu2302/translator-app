import { app } from "electron";
import fs from "node:fs";
import path from "node:path";
import {
  AppSettings,
  DEFAULT_SETTINGS,
  DEFAULT_SHORTCUT_SETTINGS,
} from "../../shared/types";

const SETTINGS_FILE = "settings.json";
const CURRENT_VERSION = 6;

const MACOS_SHORTCUT_DEFAULTS = {
  quickTranslateShortcut: "Shift+Alt+Q",
  toggleAppShortcut: "Shift+Alt+E",
  quickTranslateReplaceShortcut: "Shift+Alt+R",
  voiceTextShortcut: "Shift+Alt+D",
} as const;

export function getDefaultShortcutSettings() {
  return process.platform === "darwin"
    ? MACOS_SHORTCUT_DEFAULTS
    : DEFAULT_SHORTCUT_SETTINGS;
}

export function getDefaultSettings(): AppSettings {
  return {
    ...DEFAULT_SETTINGS,
    ...getDefaultShortcutSettings(),
  };
}

function getSettingsPath(): string {
  return path.join(app.getPath("userData"), SETTINGS_FILE);
}

function migrate(raw: Record<string, unknown>): AppSettings {
  // Merging with DEFAULT_SETTINGS fills in any missing fields (version 1→2 adds AI fields)
  return { ...getDefaultSettings(), ...raw, version: CURRENT_VERSION };
}

function loadFromDisk(): AppSettings {
  try {
    const filePath = getSettingsPath();
    if (!fs.existsSync(filePath)) return getDefaultSettings();
    const raw = JSON.parse(fs.readFileSync(filePath, "utf-8")) as Record<
      string,
      unknown
    >;
    return migrate(raw);
  } catch {
    return getDefaultSettings();
  }
}

function saveToDisk(settings: AppSettings): void {
  const filePath = getSettingsPath();
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(settings, null, 2), "utf-8");
}

class SettingsStore {
  private settings: AppSettings;

  constructor() {
    this.settings = loadFromDisk();
  }

  get(): AppSettings {
    return { ...this.settings };
  }

  update(patch: Partial<AppSettings>): AppSettings {
    this.settings = { ...this.settings, ...patch };
    saveToDisk(this.settings);
    return this.get();
  }

  reload(): AppSettings {
    this.settings = loadFromDisk();
    return this.get();
  }
}

let store: SettingsStore | null = null;

export function getSettingsStore(): SettingsStore {
  if (!store) store = new SettingsStore();
  return store;
}
