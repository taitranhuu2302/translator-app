pub mod gemini;
pub mod groq;
pub mod models;
pub mod prompts;

use crate::types::{AppSettings, ImproveRequest, ImproveResult, TranslationRequest, TranslationResult};
use crate::services::translation::google;

fn is_429(msg: &str) -> bool {
    let lower = msg.to_lowercase();
    lower.contains("429") || lower.contains("rate limit") || lower.contains("too many requests")
}

async fn try_improve_with_fallback(
    req: &ImproveRequest,
    api_key: &str,
    preferred_model: &str,
) -> Result<ImproveResult, String> {
    let groq = groq::GroqProvider;
    let gemini = gemini::GeminiProvider;
    let mut last_err = "No models available".to_string();

    let groq_fallbacks = models::groq_fallback_models();
    let model_ids: Vec<String> = {
        let mut v = vec![preferred_model.to_string()];
        for m in groq_fallbacks.iter() {
            if m.id != preferred_model { v.push(m.id.clone()); }
        }
        v
    };

    for model in &model_ids {
        match groq.improve(req, api_key, model).await {
            Ok(r) => return Ok(r),
            Err(e) => {
                if !is_429(&e) { return Err(e); }
                last_err = e;
            }
        }
    }

    for model in &model_ids {
        match gemini.improve(req, api_key, model).await {
            Ok(r) => return Ok(r),
            Err(e) => {
                if !is_429(&e) { return Err(e); }
                last_err = e;
            }
        }
    }

    Err(last_err)
}

async fn try_translate_with_fallback(
    req: &TranslationRequest,
    api_key: &str,
    preferred_model: &str,
) -> Result<TranslationResult, String> {
    let groq = groq::GroqProvider;
    let gemini = gemini::GeminiProvider;
    let mut last_err = "No models available".to_string();

    let groq_fallbacks = models::groq_fallback_models();
    let model_ids: Vec<String> = {
        let mut v = vec![preferred_model.to_string()];
        for m in groq_fallbacks.iter() {
            if m.id != preferred_model { v.push(m.id.clone()); }
        }
        v
    };

    for model in &model_ids {
        match groq.translate(req, api_key, model).await {
            Ok(r) => return Ok(r),
            Err(e) => {
                if !is_429(&e) { return Err(e); }
                last_err = e;
            }
        }
    }

    for model in &model_ids {
        match gemini.translate(req, api_key, model).await {
            Ok(r) => return Ok(r),
            Err(e) => {
                if !is_429(&e) { return Err(e); }
                last_err = e;
            }
        }
    }

    Err(last_err)
}

pub async fn run_improve(
    req: ImproveRequest,
    settings: AppSettings,
) -> Result<ImproveResult, String> {
    match settings.ai_provider.as_str() {
        "groq" => {
            if settings.ai_groq_api_key.trim().is_empty() {
                return Err("API_ERROR: Groq API key is not configured. Please add it in Settings → AI.".into());
            }
            try_improve_with_fallback(&req, &settings.ai_groq_api_key, &settings.ai_groq_model).await
        }
        "gemini" => {
            if settings.ai_gemini_api_key.trim().is_empty() {
                return Err("API_ERROR: Gemini API key is not configured. Please add it in Settings → AI.".into());
            }
            try_improve_with_fallback(&req, &settings.ai_gemini_api_key, &settings.ai_gemini_model).await
        }
        _ => {
            if !settings.ai_groq_api_key.trim().is_empty() {
                match try_improve_with_fallback(&req, &settings.ai_groq_api_key, &settings.ai_groq_model).await {
                    Ok(r) => return Ok(r),
                    Err(e) => if !is_429(&e) { return Err(e); }
                }
            }
            if !settings.ai_gemini_api_key.trim().is_empty() {
                return try_improve_with_fallback(&req, &settings.ai_gemini_api_key, &settings.ai_gemini_model).await;
            }
            Err("API_ERROR: No AI provider is configured. Please add a Groq or Gemini API key in Settings → AI.".into())
        }
    }
}

pub async fn run_ai_translate(
    req: TranslationRequest,
    settings: AppSettings,
    fallback_to_google: bool,
) -> Result<TranslationResult, String> {
    let ai_result = match settings.ai_provider.as_str() {
        "groq" => {
            if settings.ai_groq_api_key.trim().is_empty() {
                Err("API_ERROR: Groq API key is not configured.".into())
            } else {
                try_translate_with_fallback(&req, &settings.ai_groq_api_key, &settings.ai_groq_model).await
            }
        }
        "gemini" => {
            if settings.ai_gemini_api_key.trim().is_empty() {
                Err("API_ERROR: Gemini API key is not configured.".into())
            } else {
                try_translate_with_fallback(&req, &settings.ai_gemini_api_key, &settings.ai_gemini_model).await
            }
        }
        _ => {
            let mut last_err = String::new();
            if !settings.ai_groq_api_key.trim().is_empty() {
                match try_translate_with_fallback(&req, &settings.ai_groq_api_key, &settings.ai_groq_model).await {
                    Ok(r) => return Ok(r),
                    Err(e) => last_err = e,
                }
            }
            if !settings.ai_gemini_api_key.trim().is_empty() {
                match try_translate_with_fallback(&req, &settings.ai_gemini_api_key, &settings.ai_gemini_model).await {
                    Ok(r) => return Ok(r),
                    Err(e) => last_err = e,
                }
            }
            if last_err.is_empty() {
                Err("API_ERROR: No AI provider is configured.".into())
            } else {
                Err(last_err)
            }
        }
    };

    if fallback_to_google {
        if let Ok(google_result) = google::translate(&req).await {
            return Ok(google_result);
        }
    }

    ai_result
}
