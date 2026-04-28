export type LanguageCode = "vi" | "en";
export type TranslateSource = "auto" | "vi" | "en";
export type ManualDirection = "vi-en" | "en-vi";
export type TranslationMode = "manual" | "auto";

// ─── AI Provider ──────────────────────────────────────────────────────────────

export type AiProvider = "groq" | "gemini" | "auto";

export interface AiModelOption {
  id: string;
  label: string;
  provider: Exclude<AiProvider, "auto">;
}

export const ALL_AI_MODELS = [] as AiModelOption[];

// ─── Improve ─────────────────────────────────────────────────────────────────

export interface ImproveRequest {
  text: string;
  outputLang: LanguageCode;
}

export interface ImproveResult {
  corrected: string; // corrected/improved version of input
  suggestion: string; // alternative, more elegant phrasing
  provider: Exclude<AiProvider, "auto">;
  model: string;
}

// ─── History ─────────────────────────────────────────────────────────────────

export type HistoryItemType = "translate" | "improve";

export interface HistoryItem {
  id: number;
  type: HistoryItemType;
  input: string;
  output: string; // translation or corrected sentence
  output2: string | null; // suggestion (improve only)
  langFrom: string;
  langTo: string;
  provider: string | null;
  createdAt: string; // ISO timestamp
}

export interface TranslationRequest {
  source: TranslateSource;
  target: LanguageCode;
  text: string;
}

export interface TranslationTermMeaning {
  term: string;
  meanings: string[];
}

export interface TranslationLexicalGroup {
  partOfSpeech: string;
  terms: string[];
  base: string;
  entries: TranslationTermMeaning[];
}

export interface TranslationDefinitionItem {
  definition: string;
  example?: string;
}

export interface TranslationDefinitionGroup {
  partOfSpeech: string;
  base: string;
  items: TranslationDefinitionItem[];
}

export interface TranslationDetails {
  pronunciation?: string;
  detectedSource?: string;
  confidence?: number;
  correctedText?: string;
  alternatives: string[];
  lexicalGroups: TranslationLexicalGroup[];
  definitionGroups: TranslationDefinitionGroup[];
}

export interface TranslationResult {
  translation: string;
  sourceText: string;
  source: TranslateSource;
  target: LanguageCode;
  details?: TranslationDetails;
}

export interface AppSettings {
  version: number;
  // Translation
  translationMode: TranslationMode;
  manualDirection: ManualDirection;
  quickTargetLanguage: LanguageCode;
  quickReplaceTargetLanguage: LanguageCode;
  // AI
  aiProvider: AiProvider;
  aiGroqApiKey: string;
  aiGroqModel: string;
  aiGeminiApiKey: string;
  aiGeminiModel: string;
  improveOutputLang: LanguageCode;
  // Shortcuts
  quickTranslateShortcut: string;
  quickTranslateReplaceShortcut: string;
  toggleAppShortcut: string;
  voiceTextShortcut: string;
  // Behavior
  autoCopyDelayMs: number;
  restoreClipboard: boolean;
  popupAlwaysOnTop: boolean;
  startMinimized: boolean;
  // Voice (Text-to-Speech)
  ttsVoiceURI: string; // empty = auto pick by language
  ttsRate: number; // 0.1 - 10 (Web Speech API), UI clamps to a sensible range
  ttsPitch: number; // 0 - 2
  ttsVolume: number; // 0 - 1
  // Data
  maxHistoryItems: number; // 0 = unlimited
}

export const DEFAULT_SETTINGS: AppSettings = {
  version: 5,
  translationMode: "manual",
  manualDirection: "vi-en",
  quickTargetLanguage: "vi",
  quickReplaceTargetLanguage: "en",
  aiProvider: "auto",
  aiGroqApiKey: "",
  aiGroqModel: "llama-3.3-70b-versatile",
  aiGeminiApiKey: "",
  aiGeminiModel: "gemini-2.0-flash",
  improveOutputLang: "en",
  quickTranslateShortcut: "CommandOrControl+Alt+Q",
  toggleAppShortcut: "CommandOrControl+Alt+E",
  quickTranslateReplaceShortcut: "CommandOrControl+Alt+R",
  voiceTextShortcut: "CommandOrControl+Alt+D",
  autoCopyDelayMs: 200,
  restoreClipboard: true,
  popupAlwaysOnTop: true,
  startMinimized: false,
  ttsVoiceURI: "",
  ttsRate: 1,
  ttsPitch: 1,
  ttsVolume: 1,
  maxHistoryItems: 500,
};

export type AppErrorCode =
  | "EMPTY_TEXT"
  | "SELECTION_CAPTURE_FAILED"
  | "NETWORK_ERROR"
  | "TIMEOUT"
  | "API_ERROR"
  | "SHORTCUT_CONFLICT"
  | "SHORTCUT_INVALID"
  | "SHORTCUT_REGISTER_FAILED"
  | "CLIPBOARD_RESTORE_FAILED"
  | "POPUP_NOT_READY"
  | "UNKNOWN";

export interface AppError {
  code: AppErrorCode;
  message: string;
}

export type Result<T> =
  | { success: true; data: T }
  | { success: false; error: AppError };

export function ok<T>(data: T): Result<T> {
  return { success: true, data };
}

export function err(code: AppErrorCode, message: string): Result<never> {
  return { success: false, error: { code, message } };
}

export function isOk<T>(r: Result<T>): r is { success: true; data: T } {
  return r.success === true;
}

export function isErr<T>(
  r: Result<T>,
): r is { success: false; error: AppError } {
  return r.success === false;
}

export interface QuickTranslatePayload {
  original: string;
  translated: string;
  source: TranslateSource;
  target: LanguageCode;
}
