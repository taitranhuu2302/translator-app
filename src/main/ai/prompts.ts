import type { ImproveRequest, TranslationRequest } from "../../shared/types";

function languageName(code: string): string {
  return code === "vi" ? "Vietnamese" : "English";
}

export function buildImproveSystemPrompt(outputLang: string): string {
  const lang = languageName(outputLang);
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

export function buildTranslateSystemPrompt(req: TranslationRequest): string {
  const targetLanguage = languageName(req.target);
  const sourceLanguage =
    req.source === "auto" ? "the source language" : languageName(req.source);

  return (
    `You are a translation engine. Translate the user's text from ${sourceLanguage} into ${targetLanguage}.\n` +
    `Rules:\n` +
    `- Return only the translated text\n` +
    `- Do not explain anything\n` +
    `- Preserve the original meaning, tone, and formatting where possible`
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
