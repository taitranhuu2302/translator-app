import { useEffect, useMemo } from "react";
import { bridge } from "../lib/bridge";
import { showError } from "../lib/toast";
import { useSettings } from "../features/settings/use-settings";
import { useTTS } from "../lib/use-speech";

const VI_MARK_REGEX =
  /[ăâđêôơưáàảãạấầẩẫậắằẳẵặéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ]/i;

function detectSpeechLang(text: string): "vi" | "en" {
  return VI_MARK_REGEX.test(text) ? "vi" : "en";
}

export function VoiceShortcutListener(): null {
  const { data: settings } = useSettings();

  const ttsConfig = useMemo(
    () =>
      settings
        ? {
            voiceURI: settings.ttsVoiceURI,
            rate: settings.ttsRate,
            pitch: settings.ttsPitch,
            volume: settings.ttsVolume,
          }
        : undefined,
    [settings],
  );

  const tts = useTTS(ttsConfig);

  useEffect(() => {
    const unsubSpeak = bridge.voice.onSpeak(({ text }) => {
      const trimmed = text?.trim?.() ?? "";
      if (!trimmed) return;
      const lang = detectSpeechLang(trimmed);
      tts.speak(trimmed, lang);
    });

    const unsubErr = bridge.voice.onError((message) => {
      if (message) showError(message);
    });

    return () => {
      unsubSpeak();
      unsubErr();
    };
  }, [tts]);

  return null;
}

