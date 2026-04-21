import { Button } from "../../../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import { Separator } from "../../../components/ui/separator";
import { SettingRow } from "./setting-row";
import { useSettings, useUpdateSettings } from "./use-settings";
import type { LanguageCode, ManualDirection } from "../../../shared/types";

export function TranslationSection() {
  const { data: settings } = useSettings();
  const { mutate: update } = useUpdateSettings();
  if (!settings) return null;

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Language Defaults</CardTitle>
          <CardDescription className="text-xs">
            Default directions and target languages
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <SettingRow
            label="Translate page direction"
            description="Default manual direction in Translate page (you can switch to Auto Detect in the page)."
          >
            <div className="flex gap-1.5">
              {(["vi-en", "en-vi"] as ManualDirection[]).map((d) => (
                <Button
                  key={d}
                  size="sm"
                  variant={
                    settings.manualDirection === d ? "default" : "outline"
                  }
                  className="h-7 text-xs"
                  onClick={() => update({ manualDirection: d })}
                >
                  {d === "vi-en" ? "VI → EN" : "EN → VI"}
                </Button>
              ))}
            </div>
          </SettingRow>
          <Separator />
          <SettingRow
            label="Quick translate target"
            description="Target language for the global shortcut"
          >
            <div className="flex gap-1.5">
              {(["vi", "en"] as LanguageCode[]).map((lang) => (
                <Button
                  key={lang}
                  size="sm"
                  variant={
                    settings.quickTargetLanguage === lang
                      ? "default"
                      : "outline"
                  }
                  className="h-7 text-xs"
                  onClick={() => update({ quickTargetLanguage: lang })}
                >
                  {lang === "vi" ? "Vietnamese" : "English"}
                </Button>
              ))}
            </div>
          </SettingRow>
          <Separator />
          <SettingRow
            label="Improve output language"
            description="Language for corrected/improved sentences"
          >
            <div className="flex gap-1.5">
              {(["vi", "en"] as LanguageCode[]).map((lang) => (
                <Button
                  key={lang}
                  size="sm"
                  variant={
                    settings.improveOutputLang === lang ? "default" : "outline"
                  }
                  className="h-7 text-xs"
                  onClick={() => update({ improveOutputLang: lang })}
                >
                  {lang === "vi" ? "Vietnamese" : "English"}
                </Button>
              ))}
            </div>
          </SettingRow>
        </CardContent>
      </Card>
    </div>
  );
}
