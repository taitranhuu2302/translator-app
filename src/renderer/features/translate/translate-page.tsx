import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowLeftRight,
  Copy,
  Languages,
  Loader2,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useHotkeys } from "@tanstack/react-hotkeys";
import { Button } from "../../../components/ui/button";
import { Textarea } from "../../../components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";
import { Kbd, KbdGroup } from "../../../components/ui/kbd";
import { Separator } from "../../../components/ui/separator";
import { cn } from "../../../lib/utils";
import { useTranslate } from "./use-translate";
import { useSettings } from "../settings/use-settings";
import { showError } from "../../lib/toast";
import { bridge } from "../../lib/bridge";
import { formatAcceleratorParts } from "../../lib/format-shortcut";
import { useTTS } from "../../lib/use-speech";
import type {
  LanguageCode,
  ManualDirection,
  TranslateSource,
  TranslationDetails,
} from "../../../shared/types";
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

const VI_MARK_REGEX =
  /[ăâđêôơưáàảãạấầẩẫậắằẳẵặéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ]/i;
const WORD_REGEX = /[A-Za-zÀ-ỹ]+/g;
const VI_WORDS = new Set([
  "toi",
  "tôi",
  "ban",
  "bạn",
  "la",
  "là",
  "mot",
  "một",
  "va",
  "và",
  "khong",
  "không",
  "cho",
  "vui",
  "xin",
  "cam",
  "ơn",
  "duoc",
  "được",
  "nhu",
  "như",
]);
const EN_WORDS = new Set([
  "the",
  "and",
  "is",
  "are",
  "you",
  "your",
  "this",
  "that",
  "for",
  "with",
  "please",
  "thanks",
  "hello",
  "hi",
]);

type DetectedLanguage = "vi" | "en" | "mixed" | "empty";
type TranslationMode = "manual" | "auto";

function detectLanguage(text: string): DetectedLanguage {
  const trimmed = text.trim();
  if (!trimmed) return "empty";

  const hasVietnameseMarks = VI_MARK_REGEX.test(trimmed);
  const words = trimmed.toLowerCase().match(WORD_REGEX) ?? [];

  let viHits = hasVietnameseMarks ? 1 : 0;
  let enHits = 0;

  for (const word of words) {
    if (VI_WORDS.has(word)) viHits += 1;
    if (EN_WORDS.has(word)) enHits += 1;
  }

  if (hasVietnameseMarks && enHits > 0) return "mixed";
  if (viHits > 0 && enHits > 0) return "mixed";
  if (viHits > 0) return "vi";
  return "en";
}

function resolveTranslationPlan(text: string): {
  detected: DetectedLanguage;
  source: TranslateSource;
  target: LanguageCode;
} {
  const detected = detectLanguage(text);

  if (detected === "vi") {
    return { detected, source: "vi", target: "en" };
  }

  if (detected === "en") {
    return { detected, source: "en", target: "vi" };
  }

  if (detected === "mixed") {
    return { detected, source: "auto", target: "en" };
  }

  return { detected, source: "auto", target: "en" };
}

function detectedLabel(detected: DetectedLanguage): string {
  if (detected === "vi") return "Vietnamese";
  if (detected === "en") return "English";
  if (detected === "mixed") return "Mixed (VI + EN)";
  return "Waiting for input";
}

function languageLabel(lang: LanguageCode): string {
  return lang === "vi" ? "Vietnamese" : "English";
}

function formatConfidence(confidence?: number): string | null {
  if (typeof confidence !== "number" || Number.isNaN(confidence)) return null;
  return `${Math.round(confidence * 100)}%`;
}

export function TranslatePage() {
  const { data: settings } = useSettings();
  const [mode, setMode] = useState<TranslationMode>("manual");
  const [direction, setDirection] = useState<ManualDirection>("vi-en");
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [outputLang, setOutputLang] = useState<LanguageCode>("en");
  const [details, setDetails] = useState<TranslationDetails | null>(null);
  const [showCopiedTip, setShowCopiedTip] = useState(false);

  const { mutateAsync: translate, isPending } = useTranslate();

  const ttsInput = useTTS();
  const ttsOutput = useTTS();
  // TODO: STT (Speech-to-Text) via Web Speech API is temporarily disabled.
  // SpeechRecognition audio upload causes ERR_FAILED (-2) in Electron due to
  // Chromium permission pipe issues. Re-enable useSTT() once resolved.
  // const stt = useSTT((transcript) => {
  //   setInput((prev) => (prev ? prev + ' ' + transcript : transcript));
  // });

  useEffect(() => {
    if (settings?.manualDirection) {
      setDirection(settings.manualDirection);
    }
  }, [settings?.manualDirection]);

  const plan = useMemo(() => resolveTranslationPlan(input), [input]);
  const manualLabels = directionLabel(direction);

  const activeSourceLabel =
    mode === "manual" ? manualLabels.source : "Auto detect (VI/EN)";
  const activeTargetLabel =
    mode === "manual" ? manualLabels.target : languageLabel(plan.target);

  async function handleTranslate() {
    if (!input.trim()) {
      showError("Please enter some text to translate");
      return;
    }

    const source: TranslateSource =
      mode === "manual" ? (direction === "vi-en" ? "vi" : "en") : plan.source;
    const target: LanguageCode =
      mode === "manual" ? (direction === "vi-en" ? "en" : "vi") : plan.target;

    const result = await translate({ source, target, text: input });

    if (isOk(result)) {
      setOutput(result.data.translation);
      setOutputLang(target);
      setDetails(result.data.details ?? null);
    } else if (isErr(result)) {
      setDetails(null);
      showError(result.error.message);
    }
  }

  function handleSwap() {
    if (mode !== "manual") return;

    const prevInput = input;
    const prevOutput = output;

    setDirection((d) => (d === "vi-en" ? "en-vi" : "vi-en"));
    if (prevOutput.trim()) {
      setInput(prevOutput);
      setOutput(prevInput);
    } else {
      setInput(prevInput);
      setOutput("");
    }

    setDetails(null);
    ttsInput.stop();
    ttsOutput.stop();
  }

  useEffect(() => {
    setShowCopiedTip(false);
  }, [output]);

  useHotkeys([
    {
      hotkey: "Mod+Shift+S",
      callback: () => {
        if (mode === "manual") handleSwap();
      },
    },
  ]);

  async function handleCopy() {
    if (!output) return;
    try {
      await bridge.clipboard.writeText(output);
      setShowCopiedTip(true);
      window.setTimeout(() => setShowCopiedTip(false), 1500);
    } catch {
      showError("Could not copy to clipboard");
    }
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
          <div className="grid grid-cols-2 gap-1.5 rounded-lg border border-border/80 bg-muted/25 p-1">
            <Button
              type="button"
              size="sm"
              variant={mode === "manual" ? "default" : "ghost"}
              className="h-7 text-xs"
              onClick={() => setMode("manual")}
            >
              Manual
            </Button>
            <Button
              type="button"
              size="sm"
              variant={mode === "auto" ? "default" : "ghost"}
              className="h-7 text-xs"
              onClick={() => setMode("auto")}
            >
              Auto Detect
            </Button>
          </div>

          {/* Compact language bar — one row */}
          <div className="flex items-center gap-2 rounded-lg border border-border/80 bg-muted/25 px-2 py-1.5">
            <div className="min-w-0 flex-1">
              <p className="text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
                From
              </p>
              <p className="truncate text-xs font-semibold leading-tight">
                {activeSourceLabel}
              </p>
            </div>
            {mode === "manual" ? (
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
            ) : (
              <Badge
                variant="outline"
                className="h-6 shrink-0 px-2 text-[10px]"
              >
                {detectedLabel(plan.detected)}
              </Badge>
            )}
            <div className="min-w-0 flex-1 text-right">
              <p className="text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
                To
              </p>
              <p className="truncate text-xs font-semibold leading-tight">
                {activeTargetLabel}
              </p>
            </div>
          </div>

          {mode === "manual" && (
            <div className="flex flex-wrap items-center justify-center gap-1 text-[10px] text-muted-foreground">
              <span>Quick swap</span>
              <KbdGroup>
                {swapHotkeyParts.map((p, i) => (
                  <React.Fragment key={i}>
                    {i > 0 && (
                      <span className="text-muted-foreground/70">+</span>
                    )}
                    <Kbd className="font-mono text-[10px]">{p}</Kbd>
                  </React.Fragment>
                ))}
              </KbdGroup>
            </div>
          )}

          <Card className="gap-0 py-0 shadow-sm">
            <CardHeader className="space-y-0 px-3 py-2 pb-1.5">
              <CardTitle className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Input
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5 px-3 pb-2.5 pt-0">
              <div className="relative min-h-18 max-h-[min(28vh,180px)]">
                <Textarea
                  autoFocus
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    mode === "manual"
                      ? `Paste ${manualLabels.source} text…`
                      : "Paste Vietnamese or English text…"
                  }
                  className="min-h-18 max-h-[min(28vh,180px)] resize-y pb-10 pr-26 font-mono text-xs leading-relaxed"
                />
                <div className="absolute bottom-2 right-2 flex items-center gap-1.5">
                  <Button
                    type="button"
                    size="icon"
                    variant="secondary"
                    className="size-8"
                    onClick={() =>
                      ttsInput.speaking
                        ? ttsInput.stop()
                        : ttsInput.speak(
                            input,
                            mode === "manual"
                              ? direction === "vi-en"
                                ? "vi"
                                : "en"
                              : plan.detected === "vi"
                                ? "vi"
                                : "en",
                          )
                    }
                    disabled={!input.trim()}
                    aria-label={
                      ttsInput.speaking ? "Stop speaking" : "Read input aloud"
                    }
                    title={
                      ttsInput.speaking ? "Stop speaking" : "Read input aloud"
                    }
                  >
                    {ttsInput.speaking ? (
                      <VolumeX className="size-3.5" />
                    ) : (
                      <Volume2 className="size-3.5" />
                    )}
                  </Button>
                  <Button
                    size="icon"
                    variant="default"
                    className="size-8"
                    onClick={() => void handleTranslate()}
                    disabled={isPending || !input.trim()}
                    aria-label="Translate"
                    title="Translate"
                  >
                    {isPending ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Languages className="size-3.5" />
                    )}
                  </Button>
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="inline-flex max-w-[min(100%,14rem)] flex-wrap items-center gap-x-1 gap-y-0.5 text-[10px] text-muted-foreground sm:max-w-none">
                  <span>{input.length} chars</span>
                  <span className="text-muted-foreground/60">·</span>
                  {mode === "manual" ? (
                    <>
                      <KbdGroup className="inline-flex flex-wrap">
                        {swapHotkeyParts.map((p, i) => (
                          <React.Fragment key={i}>
                            {i > 0 && (
                              <span className="text-muted-foreground/70">
                                +
                              </span>
                            )}
                            <Kbd className="font-mono text-[9px]">{p}</Kbd>
                          </React.Fragment>
                        ))}
                      </KbdGroup>
                      <span>swap</span>
                    </>
                  ) : (
                    <span>{detectedLabel(plan.detected)}</span>
                  )}
                  <span className="text-muted-foreground/60">·</span>
                  <KbdGroup>
                    <Kbd className="text-[9px]">
                      {bridge.runtime.platform === "darwin" ? "⌘" : "Ctrl"}
                    </Kbd>
                    <span className="text-muted-foreground/70">+</span>
                    <Kbd className="text-[9px]">Enter</Kbd>
                  </KbdGroup>
                </div>
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
              <div className="relative min-h-18 max-h-[min(28vh,180px)]">
                <Textarea
                  readOnly
                  value={output}
                  placeholder="Translation appears here…"
                  disabled={isPending}
                  className={cn(
                    "min-h-18 max-h-[min(28vh,180px)] resize-y bg-muted/30 pb-10 pr-18 font-mono text-xs leading-relaxed",
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
                <div className="absolute bottom-2 right-2 flex items-center gap-1">
                  {showCopiedTip && (
                    <span
                      role="status"
                      className="absolute bottom-full right-0 mb-1 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-[10px] font-medium text-background shadow-md animate-in fade-in-0 zoom-in-95"
                    >
                      Copied
                    </span>
                  )}
                  <Button
                    type="button"
                    size="icon"
                    variant="secondary"
                    className="size-8"
                    onClick={() =>
                      ttsOutput.speaking
                        ? ttsOutput.stop()
                        : ttsOutput.speak(output, outputLang)
                    }
                    disabled={!output}
                    aria-label={
                      ttsOutput.speaking
                        ? "Stop speaking"
                        : "Read translation aloud"
                    }
                    title={
                      ttsOutput.speaking
                        ? "Stop speaking"
                        : "Read translation aloud"
                    }
                  >
                    {ttsOutput.speaking ? (
                      <VolumeX className="size-3.5" />
                    ) : (
                      <Volume2 className="size-3.5" />
                    )}
                  </Button>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="size-8"
                    onClick={handleCopy}
                    disabled={!output}
                    aria-label="Copy translation to clipboard"
                    title="Copy translation"
                  >
                    <Copy className="size-3.5" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {details && (
            <Card className="gap-0 border-dashed py-0 shadow-sm">
              <CardHeader className="space-y-0 px-3 py-2 pb-1.5">
                <CardTitle className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Word Insights
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 px-3 pb-3 pt-0 text-xs">
                {(details.pronunciation || details.detectedSource) && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    {details.detectedSource && (
                      <Badge variant="outline">
                        Detected: {details.detectedSource}
                      </Badge>
                    )}
                    {formatConfidence(details.confidence) && (
                      <Badge variant="outline">
                        Confidence: {formatConfidence(details.confidence)}
                      </Badge>
                    )}
                    {details.pronunciation && (
                      <Badge variant="secondary">
                        /{details.pronunciation}/
                      </Badge>
                    )}
                  </div>
                )}

                {details.correctedText && (
                  <p className="rounded-md border border-border/70 bg-muted/20 px-2 py-1.5 leading-relaxed">
                    Suggested source text:{" "}
                    <strong>{details.correctedText}</strong>
                  </p>
                )}

                {details.alternatives.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      Alternatives
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {details.alternatives.map((item) => (
                        <Badge key={item} variant="outline">
                          {item}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {details.lexicalGroups.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      Lexical Meanings
                    </p>
                    {details.lexicalGroups.slice(0, 2).map((group) => (
                      <div
                        key={`${group.partOfSpeech}-${group.base}`}
                        className="rounded-md border border-border/70 bg-muted/20 px-2 py-1.5"
                      >
                        <p className="font-semibold">
                          {group.partOfSpeech}
                          {group.base ? ` • ${group.base}` : ""}
                        </p>
                        {group.entries.length > 0 && (
                          <div className="mt-1 space-y-0.5">
                            {group.entries.slice(0, 4).map((entry) => (
                              <p key={entry.term} className="leading-relaxed">
                                <span className="font-medium">
                                  {entry.term}:
                                </span>{" "}
                                {entry.meanings.join(", ")}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {details.definitionGroups.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      Definitions
                    </p>
                    {details.definitionGroups.slice(0, 1).map((group) => (
                      <div
                        key={`${group.partOfSpeech}-${group.base}`}
                        className="rounded-md border border-border/70 bg-muted/20 px-2 py-1.5"
                      >
                        <p className="font-semibold">{group.partOfSpeech}</p>
                        <div className="mt-1 space-y-1">
                          {group.items.slice(0, 3).map((item) => (
                            <p
                              key={`${item.definition}-${item.example ?? ""}`}
                              className="leading-relaxed"
                            >
                              {item.definition}
                              {item.example ? ` (e.g. ${item.example})` : ""}
                            </p>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
