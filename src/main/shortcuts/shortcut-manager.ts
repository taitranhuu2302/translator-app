import { globalShortcut } from 'electron';
import { AppSettings } from '../../shared/types';

type ShortcutHandler = () => void;

const ACCELERATOR_REGEX =
  /^(CommandOrControl|CmdOrCtrl|Command|Ctrl|Alt|Option|AltGr|Shift|Super|\+)+(\+[A-Za-z0-9]|\+F\d{1,2}|\+[A-Z][a-z]+)+$/;

export interface RegisteredShortcuts {
  toggleApp: string;
  quickTranslate: string;
  quickTranslateReplace: string;
}

class ShortcutManager {
  private registered: Map<string, string> = new Map(); // accelerator -> role

  validateFormat(accelerator: string): boolean {
    if (!accelerator || accelerator.trim() === '') return false;

    // Parse: one or more modifiers, then exactly one key, separated by '+'
    const MODIFIERS = new Set([
      'CommandOrControl', 'CmdOrCtrl', 'Command', 'Cmd',
      'Control', 'Ctrl', 'Alt', 'Option', 'AltGr', 'Shift', 'Super',
    ]);
    const NAMED_KEYS = new Set([
      'Space', 'Tab', 'Backspace', 'Delete', 'Insert', 'Return', 'Enter',
      'Up', 'Down', 'Left', 'Right', 'Home', 'End', 'PageUp', 'PageDown',
      'Escape', 'Esc', 'PrintScreen', 'Plus',
      'num0', 'num1', 'num2', 'num3', 'num4', 'num5', 'num6', 'num7', 'num8', 'num9',
    ]);
    const F_KEY = /^F\d{1,2}$/;
    const SINGLE_CHAR = /^[A-Za-z0-9`\-=\[\];',./\\]$/;

    const parts = accelerator.split('+');
    if (parts.length < 2) return false;

    const key = parts[parts.length - 1];
    const mods = parts.slice(0, -1);

    const validKey = NAMED_KEYS.has(key) || F_KEY.test(key) || SINGLE_CHAR.test(key);
    if (!validKey) return false;

    return mods.every((m) => MODIFIERS.has(m));
  }

  register(
    role: 'toggleApp' | 'quickTranslate' | 'quickTranslateReplace',
    accelerator: string,
    handler: ShortcutHandler,
  ): boolean {
    if (!this.validateFormat(accelerator)) return false;

    // Check internal conflict
    const conflictRole = this.registered.get(accelerator);
    if (conflictRole && conflictRole !== role) return false;

    // Unregister previous binding for this role
    const oldAccelerator = this.getAcceleratorForRole(role);
    if (oldAccelerator && oldAccelerator !== accelerator) {
      globalShortcut.unregister(oldAccelerator);
      this.registered.delete(oldAccelerator);
    }

    const success = globalShortcut.register(accelerator, handler);
    if (success) {
      this.registered.set(accelerator, role);
    }
    return success;
  }

  updateShortcut(
    role: 'toggleApp' | 'quickTranslate' | 'quickTranslateReplace',
    newAccelerator: string,
    handler: ShortcutHandler,
  ): { success: boolean; error?: string } {
    if (!this.validateFormat(newAccelerator)) {
      return { success: false, error: 'Invalid accelerator format' };
    }

    const conflictRole = this.registered.get(newAccelerator);
    if (conflictRole && conflictRole !== role) {
      return { success: false, error: `Shortcut is already used by: ${conflictRole}` };
    }

    // Save old accelerator for rollback
    const oldAccelerator = this.getAcceleratorForRole(role);

    if (oldAccelerator) {
      globalShortcut.unregister(oldAccelerator);
      this.registered.delete(oldAccelerator);
    }

    const success = globalShortcut.register(newAccelerator, handler);
    if (!success) {
      // Rollback: re-register old shortcut
      if (oldAccelerator) {
        globalShortcut.register(oldAccelerator, handler);
        this.registered.set(oldAccelerator, role);
      }
      return { success: false, error: 'Could not register shortcut (may be in use by another app)' };
    }

    this.registered.set(newAccelerator, role);
    return { success: true };
  }

  unregisterAll(): void {
    globalShortcut.unregisterAll();
    this.registered.clear();
  }

  private getAcceleratorForRole(role: string): string | undefined {
    for (const [acc, r] of this.registered.entries()) {
      if (r === role) return acc;
    }
    return undefined;
  }

  getRegistered(): RegisteredShortcuts {
    const toggleApp = this.getAcceleratorForRole('toggleApp') ?? '';
    const quickTranslate = this.getAcceleratorForRole('quickTranslate') ?? '';
    const quickTranslateReplace = this.getAcceleratorForRole('quickTranslateReplace') ?? '';
    return { toggleApp, quickTranslate, quickTranslateReplace };
  }
}

let manager: ShortcutManager | null = null;

export function getShortcutManager(): ShortcutManager {
  if (!manager) manager = new ShortcutManager();
  return manager;
}

export function registerDefaultShortcuts(
  settings: AppSettings,
  handlers: {
    toggleApp: ShortcutHandler;
    quickTranslate: ShortcutHandler;
    quickTranslateReplace: ShortcutHandler;
  },
): void {
  const sm = getShortcutManager();
  sm.register('toggleApp', settings.toggleAppShortcut, handlers.toggleApp);
  sm.register('quickTranslate', settings.quickTranslateShortcut, handlers.quickTranslate);
  sm.register(
    'quickTranslateReplace',
    settings.quickTranslateReplaceShortcut,
    handlers.quickTranslateReplace,
  );
}
