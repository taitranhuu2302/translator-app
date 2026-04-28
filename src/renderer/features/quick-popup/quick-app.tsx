import React, { useEffect, useState } from "react";
import { Copy, X, Loader2, AlertCircle, Volume2, VolumeX } from "lucide-react";
import { useHotkeys } from "@tanstack/react-hotkeys";
import { Button } from "../../../components/ui/button";
import { bridge } from "../../lib/bridge";
import { showError } from "../../lib/toast";
import { useQuickClose } from "./use-quick-popup";
import { useTTS } from "../../lib/use-speech";
import { useSettings } from "../settings/use-settings";
import type { QuickTranslatePayload } from "../../../shared/types";

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "result"; payload: QuickTranslatePayload }
  | { status: "error"; message: string };

export function QuickApp() {
  const [state, setState] = useState<State>({ status: "idle" });
  const [showCopiedTip, setShowCopiedTip] = useState(false);
  const [openPermissionPending, setOpenPermissionPending] = useState(false);
  const { mutate: close } = useQuickClose();
  const { data: settings } = useSettings();
  const tts = useTTS(
    settings
      ? {
          voiceURI: settings.ttsVoiceURI,
          rate: settings.ttsRate,
          pitch: settings.ttsPitch,
          volume: settings.ttsVolume,
        }
      : undefined,
  );

  useHotkeys([{ hotkey: "Escape", callback: () => handleClose() }]);

  useEffect(() => {
    const unsubLoading = bridge.quick.onLoading(() => {
      setState({ status: "loading" });
    });
    const unsubShow = bridge.quick.onShow((payload) => {
      setState({ status: "result", payload });
    });
    const unsubError = bridge.quick.onError((message) => {
      setState({ status: "error", message });
    });
    return () => {
      unsubLoading();
      unsubShow();
      unsubError();
    };
  }, []);

  useEffect(() => {
    if (state.status !== "result") {
      setShowCopiedTip(false);
      tts.stop();
    }
  }, [state.status]);

  async function handleCopy() {
    if (state.status !== "result") return;
    try {
      await bridge.clipboard.writeText(state.payload.translated);
      setShowCopiedTip(true);
      window.setTimeout(() => setShowCopiedTip(false), 1500);
    } catch {
      showError("Could not copy to clipboard");
    }
  }

  function handleClose() {
    close();
    setState({ status: "idle" });
  }

  function getMissingPermission(
    message: string,
  ): "accessibility" | "automation" | null {
    const lower = message.toLowerCase();
    if (lower.includes("accessibility")) return "accessibility";
    if (lower.includes("automation") || lower.includes("system events")) {
      return "automation";
    }
    return null;
  }

  async function handleOpenPermissionSettings() {
    if (state.status !== "error") return;
    const missing = getMissingPermission(state.message);
    if (!missing) return;
    setOpenPermissionPending(true);
    try {
      await bridge.macos.openPrivacySettings(missing);
    } catch {
      showError("Could not open macOS privacy settings");
    } finally {
      setOpenPermissionPending(false);
    }
  }

  const missingPermission =
    state.status === "error" ? getMissingPermission(state.message) : null;

  const dragStyle = { WebkitAppRegion: "drag" } as React.CSSProperties;
  const noDragStyle = { WebkitAppRegion: "no-drag" } as React.CSSProperties;

  return (
    <div className="flex flex-col h-full min-h-0 bg-background text-foreground select-none overflow-hidden">
      <div
        className="flex shrink-0 items-center justify-between gap-2 border-b bg-muted/40 px-2 py-1"
        style={dragStyle}
      >
        <span className="truncate pl-0.5 text-[10px] font-semibold tracking-wide text-muted-foreground">
          Translation
        </span>
        <div className="flex shrink-0 items-center" style={noDragStyle}>
          <Button
            size="icon"
            variant="ghost"
            className="size-7"
            onClick={handleClose}
            aria-label="Close"
          >
            <X className="size-3.5" />
          </Button>
        </div>
      </div>

      <div
        className="flex min-h-0 flex-1 flex-col overflow-hidden px-2 pb-2 pt-2"
        style={noDragStyle}
      >
        {state.status === "idle" && (
          <div className="flex flex-1 items-center justify-center px-1 text-center text-[11px] leading-relaxed text-muted-foreground">
            Select text in another app, then press the NextG Translate shortcut.
            Nothing to type here—only the translation appears after.
          </div>
        )}

        {state.status === "loading" && (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="size-5 animate-spin text-primary" />
            <span className="text-xs">Translating…</span>
          </div>
        )}

        {state.status === "error" && (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 overflow-y-auto py-1 text-center">
            <AlertCircle className="size-6 shrink-0 text-destructive" />
            <p className="px-1 text-xs leading-snug text-destructive">
              {state.message}
            </p>
            {bridge.runtime.platform === "darwin" && missingPermission && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 text-[10px]"
                onClick={() => void handleOpenPermissionSettings()}
                disabled={openPermissionPending}
              >
                {openPermissionPending
                  ? "Opening..."
                  : missingPermission === "accessibility"
                    ? "Open Accessibility Settings"
                    : "Open Automation Settings"}
              </Button>
            )}
            <p className="px-1 text-[10px] leading-snug text-muted-foreground">
              Select text in the app you’re using, then press the shortcut
              again. On macOS, enable Accessibility for this app (and Terminal
              if you run via npm).
            </p>
          </div>
        )}

        {state.status === "result" && (
          <div className="relative flex min-h-0 flex-1 flex-col gap-2">
            <p className="shrink-0 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              {state.payload.target === "en" ? "English" : "Vietnamese"}
            </p>
            {/* Plain text only — no textarea/input styling; bottom padding so text doesn’t sit under the copy icon */}
            <p
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-8 pr-1 select-text text-sm font-medium leading-relaxed whitespace-pre-wrap text-foreground"
              role="status"
              aria-live="polite"
            >
              {state.payload.translated}
            </p>
            <div className="pointer-events-none absolute bottom-0 right-0 flex flex-col items-end gap-1">
              {showCopiedTip && (
                <span
                  role="status"
                  className="pointer-events-none rounded-md bg-foreground px-2 py-1 text-[10px] font-medium text-background shadow-md animate-in fade-in-0 zoom-in-95"
                >
                  Copied
                </span>
              )}
              <div className="pointer-events-auto flex items-center gap-1">
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  className="size-7 shrink-0 shadow-sm"
                  onClick={() =>
                    tts.speaking
                      ? tts.stop()
                      : tts.speak(
                          state.status === "result"
                            ? state.payload.translated
                            : "",
                          state.status === "result"
                            ? state.payload.target
                            : "en",
                        )
                  }
                  aria-label={tts.speaking ? "Stop speaking" : "Read aloud"}
                >
                  {tts.speaking ? (
                    <VolumeX className="size-3.5" />
                  ) : (
                    <Volume2 className="size-3.5" />
                  )}
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  className="size-7 shrink-0 shadow-sm"
                  onClick={handleCopy}
                  aria-label="Copy translation"
                >
                  <Copy className="size-3.5" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
