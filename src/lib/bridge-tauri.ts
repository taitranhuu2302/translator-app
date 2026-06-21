import { invoke } from "@tauri-apps/api/core";
import type {
  AppSettings,
  HistoryItem,
  HistoryItemType,
  Result,
} from "../../shared/types";

export const bridge = {
  settings: {
    get: (): Promise<AppSettings> => invoke<AppSettings>("settings_get"),
    update: (patch: Partial<AppSettings>): Promise<Result<AppSettings>> =>
      invoke<Result<AppSettings>>("settings_update", { patch }),
    resetShortcuts: (): Promise<Result<AppSettings>> =>
      invoke<Result<AppSettings>>("settings_reset_shortcuts"),
  },
  history: {
    list: (
      opts?: { limit?: number; type?: HistoryItemType },
    ): Promise<HistoryItem[]> =>
      invoke<HistoryItem[]>("history_list", { opts }),
    delete: (id: number): Promise<void> =>
      invoke<void>("history_delete", { id }),
    clear: (): Promise<void> => invoke<void>("history_clear"),
  },
  clipboard: {
    writeText: (text: string): Promise<void> =>
      invoke<void>("clipboard_write", { text }),
  },
};
