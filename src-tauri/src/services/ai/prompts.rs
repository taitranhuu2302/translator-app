use crate::types::{ImproveRequest, TranslationRequest};

fn language_name(code: &str) -> &str {
    if code == "vi" { "Vietnamese" } else { "English" }
}

pub fn build_improve_system_prompt(output_lang: &str) -> String {
    let lang = language_name(output_lang);
    format!(
        "You are a professional writing assistant. The user provides a sentence.\n\
         Your task: analyze and improve it, then output ONLY a valid JSON object with this exact structure:\n\
         {{\"corrected\": \"the corrected version in {lang}\", \"suggestion\": \"a more elegant alternative in {lang}\"}}\n\
         Rules:\n\
         - Output MUST be valid JSON only, no markdown code blocks, no extra text\n\
         - Both fields are required and must be non-empty strings"
    )
}

pub fn build_improve_user_prompt(req: &ImproveRequest) -> String {
    format!("Sentence: {}", req.text)
}

pub fn build_translate_system_prompt(req: &TranslationRequest) -> String {
    let target = language_name(&req.target);
    let source = if req.source == "auto" {
        "the source language".to_string()
    } else {
        language_name(&req.source).to_string()
    };
    format!(
        "You are a translation engine. Translate the user's text from {source} into {target}.\n\
         Rules:\n\
         - Return only the translated text\n\
         - Do not explain anything\n\
         - Preserve the original meaning, tone, and formatting where possible"
    )
}

pub fn build_translate_user_prompt(req: &TranslationRequest) -> String {
    req.text.clone()
}
