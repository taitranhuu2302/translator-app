import { app } from "electron";
import fs from "node:fs";
import path from "node:path";
import { AppSettings, DEFAULT_SETTINGS } from "../../shared/types";

const SETTINGS_FILE = "settings.json";
const CURRENT_VERSION = 6;

function getSettingsPath(): string {
  return path.join(app.getPath("userData"), SETTINGS_FILE);
}

function migrate(raw: Record<string, unknown>): AppSettings {
  // Merging with DEFAULT_SETTINGS fills in any missing fields (version 1→2 adds AI fields)
  return { ...DEFAULT_SETTINGS, ...raw, version: CURRENT_VERSION };
}

function loadFromDisk(): AppSettings {
  try {
    const filePath = getSettingsPath();
    if (!fs.existsSync(filePath)) return { ...DEFAULT_SETTINGS };
    const raw = JSON.parse(fs.readFileSync(filePath, "utf-8")) as Record<
      string,
      unknown
    >;
    return migrate(raw);
  } catch {
    return { ...DEFAULT_SETTINGS };
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
