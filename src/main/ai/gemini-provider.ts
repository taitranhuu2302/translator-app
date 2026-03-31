import { GoogleGenAI } from "@google/genai";
import type { AiServiceProvider } from "./ai-provider";
import type {
  ImproveRequest,
  ImproveResult,
  AiModelOption,
} from "../../shared/types";
import { GEMINI_FALLBACK_MODELS } from "./model-defaults";
import { buildImproveSystemPrompt, buildImproveUserPrompt } from "./prompts";
import { parseImproveOutput } from "./groq-provider";

export class GeminiProvider implements AiServiceProvider {
  readonly name = "gemini" as const;

  isConfigured(apiKey: string): boolean {
    return apiKey.trim().length > 0;
  }

  async improve(
    req: ImproveRequest,
    apiKey: string,
    model: string,
  ): Promise<ImproveResult> {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model,
      contents: buildImproveUserPrompt(req),
      config: {
        systemInstruction: buildImproveSystemPrompt(req.outputLang),
        maxOutputTokens: 256,
        temperature: 0.4,
        thinkingConfig: {
          thinkingBudget: 0,
        },
      },
    });

    const raw = response.text ?? "";
    return parseImproveOutput(raw, "gemini", model);
  }

  async listModels(apiKey: string): Promise<AiModelOption[]> {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const models: AiModelOption[] = [];
      for await (const m of await ai.models.list()) {
        const id = (m.name ?? "").replace("models/", "");
        if (id.startsWith("gemini")) {
          models.push({ id, label: m.displayName ?? id, provider: "gemini" });
        }
      }
      return models.length > 0 ? models : GEMINI_FALLBACK_MODELS;
    } catch {
      return GEMINI_FALLBACK_MODELS;
    }
  }
}
