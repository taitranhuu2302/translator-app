import { describe, it, expect, vi, beforeEach } from 'vitest';

const registeredShortcuts = new Map<string, () => void>();

const mockGlobalShortcut = {
  register: vi.fn((accelerator: string, handler: () => void) => {
    registeredShortcuts.set(accelerator, handler);
    return true;
  }),
  unregister: vi.fn((accelerator: string) => {
    registeredShortcuts.delete(accelerator);
  }),
  unregisterAll: vi.fn(() => registeredShortcuts.clear()),
  isRegistered: vi.fn((accelerator: string) => registeredShortcuts.has(accelerator)),
};

vi.mock('electron', () => ({ globalShortcut: mockGlobalShortcut }));

describe('ShortcutManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    registeredShortcuts.clear();
    vi.resetModules();
    // Restore default behaviour after clearAllMocks
    mockGlobalShortcut.register.mockImplementation((accelerator: string, handler: () => void) => {
      registeredShortcuts.set(accelerator, handler);
      return true;
    });
    mockGlobalShortcut.unregister.mockImplementation((accelerator: string) => {
      registeredShortcuts.delete(accelerator);
    });
  });

  it('validates a correct accelerator format', async () => {
    const { getShortcutManager } = await import('../main/shortcuts/shortcut-manager');
    const sm = getShortcutManager();
    expect(sm.validateFormat('CommandOrControl+Alt+T')).toBe(true);
  });

  it('rejects invalid accelerator formats', async () => {
    const { getShortcutManager } = await import('../main/shortcuts/shortcut-manager');
    const sm = getShortcutManager();
    expect(sm.validateFormat('')).toBe(false);
    expect(sm.validateFormat('T')).toBe(false);          // no modifier
    expect(sm.validateFormat('Ctrl')).toBe(false);       // no key
    expect(sm.validateFormat('Foo+Bar')).toBe(false);    // unknown modifier
  });

  it('registers a shortcut successfully', async () => {
    const { getShortcutManager } = await import('../main/shortcuts/shortcut-manager');
    const sm = getShortcutManager();
    const handler = vi.fn();
    const success = sm.register('quickTranslate', 'CommandOrControl+Alt+T', handler);
    expect(success).toBe(true);
    expect(mockGlobalShortcut.register).toHaveBeenCalledWith('CommandOrControl+Alt+T', handler);
  });

  it('registers translate and replace shortcut successfully', async () => {
    const { getShortcutManager } = await import('../main/shortcuts/shortcut-manager');
    const sm = getShortcutManager();
    const handler = vi.fn();
    const success = sm.register('quickTranslateReplace', 'Shift+Alt+T', handler);
    expect(success).toBe(true);
    expect(mockGlobalShortcut.register).toHaveBeenCalledWith('Shift+Alt+T', handler);
  });

  it('detects internal conflict when two roles try same shortcut', async () => {
    const { getShortcutManager } = await import('../main/shortcuts/shortcut-manager');
    const sm = getShortcutManager();
    sm.register('quickTranslate', 'CommandOrControl+Shift+X', vi.fn());
    const success = sm.register('toggleApp', 'CommandOrControl+Shift+X', vi.fn());
    expect(success).toBe(false);
  });

  it('unregisters old shortcut when updating to a new one', async () => {
    const { getShortcutManager } = await import('../main/shortcuts/shortcut-manager');
    const sm = getShortcutManager();
    const handler = vi.fn();
    sm.register('quickTranslate', 'CommandOrControl+Alt+T', handler);

    const result = sm.updateShortcut('quickTranslate', 'CommandOrControl+Alt+Y', handler);
    expect(result.success).toBe(true);
    expect(mockGlobalShortcut.unregister).toHaveBeenCalledWith('CommandOrControl+Alt+T');
    expect(mockGlobalShortcut.register).toHaveBeenCalledWith('CommandOrControl+Alt+Y', handler);
  });

  it('rolls back to old shortcut when new registration fails', async () => {
    const { getShortcutManager } = await import('../main/shortcuts/shortcut-manager');
    const sm = getShortcutManager();
    const handler = vi.fn();

    // Register original
    sm.register('quickTranslate', 'CommandOrControl+Alt+T', handler);

    // Make the next register call (for the new shortcut) fail
    mockGlobalShortcut.register
      .mockImplementationOnce((_acc: string, _h: () => void) => false); // new shortcut fails

    const result = sm.updateShortcut('quickTranslate', 'CommandOrControl+Alt+Z', handler);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Could not register/);
    // Rollback: old shortcut re-registered
    expect(mockGlobalShortcut.register).toHaveBeenCalledWith('CommandOrControl+Alt+T', handler);
  });

  it('unregisters all shortcuts', async () => {
    const { getShortcutManager } = await import('../main/shortcuts/shortcut-manager');
    const sm = getShortcutManager();
    sm.register('quickTranslate', 'CommandOrControl+Alt+T', vi.fn());
    sm.unregisterAll();
    expect(mockGlobalShortcut.unregisterAll).toHaveBeenCalledOnce();
  });
});
