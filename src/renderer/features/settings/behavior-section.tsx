import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import { Separator } from "../../../components/ui/separator";
import { Slider } from "../../../components/ui/slider";
import { Switch } from "../../../components/ui/switch";
import { SettingRow } from "./setting-row";
import { useSettings, useUpdateSettings } from "./use-settings";
import { bridge } from "../../lib/bridge";

export function BehaviorSection() {
  const { data: settings } = useSettings();
  const { mutate: update } = useUpdateSettings();
  if (!settings) return null;

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Quick Translate</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <SettingRow
            label="Auto-copy delay"
            description={`Wait ${settings.autoCopyDelayMs}ms after simulating copy`}
          >
            <div className="flex items-center gap-3">
              <Slider
                min={100}
                max={600}
                step={50}
                value={[settings.autoCopyDelayMs]}
                onValueChange={([v]) => update({ autoCopyDelayMs: v })}
                className="w-28"
              />
              <span className="text-xs tabular-nums w-8">
                {settings.autoCopyDelayMs}ms
              </span>
            </div>
          </SettingRow>
          <Separator />
          <SettingRow
            label="Restore clipboard"
            description="Restore clipboard after capturing selected text"
          >
            <Switch
              checked={settings.restoreClipboard}
              onCheckedChange={(v) => update({ restoreClipboard: v })}
            />
          </SettingRow>
          <Separator />
          <SettingRow
            label="Popup always on top"
            description="Keep quick translate popup above all windows"
          >
            <Switch
              checked={settings.popupAlwaysOnTop}
              onCheckedChange={(v) => update({ popupAlwaysOnTop: v })}
            />
          </SettingRow>
        </CardContent>
      </Card>

      {bridge.runtime.platform !== "darwin" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Startup</CardTitle>
          </CardHeader>
          <CardContent>
            <SettingRow
              label="Open on system startup"
              description="Launch app automatically when you sign in"
            >
              <Switch
                checked={settings.autoLaunchOnSystemStart}
                onCheckedChange={(v) => update({ autoLaunchOnSystemStart: v })}
              />
            </SettingRow>
            <Separator />
            <SettingRow
              label="Start minimized to tray"
              description="Hide window on startup"
            >
              <Switch
                checked={settings.startMinimized}
                onCheckedChange={(v) => update({ startMinimized: v })}
              />
            </SettingRow>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
