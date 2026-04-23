import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('electron', () => ({
  app: { getPath: vi.fn(() => '/tmp/nextg-translate-test') },
}));

const fsMock = {
  existsSync: vi.fn(() => false),
  readFileSync: vi.fn(() => '{}'),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
};

vi.mock('node:fs', () => ({
  default: fsMock,
  existsSync: fsMock.existsSync,
  readFileSync: fsMock.readFileSync,
  writeFileSync: fsMock.writeFileSync,
  mkdirSync: fsMock.mkdirSync,
}));

import { DEFAULT_SETTINGS } from '../shared/types';

// Import once — the singleton is stable within a test file
// Reset via reload() between logical cases where needed
let storeModule: typeof import('../main/settings/settings-store');

beforeEach(async () => {
  vi.clearAllMocks();
  vi.resetModules();
  // Restore mock implementations after clearAllMocks
  fsMock.existsSync.mockReturnValue(false);
  fsMock.readFileSync.mockReturnValue('{}');
  storeModule = await import('../main/settings/settings-store');
});

describe('SettingsStore', () => {
  it('returns defaults when no file exists', () => {
    fsMock.existsSync.mockReturnValue(false);
    const store = storeModule.getSettingsStore();
    const s = store.get();
    expect(s.version).toBe(DEFAULT_SETTINGS.version);
    expect(s.quickTranslateShortcut).toBe(DEFAULT_SETTINGS.quickTranslateShortcut);
    expect(s.manualDirection).toBe(DEFAULT_SETTINGS.manualDirection);
    expect(s.quickTargetLanguage).toBe('vi');
    expect(s.quickReplaceTargetLanguage).toBe('en');
  });

  it('loads and merges persisted settings', async () => {
    fsMock.existsSync.mockReturnValue(true);
    fsMock.readFileSync.mockReturnValue(
      JSON.stringify({ version: 1, manualDirection: 'en-vi', quickTargetLanguage: 'vi' }),
    );
    vi.resetModules();
    const fresh = await import('../main/settings/settings-store');
    const store = fresh.getSettingsStore();
    const s = store.get();
    expect(s.manualDirection).toBe('en-vi');
    expect(s.quickTargetLanguage).toBe('vi');
    expect(s.autoCopyDelayMs).toBe(DEFAULT_SETTINGS.autoCopyDelayMs);
  });

  it('persists updates to disk', () => {
    fsMock.existsSync.mockReturnValue(false);
    const store = storeModule.getSettingsStore();
    store.update({ manualDirection: 'en-vi' });
    expect(fsMock.writeFileSync).toHaveBeenCalledOnce();
    const written = JSON.parse(fsMock.writeFileSync.mock.calls[0][1] as string);
    expect(written.manualDirection).toBe('en-vi');
  });

  it('handles corrupted file gracefully', async () => {
    fsMock.existsSync.mockReturnValue(true);
    fsMock.readFileSync.mockReturnValue('not-valid-json{{');
    vi.resetModules();
    const fresh = await import('../main/settings/settings-store');
    const store = fresh.getSettingsStore();
    const s = store.get();
    expect(s.version).toBe(DEFAULT_SETTINGS.version);
  });

  it('migration: bumps version on old settings', async () => {
    fsMock.existsSync.mockReturnValue(true);
    fsMock.readFileSync.mockReturnValue(
      JSON.stringify({ version: 0, manualDirection: 'en-vi' }),
    );
    vi.resetModules();
    const fresh = await import('../main/settings/settings-store');
    const store = fresh.getSettingsStore();
    const s = store.get();
    expect(s.version).toBe(DEFAULT_SETTINGS.version);
    expect(s.manualDirection).toBe('en-vi');
  });
});
