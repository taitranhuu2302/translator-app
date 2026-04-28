import React, { useState } from "react";
import { Check, X, Loader2 } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Kbd, KbdGroup } from "../../../components/ui/kbd";
import { useValidateShortcut, useUpdateShortcut } from "./use-settings";
import { isErr } from "../../../shared/types";
import { formatAcceleratorParts } from "../../lib/format-shortcut";
import { bridge } from "../../lib/bridge";
interface ShortcutInputProps {
  label: string;
  settingKey:
    | "quickTranslateShortcut"
    | "quickTranslateReplaceShortcut"
    | "toggleAppShortcut"
    | "voiceTextShortcut";
  currentValue: string;
}

export function ShortcutInput({
  label,
  settingKey,
  currentValue,
}: ShortcutInputProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(currentValue);
  const [validationError, setValidationError] = useState<string | null>(null);

  const { mutate: validate, isPending: isValidating } = useValidateShortcut();
  const { mutate: update, isPending: isSaving } = useUpdateShortcut();

  function handleSave() {
    setValidationError(null);
    validate(draft, {
      onSuccess: (result) => {
        if (isErr(result)) {
          setValidationError(result.error.message);
          return;
        }
        update(
          { key: settingKey, value: draft },
          {
            onSuccess: (updateResult) => {
              if (updateResult.success) setEditing(false);
            },
          },
        );
      },
    });
  }

  function handleCancel() {
    setDraft(currentValue);
    setValidationError(null);
    setEditing(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") handleSave();
    if (e.key === "Escape") handleCancel();
  }

  const isPending = isValidating || isSaving;

  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm font-medium">{label}</span>
      {editing ? (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <Input
              autoFocus
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                setValidationError(null);
              }}
              onKeyDown={handleKeyDown}
              className="flex-1 h-9 font-mono"
              placeholder={
                bridge.runtime.platform === "darwin"
                  ? "e.g. Cmd+Alt+T"
                  : "e.g. Ctrl+Alt+T"
              }
            />
            <Button
              size="icon"
              variant="ghost"
              onClick={handleSave}
              disabled={isPending}
              title="Save"
            >
              {isPending ? (
                <Loader2 className="animate-spin size-4" />
              ) : (
                <Check className="size-4" />
              )}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={handleCancel}
              disabled={isPending}
              title="Cancel"
            >
              <X className="size-4" />
            </Button>
          </div>
          {validationError && (
            <span className="text-xs text-destructive">{validationError}</span>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-2 min-w-0">
          <KbdGroup className="flex-1 min-h-9 h-auto min-w-0 w-full flex-wrap gap-1 px-2.5 py-1.5 rounded-md border border-input bg-muted/40">
            {formatAcceleratorParts(currentValue).map((part, i) => (
              <React.Fragment key={i}>
                <Kbd key={i} className="font-mono text-xs">
                  {part}
                </Kbd>
                {i !== currentValue.split("+").length - 1 && (
                  <span
                    key={`plus-${i}`}
                    className="text-xs text-muted-foreground"
                  >
                    +
                  </span>
                )}
              </React.Fragment>
            ))}
          </KbdGroup>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setDraft(currentValue);
              setEditing(true);
            }}
          >
            Change
          </Button>
        </div>
      )}
    </div>
  );
}
