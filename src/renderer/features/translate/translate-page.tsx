import React, { useCallback, useEffect, useState } from "react";
import { ArrowLeftRight, Copy, Languages, Loader2 } from "lucide-react";
import { useHotkeys } from "@tanstack/react-hotkeys";
import { Button } from "../../../components/ui/button";
import { Textarea } from "../../../components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import { Separator } from "../../../components/ui/separator";
import { Kbd, KbdGroup } from "../../../components/ui/kbd";
import { cn } from "../../../lib/utils";
import { useTranslate } from "./use-translate";
import { useSettings } from "../settings/use-settings";
import { showError } from "../../lib/toast";
import { bridge } from "../../lib/bridge";
import { formatAcceleratorParts } from "../../lib/format-shortcut";
import type { ManualDirection, TranslateSource } from "../../../shared/types";
import { isOk, isErr } from "../../../shared/types";

function directionLabel(dir: ManualDirection): {
  source: string;
  target: string;
} {
  return dir === "vi-en"
    ? { source: "Vietnamese", target: "English" }
    : { source: "English", target: "Vietnamese" };
}

const swapHotkeyParts = formatAcceleratorParts("CommandOrControl+Shift+S");
const swapHotkeyTitle = swapHotkeyParts.join("+");

export function TranslatePage() {
  const { data: settings } = useSettings();
  const [direction, setDirection] = useState<ManualDirection>(
    settings?.manualDirection ?? "vi-en",
  );
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [showCopiedTip, setShowCopiedTip] = useState(false);

  const { mutateAsync: translate, isPending } = useTranslate();

  const labels = directionLabel(direction);

  async function handleTranslate() {
    if (!input.trim()) {
      showError("Please enter some text to translate");
      return;
    }
    const result = await translate({
      source: (direction === "vi-en" ? "vi" : "en") as TranslateSource,
      target: direction === "vi-en" ? "en" : "vi",
      text: input,
    });
    if (isOk(result)) {
      setOutput(result.data.translation);
    } else if (isErr(result)) {
      showError(result.error.message);
    }
  }

  const handleSwap = useCallback(() => {
    setDirection((d) => (d === "vi-en" ? "en-vi" : "vi-en"));
    setOutput("");
  }, []);

  useEffect(() => {
    setShowCopiedTip(false);
  }, [output]);

  useHotkeys([{ hotkey: "Mod+Shift+S", callback: () => handleSwap() }]);

  function handleCopy() {
    if (!output) return;
    void navigator.clipboard.writeText(output).then(
      () => {
        setShowCopiedTip(true);
        window.setTimeout(() => setShowCopiedTip(false), 1500);
      },
      () => showError("Could not copy to clipboard"),
    );
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      void handleTranslate();
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Scroll: entire translate UI so nothing is clipped at the window edge */}
      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-3 py-2 sm:px-4 sm:py-3">
        <div className="mx-auto flex w-full max-w-xl flex-col gap-2.5 pb-4">
          {/* Compact language bar — one row */}
          <div className="flex items-center gap-2 rounded-lg border border-border/80 bg-muted/25 px-2 py-1.5">
            <div className="min-w-0 flex-1">
              <p className="text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
                From
              </p>
              <p className="truncate text-xs font-semibold leading-tight">
                {labels.source}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-8 shrink-0 rounded-full"
              onClick={handleSwap}
              title={`Swap languages (${swapHotkeyTitle})`}
            >
              <ArrowLeftRight className="size-3.5" />
            </Button>
            <div className="min-w-0 flex-1 text-right">
              <p className="text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
                To
              </p>
              <p className="truncate text-xs font-semibold leading-tight">
                {labels.target}
              </p>
            </div>
          </div>

          <p className="flex flex-wrap items-center justify-center gap-1 text-[10px] text-muted-foreground">
            <span>Quick swap</span>
            <KbdGroup>
              {swapHotkeyParts.map((p, i) => (
                <React.Fragment key={i}>
                  {i > 0 && <span className="text-muted-foreground/70">+</span>}
                  <Kbd className="font-mono text-[10px]">{p}</Kbd>
                </React.Fragment>
              ))}
            </KbdGroup>
          </p>

          <Card className="gap-0 py-0 shadow-sm">
            <CardHeader className="space-y-0 px-3 py-2 pb-1.5">
              <CardTitle className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Input
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5 px-3 pb-2.5 pt-0">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Paste ${labels.source} text…`}
                className="min-h-[72px] max-h-[min(28vh,180px)] resize-y font-mono text-xs leading-relaxed"
              />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="inline-flex max-w-[min(100%,14rem)] flex-wrap items-center gap-x-1 gap-y-0.5 text-[10px] text-muted-foreground sm:max-w-none">
                  <span>{input.length} chars</span>
                  <span className="text-muted-foreground/60">·</span>
                  <KbdGroup className="inline-flex flex-wrap">
                    {swapHotkeyParts.map((p, i) => (
                      <React.Fragment key={i}>
                        {i > 0 && (
                          <span className="text-muted-foreground/70">+</span>
                        )}
                        <Kbd className="font-mono text-[9px]">{p}</Kbd>
                      </React.Fragment>
                    ))}
                  </KbdGroup>
                  <span>swap</span>
                  <span className="text-muted-foreground/60">·</span>
                  <KbdGroup>
                    <Kbd className="text-[9px]">
                      {bridge.runtime.platform === "darwin" ? "⌘" : "Ctrl"}
                    </Kbd>
                    <span className="text-muted-foreground/70">+</span>
                    <Kbd className="text-[9px]">Enter</Kbd>
                  </KbdGroup>
                </span>
                <Button
                  size="sm"
                  className="h-8 shrink-0 text-xs"
                  onClick={() => void handleTranslate()}
                  disabled={isPending || !input.trim()}
                >
                  {isPending ? (
                    <Loader2
                      data-icon="inline-start"
                      className="animate-spin"
                    />
                  ) : (
                    <Languages data-icon="inline-start" />
                  )}
                  {isPending ? "…" : "Translate"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Separator className="my-0" />

          <Card className="gap-0 py-0 shadow-sm">
            <CardHeader className="space-y-0 px-3 py-2 pb-1.5">
              <CardTitle className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Translation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5 px-3 pb-2.5 pt-0">
              <div className="relative min-h-[72px] max-h-[min(28vh,180px)]">
                <Textarea
                  readOnly
                  value={output}
                  placeholder="Translation appears here…"
                  disabled={isPending}
                  className={cn(
                    "min-h-[72px] max-h-[min(28vh,180px)] resize-y font-mono text-xs leading-relaxed bg-muted/30",
                    isPending && "text-muted-foreground/40",
                  )}
                />
                {isPending && (
                  <div
                    className="pointer-events-none absolute inset-0 flex items-center justify-center gap-2 rounded-md border border-transparent bg-background/80 text-xs text-muted-foreground backdrop-blur-[2px]"
                    aria-live="polite"
                    aria-busy="true"
                  >
                    <Loader2 className="size-3.5 shrink-0 animate-spin text-primary" />
                    <span className="font-medium">Translating…</span>
                  </div>
                )}
              </div>
              <div className="flex justify-end">
                <div className="relative">
                  {showCopiedTip && (
                    <span
                      role="status"
                      className="absolute bottom-full right-0 mb-1 rounded-md bg-foreground px-2 py-1 text-[10px] font-medium text-background shadow-md animate-in fade-in-0 zoom-in-95"
                    >
                      Copied
                    </span>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={handleCopy}
                    disabled={!output}
                    aria-label="Copy translation to clipboard"
                  >
                    <Copy data-icon="inline-start" />
                    Copy
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
