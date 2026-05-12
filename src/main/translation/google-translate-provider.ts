import { translate as googletrans } from "googletrans";
import {
  TranslationDetails,
  TranslationRequest,
  TranslationResult,
} from "../../shared/types";
import { TranslationProvider } from "./translation-provider";

const GOOGLE_TRANSLATE_TIMEOUT_MS = 30000;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error("TIMEOUT: Translation request timed out"));
    }, timeoutMs);

    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => asString(item))
    .filter((item): item is string => item !== null);
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function extractAlternatives(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const alternatives = new Set<string>();

  for (const block of raw) {
    if (!Array.isArray(block) || !Array.isArray(block[2])) continue;
    for (const item of block[2]) {
      if (!Array.isArray(item)) continue;
      const alt = asString(item[0]);
      if (alt) alternatives.add(alt);
    }
  }

  return Array.from(alternatives).slice(0, 8);
}

function extractLexicalGroups(
  raw: unknown,
): TranslationDetails["lexicalGroups"] {
  if (!Array.isArray(raw)) return [];

  return raw
    .map((group) => {
      if (!Array.isArray(group)) return null;
      const partOfSpeech = asString(group[0]);
      const terms = asStringArray(group[1]);
      const base = asString(group[3]) ?? "";
      const entriesRaw = Array.isArray(group[2]) ? group[2] : [];
      const entries = entriesRaw
        .map((entry) => {
          if (!Array.isArray(entry)) return null;
          const term = asString(entry[0]);
          const meanings = asStringArray(entry[1]);
          if (!term || meanings.length === 0) return null;
          return { term, meanings };
        })
        .filter(
          (entry): entry is { term: string; meanings: string[] } => !!entry,
        )
        .slice(0, 8);

      if (!partOfSpeech || (terms.length === 0 && entries.length === 0)) {
        return null;
      }

      return { partOfSpeech, terms, base, entries };
    })
    .filter(
      (
        group,
      ): group is {
        partOfSpeech: string;
        terms: string[];
        base: string;
        entries: { term: string; meanings: string[] }[];
      } => !!group,
    )
    .slice(0, 4);
}

function extractDefinitionGroups(
  raw: unknown,
): TranslationDetails["definitionGroups"] {
  if (!Array.isArray(raw)) return [];

  return raw
    .map((group) => {
      if (!Array.isArray(group)) return null;
      const partOfSpeech = asString(group[0]);
      const base = asString(group[2]) ?? "";
      const itemsRaw = Array.isArray(group[1]) ? group[1] : [];
      const items: { definition: string; example?: string }[] = [];

      for (const item of itemsRaw) {
        if (!Array.isArray(item)) continue;
        const definition = asString(item[0]);
        const example = asString(item[2]) ?? undefined;
        if (!definition) continue;
        items.push({ definition, example });
        if (items.length >= 6) break;
      }

      if (!partOfSpeech || items.length === 0) return null;

      return { partOfSpeech, base, items };
    })
    .filter(
      (group): group is TranslationDetails["definitionGroups"][number] =>
        !!group,
    )
    .slice(0, 3);
}

function extractDetails(
  result: Awaited<ReturnType<typeof googletrans>>,
): TranslationDetails | undefined {
  const raw: unknown[] = Array.isArray(result.raw)
    ? (result.raw as unknown[])
    : [];

  const definitionGroups = extractDefinitionGroups(raw[12]);
  const fallbackDefinitionGroups =
    definitionGroups.length > 0
      ? definitionGroups
      : extractDefinitionGroups(raw[11]);

  const details: TranslationDetails = {
    pronunciation: asString(result.pronunciation) ?? undefined,
    detectedSource: asString(result.src) ?? undefined,
    confidence: asNumber(raw[6]) ?? undefined,
    correctedText: result.hasCorrectedText
      ? (asString(result.correctedText) ?? undefined)
      : undefined,
    alternatives: extractAlternatives(raw[5]),
    lexicalGroups: extractLexicalGroups(raw[1]),
    definitionGroups: fallbackDefinitionGroups,
  };

  const hasContent =
    !!details.pronunciation ||
    !!details.detectedSource ||
    typeof details.confidence === "number" ||
    !!details.correctedText ||
    details.alternatives.length > 0 ||
    details.lexicalGroups.length > 0 ||
    details.definitionGroups.length > 0;

  return hasContent ? details : undefined;
}

export class GoogleTranslateProvider implements TranslationProvider {
  async translate(request: TranslationRequest): Promise<TranslationResult> {
    let result: Awaited<ReturnType<typeof googletrans>>;

    try {
      result = await withTimeout(
        googletrans(request.text, {
          from: request.source === "auto" ? undefined : request.source,
          to: request.target,
        }),
        GOOGLE_TRANSLATE_TIMEOUT_MS,
      );
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
      details: extractDetails(result),
    };
  }
}

let provider: GoogleTranslateProvider | null = null;

export function getTranslationProvider(): GoogleTranslateProvider {
  if (!provider) provider = new GoogleTranslateProvider();
  return provider;
}
