import type { ImproveRequest } from "../../shared/types";

export function buildImproveSystemPrompt(outputLang: string): string {
  const lang = outputLang === "vi" ? "Vietnamese" : "English";
  return (
    `You are a professional writing assistant. The user provides a sentence.\n` +
    `Your task: analyze and improve it, then output ONLY a valid JSON object with this exact structure:\n` +
    `{"corrected": "the corrected version in ${lang}", "suggestion": "a more elegant alternative in ${lang}"}\n` +
    `Rules:\n` +
    `- Output MUST be valid JSON only, no markdown code blocks, no extra text\n` +
    `- Both fields are required and must be non-empty strings`
  );
}

export function buildImproveUserPrompt(req: ImproveRequest): string {
  return `Sentence: ${req.text}`;
}

type ChatMessage = { role: "system" | "user"; content: string };

export function buildImproveMessages(req: ImproveRequest): ChatMessage[] {
  return [
    { role: "system", content: buildImproveSystemPrompt(req.outputLang) },
    { role: "user", content: buildImproveUserPrompt(req) },
  ];
}
