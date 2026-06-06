# AI Translation Toggle

**Date:** 2026-06-06
**Status:** approved

## Summary

Add a toggle switch "AI Translation" in the Translation settings section. When enabled, the main Translate tab uses AI (Groq/Gemini) instead of Google Translate. Disabled by default.

## Decisions

| Question | Answer |
|----------|--------|
| Scope | Main Translate tab only. Quick translate popup unchanged (keeps existing word-count routing). |
| Fallback on AI error | Show error to user. No silent fallback to Google Translate. |
| Default state | Off (disabled). Users opt-in after configuring an AI provider. |

## Behavior

| `useAiTranslation` | Translate tab behavior |
|---|---|
| `false` (default) | Google Translate (unchanged) |
| `true` | AI translation via `runAiTranslate()`. Respects `aiProvider` setting (groq/gemini/auto). If AI fails → return error to user. |

## Files to Change

1. **`src/shared/types.ts`** — add `useAiTranslation: boolean` to `AppSettings`, default `false`
2. **`src/renderer/features/settings/translation-section.tsx`** — add `<Switch>` toggle for AI Translation
3. **`src/main/ipc/register-ipc-handlers.ts`** — `translate.manual` handler: check setting, route to AI or Google

## Data Flow

```
translate-page → translate.manual IPC
  → check settings.useAiTranslation
    ├── false → GoogleTranslateProvider.translate()
    └── true  → ai-service.runAiTranslate()
                  ├── ok  → return TranslationResult
                  └── err → return err() to user (show error toast)
```
