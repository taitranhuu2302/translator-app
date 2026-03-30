import React from "react";
import { RotateCcw } from "lucide-react";
import { Button } from "../../../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import { Switch } from "../../../components/ui/switch";
import { Separator } from "../../../components/ui/separator";
import { Skeleton } from "../../../components/ui/skeleton";
import { Alert, AlertDescription } from "../../../components/ui/alert";
import { Kbd, KbdGroup } from "../../../components/ui/kbd";
import { ShortcutInput } from "./shortcut-input";
import {
  useSettings,
  useUpdateSettings,
  useResetShortcuts,
} from "./use-settings";
import type { ManualDirection, LanguageCode } from "../../../shared/types";
import { bridge } from "../../lib/bridge";
import { formatAcceleratorParts } from "../../lib/format-shortcut";

function SettingRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex flex-col gap-0.5 flex-1">
        <span className="text-sm font-medium">{label}</span>
        {description && (
          <span className="text-xs text-muted-foreground">{description}</span>
        )}
      </div>
      {children}
    </div>
  );
}

export function SettingsPage() {
  const { data: settings, isLoading } = useSettings();
  const { mutate: update } = useUpdateSettings();
  const { mutate: resetShortcuts, isPending: isResetting } =
    useResetShortcuts();

  if (isLoading || !settings) {
    return (
      <div className="flex flex-col gap-4 p-4">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4 overflow-y-auto">
      {/* Translation defaults */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Translation Defaults</CardTitle>
          <CardDescription>
            Default language directions for translate operations
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <SettingRow
            label="Manual direction"
            description="Default direction in the main translate view"
          >
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant={
                  settings.manualDirection === "vi-en" ? "default" : "outline"
                }
                onClick={() =>
                  update({ manualDirection: "vi-en" as ManualDirection })
                }
              >
                VI → EN
              </Button>
              <Button
                size="sm"
                variant={
                  settings.manualDirection === "en-vi" ? "default" : "outline"
                }
                onClick={() =>
                  update({ manualDirection: "en-vi" as ManualDirection })
                }
              >
                EN → VI
              </Button>
            </div>
          </SettingRow>

          <Separator />

          <SettingRow
            label="NextG Translate target"
            description="Target language when using the global shortcut"
          >
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant={
                  settings.quickTargetLanguage === "en" ? "default" : "outline"
                }
                onClick={() =>
                  update({ quickTargetLanguage: "en" as LanguageCode })
                }
              >
                English
              </Button>
              <Button
                size="sm"
                variant={
                  settings.quickTargetLanguage === "vi" ? "default" : "outline"
                }
                onClick={() =>
                  update({ quickTargetLanguage: "vi" as LanguageCode })
                }
              >
                Vietnamese
              </Button>
            </div>
          </SettingRow>
        </CardContent>
      </Card>

      {/* Shortcuts */}
      <Card>
        <div className="flex justify-between w-full items-center px-4">
          <div className="space-y-1.5">
            <CardTitle className="text-base">Keyboard Shortcuts</CardTitle>
            <CardDescription>Global shortcuts for app actions</CardDescription>
            <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-1 gap-y-1 leading-relaxed">
              <span className="text-muted-foreground/90">Format:</span>
              <KbdGroup className="flex-wrap">
                {formatAcceleratorParts("CommandOrControl+Alt+T").map(
                  (p, i) => (
                    <React.Fragment key={i}>
                      {i > 0 && (
                        <span className="text-muted-foreground/70">+</span>
                      )}
                      <Kbd className="font-mono text-[10px]">{p}</Kbd>
                    </React.Fragment>
                  ),
                )}
              </KbdGroup>
            </div>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => resetShortcuts()}
            disabled={isResetting}
          >
            <RotateCcw data-icon="inline-start" />
            Reset to defaults
          </Button>
        </div>
        <CardContent className="flex flex-col gap-4">
          <ShortcutInput
            label="NextG Translate"
            settingKey="quickTranslateShortcut"
            currentValue={settings.quickTranslateShortcut}
          />
          <Separator />
          <ShortcutInput
            label="Toggle App Window"
            settingKey="toggleAppShortcut"
            currentValue={settings.toggleAppShortcut}
          />

          {bridge.runtime.platform === "darwin" && (
            <Alert>
              <AlertDescription className="text-xs">
                On macOS, some key combinations may not work with non-QWERTY
                keyboard layouts. If a shortcut fails to register, try a
                different combination.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* NextG Translate popup behavior */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">NextG Translate behavior</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <SettingRow
            label="Auto-copy delay"
            description={`Wait ${settings.autoCopyDelayMs}ms after simulating copy (increase if capture is unreliable)`}
          >
            <input
              type="range"
              min={100}
              max={600}
              step={50}
              value={settings.autoCopyDelayMs}
              onChange={(e) =>
                update({ autoCopyDelayMs: parseInt(e.target.value) })
              }
              className="w-32"
            />
          </SettingRow>

          <Separator />

          <SettingRow
            label="Restore clipboard"
            description="Restore clipboard contents after capturing selected text"
          >
            <Switch
              checked={settings.restoreClipboard}
              onCheckedChange={(v) => update({ restoreClipboard: v })}
            />
          </SettingRow>

          <Separator />

          <SettingRow
            label="Popup always on top"
            description="Keep the quick translate popup above all other windows"
          >
            <Switch
              checked={settings.popupAlwaysOnTop}
              onCheckedChange={(v) => update({ popupAlwaysOnTop: v })}
            />
          </SettingRow>

          {bridge.runtime.platform !== "darwin" && (
            <>
              <Separator />
              <SettingRow
                label="Start minimized to tray"
                description="Hide the app window on startup"
              >
                <Switch
                  checked={settings.startMinimized}
                  onCheckedChange={(v) => update({ startMinimized: v })}
                />
              </SettingRow>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
