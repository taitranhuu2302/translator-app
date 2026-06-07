import { beforeEach, describe, expect, it, vi } from "vitest";

const groqTranslate = vi.fn();
const groqImprove = vi.fn();
const groqListModels = vi.fn();
const groqIsConfigured = vi.fn();

const geminiTranslate = vi.fn();
const geminiImprove = vi.fn();
const geminiListModels = vi.fn();
const geminiIsConfigured = vi.fn();

const googleTranslate = vi.fn();

vi.mock("../main/ai/groq-provider", () => ({
  GroqProvider: class {
    isConfigured = groqIsConfigured;
    translate = groqTranslate;
    improve = groqImprove;
    listModels = groqListModels;
  },
}));

vi.mock("../main/ai/gemini-provider", () => ({
  GeminiProvider: class {
    isConfigured = geminiIsConfigured;
    translate = geminiTranslate;
    improve = geminiImprove;
    listModels = geminiListModels;
  },
}));

vi.mock("../main/translation/google-translate-provider", () => ({
  getTranslationProvider: () => ({
    translate: googleTranslate,
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("runAiTranslate", () => {
  it("falls back to google translate when configured AI provider fails", async () => {
    groqIsConfigured.mockReturnValue(true);
    groqTranslate.mockRejectedValue(new Error("provider down"));
    googleTranslate.mockResolvedValue({
      translation: "Xin chao",
      sourceText: "Hello",
      source: "en",
      target: "vi",
    });

    const { runAiTranslate } = await import("../main/ai/ai-service");
    const result = await runAiTranslate(
      { source: "en", target: "vi", text: "Hello" },
      {
        version: 6,
        translationMode: "manual",
        manualDirection: "vi-en",
        quickTargetLanguage: "vi",
        quickReplaceTargetLanguage: "en",
        useAiTranslation: false,
        aiProvider: "groq",
        aiGroqApiKey: "key",
        aiGroqModel: "model-a",
        aiGeminiApiKey: "",
        aiGeminiModel: "model-b",
        improveOutputLang: "en",
        quickTranslateShortcut: "A",
        quickTranslateReplaceShortcut: "B",
        toggleAppShortcut: "C",
        voiceTextShortcut: "D",
        autoCopyDelayMs: 200,
        restoreClipboard: true,
        popupAlwaysOnTop: true,
        startMinimized: false,
        autoLaunchOnSystemStart: false,
        ttsVoiceURI: "",
        ttsRate: 1,
        ttsPitch: 1,
        ttsVolume: 1,
        maxHistoryItems: 500,
        trackHistory: true,
      },
    );

    expect(groqTranslate).toHaveBeenCalled();
    expect(googleTranslate).toHaveBeenCalledWith({
      source: "en",
      target: "vi",
      text: "Hello",
    });
    expect(result.translation).toBe("Xin chao");
  });

  it("falls back to google translate when no AI provider is configured", async () => {
    groqIsConfigured.mockReturnValue(false);
    geminiIsConfigured.mockReturnValue(false);
    googleTranslate.mockResolvedValue({
      translation: "Hello",
      sourceText: "Xin chao",
      source: "vi",
      target: "en",
    });

    const { runAiTranslate } = await import("../main/ai/ai-service");
    const result = await runAiTranslate(
      { source: "vi", target: "en", text: "Xin chao" },
      {
        version: 6,
        translationMode: "manual",
        manualDirection: "vi-en",
        quickTargetLanguage: "vi",
        quickReplaceTargetLanguage: "en",
        useAiTranslation: false,
        aiProvider: "auto",
        aiGroqApiKey: "",
        aiGroqModel: "model-a",
        aiGeminiApiKey: "",
        aiGeminiModel: "model-b",
        improveOutputLang: "en",
        quickTranslateShortcut: "A",
        quickTranslateReplaceShortcut: "B",
        toggleAppShortcut: "C",
        voiceTextShortcut: "D",
        autoCopyDelayMs: 200,
        restoreClipboard: true,
        popupAlwaysOnTop: true,
        startMinimized: false,
        autoLaunchOnSystemStart: false,
        ttsVoiceURI: "",
        ttsRate: 1,
        ttsPitch: 1,
        ttsVolume: 1,
        maxHistoryItems: 500,
        trackHistory: true,
      },
    );

    expect(googleTranslate).toHaveBeenCalledWith({
      source: "vi",
      target: "en",
      text: "Xin chao",
    });
    expect(result.translation).toBe("Hello");
  });
});
