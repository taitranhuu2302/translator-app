import { useState, useEffect, useRef, useCallback } from "react";

const langBCP47: Record<string, string> = {
  en: "en-US",
  vi: "vi-VN",
};

function toLang(lang: string): string {
  return langBCP47[lang] ?? lang;
}

/** Returns the best available SpeechSynthesis voice for the given BCP-47 tag.
 *  Priority: exact lang match → language prefix match → undefined (browser default). */
function pickVoice(bcp47: string): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return undefined;
  const lower = bcp47.toLowerCase();
  const prefix = lower.split("-")[0];
  return (
    voices.find((v) => v.lang.toLowerCase() === lower) ??
    voices.find((v) => v.lang.toLowerCase().startsWith(prefix)) ??
    undefined
  );
}

// ---------------------------------------------------------------------------
// TTS — Text to Speech (Web Speech API: SpeechSynthesis)
// ---------------------------------------------------------------------------

type TTSConfig = {
  voiceURI?: string; // empty/undefined = auto
  rate?: number;
  pitch?: number;
  volume?: number;
};

function pickVoiceByURI(voiceURI: string): SpeechSynthesisVoice | undefined {
  if (!voiceURI) return undefined;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return undefined;
  return voices.find((v) => v.voiceURI === voiceURI);
}

export function useTTS(config?: TTSConfig) {
  const [speaking, setSpeaking] = useState(false);
  const configRef = useRef<TTSConfig | undefined>(config);
  configRef.current = config;

  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  const speak = useCallback((text: string, lang: string) => {
    if (!text.trim()) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const bcp47 = toLang(lang);
    utterance.lang = bcp47;

    // Voices may not be loaded yet on first call — wait for voiceschanged then speak
    const doSpeak = () => {
      const cfg = configRef.current;
      const voice =
        (cfg?.voiceURI ? pickVoiceByURI(cfg.voiceURI) : undefined) ??
        pickVoice(bcp47);
      if (voice) utterance.voice = voice;
      if (typeof cfg?.rate === "number") utterance.rate = cfg.rate;
      if (typeof cfg?.pitch === "number") utterance.pitch = cfg.pitch;
      if (typeof cfg?.volume === "number") utterance.volume = cfg.volume;
      utterance.onstart = () => setSpeaking(true);
      utterance.onend = () => setSpeaking(false);
      utterance.onerror = () => setSpeaking(false);
      window.speechSynthesis.speak(utterance);
    };

    if (window.speechSynthesis.getVoices().length > 0) {
      doSpeak();
    } else {
      window.speechSynthesis.addEventListener("voiceschanged", doSpeak, {
        once: true,
      });
    }
  }, []);

  const stop = useCallback(() => {
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }, []);

  return { speaking, speak, stop };
}

// ---------------------------------------------------------------------------
// STT — Speech to Text (Web Speech API: SpeechRecognition)
// ---------------------------------------------------------------------------

type SpeechRecognitionInstance = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  onstart: ((ev: Event) => void) | null;
  onresult: ((ev: SpeechRecognitionEvent) => void) | null;
  onend: ((ev: Event) => void) | null;
  onerror: ((ev: Event) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
};

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  }
}

export function useSTT(onResult: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const isSupported =
    typeof window !== "undefined" &&
    !!(window.SpeechRecognition ?? window.webkitSpeechRecognition);

  const recRef = useRef<SpeechRecognitionInstance | null>(null);
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  useEffect(() => {
    return () => {
      recRef.current?.abort();
    };
  }, []);

  const start = useCallback(
    (lang: string) => {
      if (!isSupported) return;
      recRef.current?.abort();

      const SpeechRec =
        window.SpeechRecognition ?? window.webkitSpeechRecognition;
      if (!SpeechRec) return;
      const rec = new SpeechRec();
      rec.lang = toLang(lang);
      rec.interimResults = false;
      rec.maxAlternatives = 1;
      rec.continuous = false;

      rec.onstart = () => setListening(true);
      rec.onresult = (e: SpeechRecognitionEvent) => {
        const transcript = e.results[0]?.[0]?.transcript ?? "";
        if (transcript) onResultRef.current(transcript);
      };
      rec.onend = () => setListening(false);
      rec.onerror = () => setListening(false);

      recRef.current = rec;
      rec.start();
    },
    [isSupported],
  );

  const stop = useCallback(() => {
    recRef.current?.stop();
    setListening(false);
  }, []);

  return { listening, isSupported, start, stop };
}
