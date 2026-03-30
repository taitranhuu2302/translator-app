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
});
