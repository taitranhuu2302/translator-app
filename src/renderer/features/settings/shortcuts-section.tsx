import React from "react";
import { RotateCcw } from "lucide-react";
import { Alert, AlertDescription } from "../../../components/ui/alert";
import { Button } from "../../../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import { Kbd, KbdGroup } from "../../../components/ui/kbd";
import { Separator } from "../../../components/ui/separator";
import { ShortcutInput } from "./shortcut-input";
import { useSettings, useResetShortcuts } from "./use-settings";
import { bridge } from "../../lib/bridge";
import { formatAcceleratorParts } from "../../lib/format-shortcut";

export function ShortcutsSection() {
  const { data: settings } = useSettings();
  const { mutate: resetShortcuts, isPending: isResetting } =
    useResetShortcuts();
  if (!settings) return null;

  const swapHotkeyParts = formatAcceleratorParts("CommandOrControl+Shift+S");

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader className="flex-row items-start justify-between gap-2 pb-2">
          <div className="space-y-1">
            <CardTitle className="text-sm">Global Shortcuts</CardTitle>
            <CardDescription className="text-xs">
              System-level shortcuts active anywhere
            </CardDescription>
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs shrink-0"
            onClick={() => resetShortcuts()}
            disabled={isResetting}
          >
            <RotateCcw data-icon="inline-start" className="size-3" />
            Reset
          </Button>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-1">
            <span>Format:</span>
            <KbdGroup className="flex-wrap">
              {formatAcceleratorParts("CommandOrControl+Alt+T").map((p, i) => (
                <React.Fragment key={i}>
                  {i > 0 && <span className="text-muted-foreground/70">+</span>}
                  <Kbd className="font-mono text-[10px]">{p}</Kbd>
                </React.Fragment>
              ))}
            </KbdGroup>
          </div>
          <ShortcutInput
            label="Quick Translate"
            settingKey="quickTranslateShortcut"
            currentValue={settings.quickTranslateShortcut}
          />
          <Separator />
          <ShortcutInput
            label="Quick Translate + Replace"
            settingKey="quickTranslateReplaceShortcut"
            currentValue={settings.quickTranslateReplaceShortcut}
          />
          <Separator />
          <ShortcutInput
            label="Toggle App Window"
            settingKey="toggleAppShortcut"
            currentValue={settings.toggleAppShortcut}
          />
          <Separator />
          <ShortcutInput
            label="Voice Selected Text"
            settingKey="voiceTextShortcut"
            currentValue={settings.voiceTextShortcut}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">In-App Shortcuts</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-xs text-muted-foreground">
          {[
            { keys: swapHotkeyParts, label: "Swap language direction" },
            {
              keys: [
                bridge.runtime.platform === "darwin" ? "⌘" : "Ctrl",
                "Enter",
              ],
              label: "Run translate / improve",
            },
            { keys: ["Ctrl", "1"], label: "Translate tab" },
            { keys: ["Ctrl", "2"], label: "Improve tab" },
            { keys: ["Ctrl", "3"], label: "Settings tab" },
          ].map(({ keys, label }) => (
            <div key={label} className="flex items-center justify-between">
              <span>{label}</span>
              <KbdGroup>
                {keys.map((k, i) => (
                  <React.Fragment key={i}>
                    {i > 0 && (
                      <span className="text-muted-foreground/70">+</span>
                    )}
                    <Kbd className="font-mono text-[10px]">{k}</Kbd>
                  </React.Fragment>
                ))}
              </KbdGroup>
            </div>
          ))}
        </CardContent>
      </Card>

      {bridge.runtime.platform === "darwin" && (
        <Alert>
          <AlertDescription className="text-xs">
            On macOS, some key combinations may not work with non-QWERTY
            layouts.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
