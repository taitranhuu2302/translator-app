import { useEffect, useMemo, useState } from "react";
import { Play, Square } from "lucide-react";
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
import { Separator } from "../../../components/ui/separator";
import { Slider } from "../../../components/ui/slider";
import { SettingRow } from "./setting-row";
import { useSettings, useUpdateSettings } from "./use-settings";
import { useTTS } from "../../lib/use-speech";

const AUTO_VOICE_VALUE = "__auto__";

type BrowserVoice = {
  voiceURI: string;
  name: string;
  lang: string;
  default: boolean;
  localService: boolean;
};

function useSpeechVoices() {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    const updateVoices = () => {
      setVoices(window.speechSynthesis.getVoices());
    };

    updateVoices();
    window.speechSynthesis.addEventListener("voiceschanged", updateVoices);
    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", updateVoices);
    };
  }, []);

  return voices;
}

function formatVoiceLabel(voice: BrowserVoice): string {
  const tags = [
    voice.lang,
    voice.default ? "Default" : null,
    voice.localService ? "Local" : "Remote",
  ].filter(Boolean);

  return `${voice.name} (${tags.join(" • ")})`;
}

export function VoiceSection() {
  const { data: settings } = useSettings();
  const { mutate: update } = useUpdateSettings();
  const browserVoices = useSpeechVoices();

  const voices = useMemo<BrowserVoice[]>(
    () =>
      browserVoices.map((voice) => ({
        voiceURI: voice.voiceURI,
        name: voice.name,
        lang: voice.lang,
        default: voice.default,
        localService: voice.localService,
      })),
    [browserVoices],
  );

  const previewTTS = useTTS(
    settings
      ? {
          voiceURI: settings.ttsVoiceURI,
          rate: settings.ttsRate,
          pitch: settings.ttsPitch,
          volume: settings.ttsVolume,
        }
      : undefined,
  );

  if (!settings) return null;

  const selectedVoiceValue = settings.ttsVoiceURI || AUTO_VOICE_VALUE;
  const selectedVoice = voices.find((voice) => voice.voiceURI === settings.ttsVoiceURI);

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Text To Speech</CardTitle>
          <CardDescription className="text-xs">
            Configure the Web Speech API voice used by the reader buttons.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <SettingRow
            label="Voice"
            description={
              voices.length > 0
                ? selectedVoice
                  ? formatVoiceLabel(selectedVoice)
                  : "Auto-select the best voice based on language"
                : "No speech voices reported by this system yet"
            }
          >
            <Select
              value={selectedVoiceValue}
              onValueChange={(value) =>
                update({ ttsVoiceURI: value === AUTO_VOICE_VALUE ? "" : value })
              }
            >
              <SelectTrigger className="h-8 w-64 text-xs">
                <SelectValue placeholder="Choose a voice" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={AUTO_VOICE_VALUE} className="text-xs">
                  Auto by language
                </SelectItem>
                {voices.map((voice) => (
                  <SelectItem
                    key={voice.voiceURI}
                    value={voice.voiceURI}
                    className="text-xs"
                  >
                    {formatVoiceLabel(voice)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SettingRow>

          <Separator />

          <SettingRow
            label="Speed"
            description={`Playback rate: ${settings.ttsRate.toFixed(1)}x`}
          >
            <div className="flex items-center gap-3">
              <Slider
                min={0.5}
                max={2}
                step={0.1}
                value={[settings.ttsRate]}
                onValueChange={([value]) => update({ ttsRate: value })}
                className="w-28"
              />
              <span className="w-10 text-xs tabular-nums">
                {settings.ttsRate.toFixed(1)}x
              </span>
            </div>
          </SettingRow>

          <Separator />

          <SettingRow
            label="Pitch"
            description={`Voice pitch: ${settings.ttsPitch.toFixed(1)}`}
          >
            <div className="flex items-center gap-3">
              <Slider
                min={0}
                max={2}
                step={0.1}
                value={[settings.ttsPitch]}
                onValueChange={([value]) => update({ ttsPitch: value })}
                className="w-28"
              />
              <span className="w-8 text-xs tabular-nums">
                {settings.ttsPitch.toFixed(1)}
              </span>
            </div>
          </SettingRow>

          <Separator />

          <SettingRow
            label="Volume"
            description={`Reader volume: ${Math.round(settings.ttsVolume * 100)}%`}
          >
            <div className="flex items-center gap-3">
              <Slider
                min={0}
                max={1}
                step={0.05}
                value={[settings.ttsVolume]}
                onValueChange={([value]) => update({ ttsVolume: value })}
                className="w-28"
              />
              <span className="w-10 text-xs tabular-nums">
                {Math.round(settings.ttsVolume * 100)}%
              </span>
            </div>
          </SettingRow>

          <Separator />

          <SettingRow
            label="Preview"
            description="Test the selected voice with a short sample sentence"
          >
            <Button
              type="button"
              size="sm"
              variant={previewTTS.speaking ? "secondary" : "default"}
              className="h-7 text-xs"
              onClick={() =>
                previewTTS.speaking
                  ? previewTTS.stop()
                  : previewTTS.speak(
                      "Hello. Xin chao. This is your selected reading voice.",
                      "en",
                    )
              }
            >
              {previewTTS.speaking ? (
                <Square data-icon="inline-start" className="size-3" />
              ) : (
                <Play data-icon="inline-start" className="size-3" />
              )}
              {previewTTS.speaking ? "Stop" : "Play Sample"}
            </Button>
          </SettingRow>
        </CardContent>
      </Card>
    </div>
  );
}
