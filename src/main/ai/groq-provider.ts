import Groq from "groq-sdk";
import type { AiServiceProvider } from "./ai-provider";
import type {
  ImproveRequest,
  ImproveResult,
  AiModelOption,
  TranslationRequest,
  TranslationResult,
} from "../../shared/types";
import { GROQ_FALLBACK_MODELS } from "./model-defaults";
import { buildImproveMessages, buildTranslateMessages } from "./prompts";

export class GroqProvider implements AiServiceProvider {
  readonly name = "groq" as const;

  isConfigured(apiKey: string): boolean {
    return apiKey.trim().length > 0;
  }

  async translate(
    req: TranslationRequest,
    apiKey: string,
    model: string,
  ): Promise<TranslationResult> {
    const client = new Groq({ apiKey });
    const messages = buildTranslateMessages(req);

    const completion = await client.chat.completions.create({
      model,
      messages,
      max_tokens: 1024,
      temperature: 0.2,
      reasoning_effort: "none",
    });

    const translation = completion.choices[0]?.message?.content?.trim() ?? "";
    if (!translation) {
      throw new Error("API_ERROR: Empty translation response from Groq");
    }

    return {
      translation,
      sourceText: req.text,
      source: req.source,
      target: req.target,
    };
  }

  async improve(
    req: ImproveRequest,
    apiKey: string,
    model: string,
  ): Promise<ImproveResult> {
    const client = new Groq({ apiKey });
    const messages = buildImproveMessages(req);

    const completion = await client.chat.completions.create({
      model,
      messages,
      max_tokens: 256,
      temperature: 0.4,
      reasoning_effort: "none",
    });

    const raw = completion.choices[0]?.message?.content ?? "";
    return parseImproveOutput(raw, "groq", model);
  }

  async listModels(apiKey: string): Promise<AiModelOption[]> {
    try {
      const client = new Groq({ apiKey });
      const response = await client.models.list();
      const models = response.data
        .filter((m) => !m.id.includes("whisper") && !m.id.includes("guard"))
        .sort((a, b) => a.id.localeCompare(b.id))
        .map(
          (m): AiModelOption => ({ id: m.id, label: m.id, provider: "groq" }),
        );
      return models.length > 0 ? models : GROQ_FALLBACK_MODELS;
    } catch {
      return GROQ_FALLBACK_MODELS;
    }
  }
}

function parseImproveOutput(
  raw: string,
  provider: "groq" | "gemini",
  model: string,
): ImproveResult {
  // Strict JSON format - just parse it
  try {
    let cleaned = raw.trim();

    // Strip thinking tags if present (safety fallback)
    cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();

    // Strip markdown code blocks if present
    if (cleaned.startsWith("```")) {
      cleaned = cleaned
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/```\s*$/, "")
        .trim();
    }

    const parsed = JSON.parse(cleaned) as {
      corrected: string;
      suggestion: string;
    };

    return {
      corrected: parsed.corrected.trim(),
      suggestion: parsed.suggestion.trim(),
      provider,
      model,
    };
  } catch (e) {
    console.error("[parseImproveOutput] JSON parse failed:", e);
    console.error("[parseImproveOutput] Raw response:", raw);

    // Fallback: return raw as corrected, empty suggestion
    return {
      corrected: raw.trim(),
      suggestion: "(Parse error - see raw output above)",
      provider,
      model,
    };
  }
}

export { parseImproveOutput };
