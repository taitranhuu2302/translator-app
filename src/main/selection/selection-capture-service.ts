import { clipboard } from "electron";
import {
  NativeInputAdapter,
  ShellNativeInputAdapter,
} from "./native-input-adapter";
import { ClipboardSnapshotService } from "./clipboard-snapshot-service";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface SelectionCaptureOptions {
  delayMs: number;
  restoreClipboard: boolean;
}

export class SelectionCaptureService {
  private readonly adapter: NativeInputAdapter;
  private readonly clipboardService: ClipboardSnapshotService;

  constructor(
    adapter?: NativeInputAdapter,
    clipboardService?: ClipboardSnapshotService,
  ) {
    this.adapter = adapter ?? new ShellNativeInputAdapter();
    this.clipboardService = clipboardService ?? new ClipboardSnapshotService();
  }

  async captureSelectedText(options: SelectionCaptureOptions): Promise<string> {
    // Linux: X11 primary selection is directly readable
    if (process.platform === "linux") {
      const selectionText = clipboard.readText("selection");
      if (selectionText) return selectionText;
      // fall through to copy strategy if selection buffer empty
    }

    // Windows / macOS (and Linux fallback):
    // 1. Snapshot current clipboard
    // 2. Clear clipboard with a sentinel so we can detect when Ctrl+C writes new content
    // 3. Simulate copy shortcut
    // 4. Poll clipboard until it changes from the sentinel (new content arrived)
    // 5. Optionally restore the original clipboard

    const snapshot = this.clipboardService.snapshot();

    // Write sentinel so we can detect a real clipboard change after Ctrl+C.
    // Must NOT use null bytes — Windows CF_UNICODETEXT treats \x00 as string
    // terminator, so clipboard.readText() would return '' immediately.
    const SENTINEL = `__nextg_sentinel_${Date.now()}_${Math.random().toString(36).slice(2)}__`;
    clipboard.writeText(SENTINEL);

    try {
      await this.adapter.simulateCopyShortcut();
    } catch (error: unknown) {
      this.clipboardService.restore(snapshot);
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.startsWith("SELECTION_CAPTURE_FAILED:")) throw error;
      throw new Error(
        `SELECTION_CAPTURE_FAILED: Could not simulate copy shortcut. ${msg}`,
      );
    }

    // Poll until the clipboard content changes from sentinel (max ~1 second)
    const POLL_INTERVAL_MS = 30;
    const MAX_WAIT_MS = Math.max(options.delayMs, 800);
    let captured = "";
    let elapsed = 0;
    while (elapsed < MAX_WAIT_MS) {
      await sleep(POLL_INTERVAL_MS);
      elapsed += POLL_INTERVAL_MS;
      const text = clipboard.readText();
      if (text !== SENTINEL) {
        captured = text;
        break;
      }
    }

    if (options.restoreClipboard) {
      try {
        this.clipboardService.restore(snapshot);
      } catch (restoreError: unknown) {
        // Non-fatal: log but don't fail the translate flow
        console.warn(
          "[SelectionCapture] Clipboard restore failed:",
          restoreError,
        );
      }
    }

    if (!captured || captured.trim() === "") {
      throw new Error(
        "SELECTION_CAPTURE_FAILED: Could not get the selected text. " +
          "Please select text first, then press the shortcut.",
      );
    }

    return captured;
  }
}

let captureService: SelectionCaptureService | null = null;

export function getSelectionCaptureService(): SelectionCaptureService {
  if (!captureService) captureService = new SelectionCaptureService();
  return captureService;
}
