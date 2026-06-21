use crate::types::{AiModelOption, ImproveResult};

pub fn groq_fallback_models() -> Vec<AiModelOption> {
    vec![
        AiModelOption { id: "llama-3.3-70b-versatile".into(), label: "Llama 3.3 70B".into(), provider: "groq".into() },
        AiModelOption { id: "llama-3.1-8b-instant".into(), label: "Llama 3.1 8B (fast)".into(), provider: "groq".into() },
        AiModelOption { id: "gemma2-9b-it".into(), label: "Gemma 2 9B".into(), provider: "groq".into() },
    ]
}

pub fn gemini_fallback_models() -> Vec<AiModelOption> {
    vec![
        AiModelOption { id: "gemini-2.0-flash".into(), label: "Gemini 2.0 Flash".into(), provider: "gemini".into() },
        AiModelOption { id: "gemini-1.5-flash".into(), label: "Gemini 1.5 Flash".into(), provider: "gemini".into() },
        AiModelOption { id: "gemini-1.5-flash-8b".into(), label: "Gemini 1.5 Flash 8B".into(), provider: "gemini".into() },
    ]
}

pub fn parse_improve_output(raw: &str, provider: &str, model: &str) -> ImproveResult {
    let cleaned = raw
        .trim()
        .replace(|c: char| c == '`', "")
        .trim()
        .to_string();

    let cleaned = if cleaned.starts_with("json") {
        cleaned[4..].trim().to_string()
    } else {
        cleaned
    };

    match serde_json::from_str::<serde_json::Value>(&cleaned) {
        Ok(val) => {
            let corrected = val.get("corrected").and_then(|v| v.as_str()).unwrap_or(raw.trim()).to_string();
            let suggestion = val.get("suggestion").and_then(|v| v.as_str()).unwrap_or("").to_string();
            ImproveResult { corrected, suggestion, provider: provider.into(), model: model.into() }
        }
        Err(_) => {
            ImproveResult {
                corrected: raw.trim().into(),
                suggestion: "(Parse error)".into(),
                provider: provider.into(),
                model: model.into(),
            }
        }
    }
}
