import React, { useState } from "react";
import {
  Bot,
  Check,
  Copy,
  History,
  Languages,
  Loader2,
  PanelRightOpen,
  PanelRightClose,
  Sparkles,
  Volume2,
  VolumeX,
  Wand2,
  X,
} from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Textarea } from "../../../components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";
import { Separator } from "../../../components/ui/separator";
import { cn } from "../../../lib/utils";
import { useImprove } from "./use-improve";
import { useSettings } from "../settings/use-settings";
import { bridge } from "../../lib/bridge";
import { showError } from "../../lib/toast";
import { useTTS } from "../../lib/use-speech";
import { useHistory } from "../history/use-history";
import { isOk, isErr } from "../../../shared/types";
import type { ImproveResult, HistoryItem } from "../../../shared/types";

// ─── Result card ─────────────────────────────────────────────────────────────

function ResultCard({
  label,
  icon: Icon,
  text,
  outputLang,
  badgeLabel,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  text: string;
  outputLang: string;
  badgeLabel?: string;
}) {
  const tts = useTTS();
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await bridge.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      showError("Could not copy");
    }
  }

  return (
    <Card className="gap-0 py-0 shadow-sm">
      <CardHeader className="flex-row items-center justify-between gap-2 px-3 py-2">
        <div className="flex items-center gap-1.5">
          <Icon className="size-3.5 text-muted-foreground" />
          <CardTitle className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </CardTitle>
          {badgeLabel && (
            <Badge variant="secondary" className="text-[9px] py-0 h-4">
              {badgeLabel}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-0.5">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-6"
            onClick={() =>
              tts.speaking ? tts.stop() : tts.speak(text, outputLang)
            }
            aria-label={tts.speaking ? "Stop" : "Read aloud"}
          >
            {tts.speaking ? (
              <VolumeX className="size-3" />
            ) : (
              <Volume2 className="size-3" />
            )}
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-6"
            onClick={handleCopy}
            aria-label="Copy"
          >
            {copied ? (
              <Check className="size-3 text-emerald-500" />
            ) : (
              <Copy className="size-3" />
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="px-3 pb-3 pt-0">
        <p className="select-text text-sm leading-relaxed">{text}</p>
      </CardContent>
    </Card>
  );
}

// ─── Provider badge ───────────────────────────────────────────────────────────

function ProviderBadge({ result }: { result: ImproveResult }) {
  const label =
    result.provider === "groq"
      ? `Groq · ${result.model}`
      : `Gemini · ${result.model}`;
  return (
    <div className="flex items-center justify-end gap-1 text-[10px] text-muted-foreground">
      <Bot className="size-3" />
      <span>{label}</span>
    </div>
  );
}
// ─── History sidebar ─────────────────────────────────────────────────

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function SidebarCopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  async function handleCopy() {
    try {
      await bridge.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      showError("Could not copy");
    }
  }
  return (
    <button
      onClick={handleCopy}
      className="opacity-0 group-hover:opacity-100 shrink-0 flex items-center gap-0.5 text-muted-foreground hover:text-foreground transition-opacity"
      title={copied ? "Copied!" : "Copy"}
    >
      {copied ? (
        <>
          <Check className="size-2.5 text-emerald-500" />
          <span className="text-[9px] text-emerald-500 leading-none">
            Copied
          </span>
        </>
      ) : (
        <Copy className="size-2.5" />
      )}
    </button>
  );
}

function SidebarHistoryItem({
  item,
  onDelete,
}: {
  item: HistoryItem;
  onDelete: (id: number) => void;
}) {
  return (
    <div className="rounded-md border bg-muted/30 p-2 flex flex-col gap-1.5 text-[11px]">
      <div className="flex items-center gap-1.5">
        <span className="text-muted-foreground/60 text-[10px]">
          {formatTime(item.createdAt)}
        </span>
        <button
          onClick={() => onDelete(item.id)}
          className="ml-auto shrink-0 text-muted-foreground/30 hover:text-destructive transition-colors"
          title="Delete"
        >
          <X className="size-2.5" />
        </button>
      </div>
      <div className="flex items-start gap-1 group">
        <p className="flex-1 text-muted-foreground line-clamp-2 leading-relaxed">
          {item.input}
        </p>
        <SidebarCopyButton text={item.input} />
      </div>
      <Separator className="my-0" />
      <div className="flex items-start gap-1 group">
        <p className="flex-1 line-clamp-3 leading-relaxed">{item.output}</p>
        <SidebarCopyButton text={item.output} />
      </div>
      {item.output2 && (
        <>
          <Separator className="my-0" />
          <div className="flex items-start gap-1 group">
            <p className="flex-1 text-muted-foreground italic line-clamp-2 leading-relaxed">
              {item.output2}
            </p>
            <SidebarCopyButton text={item.output2} />
          </div>
        </>
      )}
    </div>
  );
}

function HistorySidebar({ onClose }: { onClose: () => void }) {
  const { items, isLoading, deleteItem } = useHistory({
    type: "improve",
    limit: 50,
  });

  return (
    <aside className="flex flex-col border-l bg-background w-64 shrink-0">
      {/* Header */}
      <div className="shrink-0 flex items-center gap-2 px-3 py-2.5 border-b">
        <History className="size-3.5 text-muted-foreground" />
        <span className="text-xs font-medium flex-1">Recent Improve</span>
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground transition-colors"
          title="Close"
        >
          <PanelRightClose className="size-3.5" />
        </button>
      </div>

      {/* Items */}
      <div className="flex-1 min-h-0 overflow-y-auto p-2 flex flex-col gap-2">
        {isLoading ? (
          <p className="text-xs text-muted-foreground text-center pt-4">
            Loading…
          </p>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-1.5 text-muted-foreground px-2 text-center">
            <Languages className="size-5 opacity-30" />
            <p className="text-xs">No improve history yet</p>
          </div>
        ) : (
          items.map((item) => (
            <SidebarHistoryItem
              key={item.id}
              item={item}
              onDelete={deleteItem}
            />
          ))
        )}
      </div>
    </aside>
  );
}
// ─── Page ────────────────────────────────────────────────────────────────────

export function ImprovePage() {
  const { data: settings } = useSettings();
  const { mutateAsync: improve, isPending } = useImprove();
  const [input, setInput] = useState("");
  const [result, setResult] = useState<ImproveResult | null>(null);
  const [showSidebar, setShowSidebar] = useState(false);

  const outputLang = settings?.improveOutputLang ?? "en";

  async function handleImprove() {
    if (!input.trim()) {
      showError("Please enter some text to improve");
      return;
    }
    const res = await improve({ text: input, outputLang });
    if (isOk(res)) {
      setResult(res.data);
    } else if (isErr(res)) {
      showError(res.error.message);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      void handleImprove();
    }
  }

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      {/* Main content */}
      <div className="flex min-h-0 flex-1 flex-col">
        {/* Toolbar row: history toggle */}
        <div className="shrink-0 flex items-center justify-end px-3 pt-2 pb-0">
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={() => setShowSidebar((s) => !s)}
            title={showSidebar ? "Hide history" : "Show history"}
          >
            {showSidebar ? (
              <PanelRightClose className="size-3.5" />
            ) : (
              <PanelRightOpen className="size-3.5" />
            )}
          </Button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-2 sm:px-4 sm:py-3">
          <div className="mx-auto flex w-full max-w-xl flex-col gap-3 pb-4">
            {/* Input */}
            <Card className="gap-0 py-0 shadow-sm">
              <CardHeader className="space-y-0 px-3 py-2 pb-1.5">
                <CardTitle className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Input
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 px-3 pb-3 pt-0">
                <Textarea
                  autoFocus
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type or paste a sentence to correct and improve…"
                  className="min-h-18 max-h-[min(28vh,180px)] resize-y font-mono text-xs leading-relaxed"
                />
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] text-muted-foreground">
                    {input.length} chars · Output:{" "}
                    <span className="font-medium">
                      {outputLang === "vi" ? "Vietnamese" : "English"}
                    </span>{" "}
                    · change in Settings → Translation
                  </span>
                  <Button
                    size="sm"
                    className="h-8 shrink-0 text-xs"
                    onClick={() => void handleImprove()}
                    disabled={isPending || !input.trim()}
                  >
                    {isPending ? (
                      <Loader2
                        data-icon="inline-start"
                        className="animate-spin"
                      />
                    ) : (
                      <Wand2 data-icon="inline-start" />
                    )}
                    {isPending ? "Improving…" : "Improve"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Results */}
            {isPending && (
              <div className="flex flex-col items-center justify-center gap-2 py-8 text-muted-foreground">
                <Loader2 className="size-5 animate-spin text-primary" />
                <span className="text-xs">Asking AI…</span>
              </div>
            )}

            {!isPending && result && (
              <>
                <Separator className="my-0" />
                <ResultCard
                  label="Corrected"
                  icon={Check}
                  text={result.corrected}
                  outputLang={outputLang}
                />
                <ResultCard
                  label="Suggestion"
                  icon={Sparkles}
                  text={result.suggestion}
                  outputLang={outputLang}
                  badgeLabel="more elegant"
                />
                <ProviderBadge result={result} />
              </>
            )}

            {!isPending && !result && (
              <div
                className={cn(
                  "flex flex-1 items-center justify-center rounded-lg border border-dashed px-4 py-8",
                  "text-center text-[11px] leading-relaxed text-muted-foreground",
                )}
              >
                Enter a sentence above and click Improve.
                <br />
                The AI will return a corrected version and a more elegant
                alternative.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right history sidebar */}
      {showSidebar && <HistorySidebar onClose={() => setShowSidebar(false)} />}
    </div>
  );
}
