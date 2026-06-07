import React, { useState } from "react";
import {
  Check,
  Copy,
  RotateCcw,
  Trash2,
  Wand2,
  X,
} from "lucide-react";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Skeleton } from "../../../components/ui/skeleton";
import { Separator } from "../../../components/ui/separator";
import { bridge } from "../../lib/bridge";
import { showError } from "../../lib/toast";
import { useHistory } from "./use-history";
import type { HistoryItem } from "../../../shared/types";

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function CopyButton({ text }: { text: string }) {
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
          <Check className="size-3 text-emerald-500" />
          <span className="text-[10px] text-emerald-500 leading-none">
            Copied
          </span>
        </>
      ) : (
        <Copy className="size-3" />
      )}
    </button>
  );
}

function HistoryCard({
  item,
  onDelete,
}: {
  item: HistoryItem;
  onDelete: (id: number) => void;
}) {
  return (
    <div className="rounded-lg border bg-card text-card-foreground p-3 flex flex-col gap-2">
      {/* Header row */}
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 gap-1 h-4.5">
          <Wand2 className="size-2.5" />
          Improve
        </Badge>

        <span className="ml-auto text-[10px] text-muted-foreground shrink-0">
          {formatTime(item.createdAt)}
        </span>

        <button
          onClick={() => onDelete(item.id)}
          className="shrink-0 text-muted-foreground/40 hover:text-destructive transition-colors"
          title="Delete this entry"
        >
          <X className="size-3" />
        </button>
      </div>

      {/* Input */}
      <div className="flex items-start gap-1.5 group">
        <p className="flex-1 text-xs text-muted-foreground line-clamp-3 leading-relaxed">
          {item.input}
        </p>
        <CopyButton text={item.input} />
      </div>

      <Separator />

      {/* Output */}
      <div className="flex items-start gap-1.5 group">
        <p className="flex-1 text-xs leading-relaxed line-clamp-4">
          {item.output}
        </p>
        <CopyButton text={item.output} />
      </div>

      {/* output2 (improve suggestion) */}
      {item.output2 && (
        <>
          <Separator />
          <div className="flex items-start gap-1.5 group">
            <p className="flex-1 text-xs text-muted-foreground italic leading-relaxed line-clamp-3">
              {item.output2}
            </p>
            <CopyButton text={item.output2} />
          </div>
        </>
      )}

      {/* Provider */}
      {item.provider && (
        <p className="text-[10px] text-muted-foreground/60 mt-0.5">
          {item.provider}
        </p>
      )}
    </div>
  );
}

export function HistoryPage() {
  const { items, isLoading, refetch, clear, isClearPending, deleteItem } =
    useHistory({ type: "improve" });

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Toolbar */}
      <div className="shrink-0 flex items-center gap-2 px-4 py-2.5 border-b">
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Wand2 className="size-3.5" />
          <span>Improve History</span>
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={() => void refetch()}
            title="Refresh"
          >
            <RotateCcw className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-7 text-destructive hover:text-destructive"
            onClick={() => clear()}
            disabled={isClearPending || items.length === 0}
            title="Clear all history"
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3">
        {isLoading ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full rounded-lg" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
            <p className="text-sm">No history yet</p>
            <p className="text-xs">
              Improve some text to see records here
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {items.map((item) => (
              <HistoryCard key={item.id} item={item} onDelete={deleteItem} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
