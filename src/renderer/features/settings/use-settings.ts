import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bridge } from '../../lib/bridge';
import { showError, showSuccess } from '../../lib/toast';
import type { AppSettings, Result } from '../../../shared/types';
import { isOk, isErr } from '../../../shared/types';

export const SETTINGS_KEY = ['settings'] as const;

export function useSettings() {
  return useQuery({
    queryKey: SETTINGS_KEY,
    queryFn: () => bridge.settings.get(),
  });
}

export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation<Result<AppSettings>, Error, Partial<AppSettings>>({
    mutationFn: (patch) => bridge.settings.update(patch),
    onSuccess: (result) => {
      if (isOk(result)) {
        qc.setQueryData(SETTINGS_KEY, result.data);
      } else if (isErr(result)) {
        showError(result.error.message);
      }
    },
    onError: () => showError('Failed to save settings'),
  });
}

export function useResetShortcuts() {
  const qc = useQueryClient();
  return useMutation<Result<AppSettings>, Error>({
    mutationFn: () => bridge.settings.resetShortcuts(),
    onSuccess: (result) => {
      if (isOk(result)) {
        qc.setQueryData(SETTINGS_KEY, result.data);
        showSuccess('Shortcuts reset to defaults');
      } else if (isErr(result)) {
        showError(result.error.message);
      }
    },
    onError: () => showError('Failed to reset shortcuts'),
  });
}

export function useValidateShortcut() {
  return useMutation<Result<void>, Error, string>({
    mutationFn: (accelerator) => bridge.shortcuts.validate(accelerator),
  });
}

type UpdateShortcutVars = {
  key:
    | 'quickTranslateShortcut'
    | 'quickTranslateReplaceShortcut'
    | 'toggleAppShortcut'
    | 'voiceTextShortcut';
  value: string;
};

export function useUpdateShortcut() {
  const qc = useQueryClient();
  return useMutation<Result<AppSettings>, Error, UpdateShortcutVars>({
    mutationFn: ({ key, value }) => bridge.shortcuts.update(key, value),
    onSuccess: (result) => {
      if (isOk(result)) {
        qc.setQueryData(SETTINGS_KEY, result.data);
        showSuccess('Shortcut saved');
      } else if (isErr(result)) {
        const { code, message } = result.error;
        if (code === 'SHORTCUT_CONFLICT') {
          showError(`Shortcut conflict: ${message}`);
        } else if (code === 'SHORTCUT_INVALID') {
          showError(`Invalid shortcut format: ${message}`);
        } else {
          showError(message);
        }
      }
    },
    onError: () => showError('Failed to update shortcut'),
  });
}
