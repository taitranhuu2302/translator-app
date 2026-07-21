import type { ImproveRequest, TranslationRequest } from "../../shared/types";

function withDirection(source: string, target: string): string {
  const from = source === "auto" ? "auto-detected source" : source;
  return `from ${from} to ${target}`;
}

export function buildImproveSystemPrompt(outputLang: string): string {
  return (
    `You are a professional writing assistant. The user provides a sentence.\n` +
    `Your task: analyze and improve it, then output ONLY a valid JSON object with this exact structure:\n` +
    `{"corrected": "the corrected version in ${outputLang}", "suggestion": "a more elegant alternative in ${outputLang}"}\n` +
    `Rules:\n` +
    `- Output MUST be valid JSON only, no markdown code blocks, no extra text\n` +
    `- Both fields are required and must be non-empty strings`
  );
}

export function buildImproveUserPrompt(req: ImproveRequest): string {
  return `Sentence: ${req.text}`;
}

export function buildTranslateSystemPrompt(req: TranslationRequest): string {
  const direction = withDirection(req.source, req.target);
  const target = req.target;

  const guidelines: string[] = [];

  // IT & technical content — applies regardless of target
  guidelines.push(
    `If the text contains IT/technical content: use proper terminology naturally ` +
      `(e.g., "deploy" → "${target === "vi" ? "triển khai" : "deploy"}, "rollback" → "rollback / khôi phục")`,
  );

  if (target === "vi") {
    guidelines.push(
      `Translate like a Vietnamese professional would write — use lịch sự, tự nhiên, ` +
        `avoid word-by-word literal translation, use proper Vietnamese collocations. ` +
        `Keep common English loanwords where natural (email, meeting, deadline, report, feedback, manager, team, update).`,
    );
  } else {
    guidelines.push(
      `Translate into natural, professional ${target} — use proper grammar and idiomatic expressions. ` +
        `Avoid awkward phrasing that sounds like a machine translation.`,
    );
  }

  guidelines.push(
    "Preserve original formatting (bullet points, line breaks)",
    "Do NOT explain or add any extra text — return the translation only",
  );

  return (
    `You are a professional translator for an office/IT workplace.\n` +
    `Translate ${direction}. Output ONLY the translated text, no explanations.\n` +
    `\n` +
    `Guidelines:\n` +
    guidelines.map((g) => `- ${g}`).join("\n")
  );
}

export function buildTranslateUserPrompt(req: TranslationRequest): string {
  return req.text;
}

type ChatMessage = { role: "system" | "user"; content: string };

export function buildImproveMessages(req: ImproveRequest): ChatMessage[] {
  return [
    { role: "system", content: buildImproveSystemPrompt(req.outputLang) },
    { role: "user", content: buildImproveUserPrompt(req) },
  ];
}

export function buildTranslateMessages(req: TranslationRequest): ChatMessage[] {
  return [
    { role: "system", content: buildTranslateSystemPrompt(req) },
    { role: "user", content: buildTranslateUserPrompt(req) },
  ];
}
