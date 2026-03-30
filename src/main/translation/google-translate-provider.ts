import { translate as googletrans } from "googletrans";
import { TranslationRequest, TranslationResult } from "../../shared/types";
import { TranslationProvider } from "./translation-provider";

export class GoogleTranslateProvider implements TranslationProvider {
  async translate(request: TranslationRequest): Promise<TranslationResult> {
    let result: Awaited<ReturnType<typeof googletrans>>;

    try {
      result = await googletrans(request.text, {
        from: request.source === "auto" ? undefined : request.source,
        to: request.target,
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.toLowerCase().includes("timeout")) {
        throw new Error(`TIMEOUT: Translation request timed out`);
      }
      throw new Error(`NETWORK_ERROR: ${msg}`);
    }

    if (!result || typeof result.text !== "string") {
      throw new Error("API_ERROR: Invalid response from googletrans");
    }

    return {
      translation: result.text,
      sourceText: request.text,
      source: request.source,
      target: request.target,
    };
  }
}

let provider: GoogleTranslateProvider | null = null;

export function getTranslationProvider(): GoogleTranslateProvider {
  if (!provider) provider = new GoogleTranslateProvider();
  return provider;
}
