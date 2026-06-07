import { describe, it, expect, vi, beforeEach } from "vitest";

const mockTranslate = vi.fn();

vi.mock("googletrans", () => ({
  translate: mockTranslate,
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GoogleTranslateProvider", () => {
  it("returns a TranslationResult on success", async () => {
    mockTranslate.mockResolvedValue({ text: "Hello" });
    const { GoogleTranslateProvider } =
      await import("../main/translation/google-translate-provider");
    const provider = new GoogleTranslateProvider();
    const result = await provider.translate({
      source: "vi",
      target: "en",
      text: "Xin chào",
    });
    expect(result.translation).toBe("Hello");
    expect(result.sourceText).toBe("Xin chào");
    expect(result.target).toBe("en");
  });

  it("extracts rich details when dictionary data is available", async () => {
    mockTranslate.mockResolvedValue({
      text: "Professor",
      textArray: ["Professor"],
      pronunciation: "pro-fes-ser",
      hasCorrectedLang: false,
      src: "vi",
      hasCorrectedText: true,
      correctedText: "Giáo sư",
      translations: [],
      raw: [
        [],
        [
          [
            "noun",
            ["giáo sư"],
            [["giáo sư", ["professor", "academic"]]],
            "professor",
            1,
          ],
        ],
        "vi",
        null,
        null,
        [
          [
            "Professor",
            null,
            [["giáo sư", null, true, false, [10]]],
            [[0, 9]],
            "Professor",
            0,
            0,
          ],
        ],
        0.98,
        [],
        [["vi"], null, [0.98], ["vi"]],
        null,
        null,
        [
          [
            "noun",
            [["a teacher of the highest rank.", "id", "Professor Goodwin"]],
            "professor",
            1,
          ],
        ],
      ],
    });

    const { GoogleTranslateProvider } =
      await import("../main/translation/google-translate-provider");
    const provider = new GoogleTranslateProvider();
    const result = await provider.translate({
      source: "vi",
      target: "en",
      text: "Giáo sư",
    });

    expect(result.details?.detectedSource).toBe("vi");
    expect(result.details?.pronunciation).toBe("pro-fes-ser");
    expect(result.details?.correctedText).toBe("Giáo sư");
    expect(result.details?.confidence).toBe(0.98);
    expect(result.details?.alternatives).toContain("giáo sư");
    expect(result.details?.lexicalGroups[0]?.partOfSpeech).toBe("noun");
    expect(result.details?.definitionGroups[0]?.items[0]?.definition).toContain(
      "highest rank",
    );
  });

  it("passes correct options to googletrans", async () => {
    mockTranslate.mockResolvedValue({ text: "Hello" });
    const { GoogleTranslateProvider } =
      await import("../main/translation/google-translate-provider");
    const provider = new GoogleTranslateProvider();
    await provider.translate({ source: "vi", target: "en", text: "Xin chào" });
    expect(mockTranslate).toHaveBeenCalledWith("Xin chào", {
      from: "vi",
      to: "en",
    });
  });

  it("passes undefined as from when source is auto", async () => {
    mockTranslate.mockResolvedValue({ text: "Hello" });
    const { GoogleTranslateProvider } =
      await import("../main/translation/google-translate-provider");
    const provider = new GoogleTranslateProvider();
    await provider.translate({
      source: "auto",
      target: "en",
      text: "Xin chào",
    });
    expect(mockTranslate).toHaveBeenCalledWith("Xin chào", {
      from: undefined,
      to: "en",
    });
  });

  it("throws API_ERROR when result has no text field", async () => {
    mockTranslate.mockResolvedValue({});
    const { GoogleTranslateProvider } =
      await import("../main/translation/google-translate-provider");
    const provider = new GoogleTranslateProvider();
    await expect(
      provider.translate({ source: "vi", target: "en", text: "test" }),
    ).rejects.toThrow("API_ERROR");
  });

  it("throws TIMEOUT when error message contains timeout", async () => {
    mockTranslate.mockRejectedValue(new Error("Request timeout exceeded"));
    const { GoogleTranslateProvider } =
      await import("../main/translation/google-translate-provider");
    const provider = new GoogleTranslateProvider();
    await expect(
      provider.translate({ source: "vi", target: "en", text: "test" }),
    ).rejects.toThrow("TIMEOUT");
  });

  it("throws NETWORK_ERROR on generic error", async () => {
    mockTranslate.mockRejectedValue(new Error("Network Error"));
    const { GoogleTranslateProvider } =
      await import("../main/translation/google-translate-provider");
    const provider = new GoogleTranslateProvider();
    await expect(
      provider.translate({ source: "vi", target: "en", text: "test" }),
    ).rejects.toThrow("NETWORK_ERROR");
  });

  it("times out if googletrans does not resolve in time", async () => {
    vi.useFakeTimers();
    try {
      mockTranslate.mockImplementation(
        () => new Promise(() => undefined) as Promise<never>,
      );

      const { GoogleTranslateProvider } =
        await import("../main/translation/google-translate-provider");
      const provider = new GoogleTranslateProvider();

      const pending = provider.translate({
        source: "vi",
        target: "en",
        text: "test",
      });
      const assertion = expect(pending).rejects.toThrow("TIMEOUT");

      await vi.advanceTimersByTimeAsync(30000);
      await assertion;
    } finally {
      vi.useRealTimers();
    }
  });
});
