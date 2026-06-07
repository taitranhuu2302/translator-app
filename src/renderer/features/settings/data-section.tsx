import { Trash2 } from "lucide-react";
import { Button } from "../../../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import { Switch } from "../../../components/ui/switch";
import { SettingRow } from "./setting-row";
import { useHistory } from "../history/use-history";
import { useSettings, useUpdateSettings } from "./use-settings";

const MAX_ITEMS_OPTIONS = [
  { value: "100", label: "100 entries" },
  { value: "500", label: "500 entries" },
  { value: "1000", label: "1 000 entries" },
  { value: "0", label: "Unlimited" },
];

export function DataSection() {
  const { clear, isClearPending } = useHistory();
  const { data: settings } = useSettings();
  const { mutate: update } = useUpdateSettings();

  const maxItems = settings?.maxHistoryItems ?? 500;

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">History</CardTitle>
          <CardDescription className="text-xs">
            Translate and Improve history is stored locally on your device
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <SettingRow
            label="Track history"
            description="Save translation and improve results to history. Disable to save disk space."
          >
            <Switch
              checked={settings?.trackHistory ?? true}
              onCheckedChange={(v) => update({ trackHistory: v })}
            />
          </SettingRow>

          <SettingRow
            label="Max history size"
            description="Older entries are automatically pruned when the limit is reached"
          >
            <Select
              value={String(maxItems)}
              onValueChange={(v) => update({ maxHistoryItems: Number(v) })}
            >
              <SelectTrigger className="h-7 w-32 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MAX_ITEMS_OPTIONS.map((opt) => (
                  <SelectItem
                    key={opt.value}
                    value={opt.value}
                    className="text-xs"
                  >
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SettingRow>

          <SettingRow
            label="Clear all history"
            description="Permanently deletes all translate and improve history"
          >
            <Button
              size="sm"
              variant="destructive"
              className="h-7 text-xs"
              onClick={() => clear()}
              disabled={isClearPending}
            >
              <Trash2 data-icon="inline-start" className="size-3" />
              Clear History
            </Button>
          </SettingRow>
        </CardContent>
      </Card>
    </div>
  );
}
