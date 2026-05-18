import { describe, expect, it } from "vitest";
import { countWords, shouldUseGoogleTranslate } from "../main/translation/quick-translate-routing";

describe("quick translate routing", () => {
  it("routes short selections to google translate", () => {
    expect(countWords("Hello")).toBe(1);
    expect(shouldUseGoogleTranslate("Hello")).toBe(true);
    expect(shouldUseGoogleTranslate("Hello world")).toBe(true);
  });

  it("routes longer selections to AI", () => {
    expect(countWords("Hello brave new world")).toBe(4);
    expect(shouldUseGoogleTranslate("Hello brave new world")).toBe(false);
  });
});