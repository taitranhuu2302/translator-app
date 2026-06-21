use crate::services::ai::{models, prompts};
use crate::types::{AiModelOption, ImproveRequest, ImproveResult, TranslationRequest, TranslationResult};

pub struct GeminiProvider;

impl GeminiProvider {
    pub async fn translate(
        &self,
        req: &TranslationRequest,
        api_key: &str,
        model: &str,
    ) -> Result<TranslationResult, String> {
        let url = format!(
            "https://generativelanguage.googleapis.com/v1beta/models/{}:generateContent?key={}",
            model, api_key
        );

        let body = serde_json::json!({
            "contents": [{
                "parts": [{"text": prompts::build_translate_user_prompt(req)}]
            }],
            "systemInstruction": {
                "parts": [{"text": prompts::build_translate_system_prompt(req)}]
            },
            "generationConfig": {
                "maxOutputTokens": 1024,
                "temperature": 0.2,
                "thinkingConfig": { "thinkingBudget": 0 }
            }
        });

        let text = call_gemini(&url, body).await?;
        if text.is_empty() {
            return Err("API_ERROR: Empty translation response from Gemini".into());
        }

        Ok(TranslationResult {
            translation: text,
            source_text: req.text.clone(),
            source: req.source.clone(),
            target: req.target.clone(),
            details: None,
        })
    }

    pub async fn improve(
        &self,
        req: &ImproveRequest,
        api_key: &str,
        model: &str,
    ) -> Result<ImproveResult, String> {
        let url = format!(
            "https://generativelanguage.googleapis.com/v1beta/models/{}:generateContent?key={}",
            model, api_key
        );

        let body = serde_json::json!({
            "contents": [{
                "parts": [{"text": prompts::build_improve_user_prompt(req)}]
            }],
            "systemInstruction": {
                "parts": [{"text": prompts::build_improve_system_prompt(&req.output_lang)}]
            },
            "generationConfig": {
                "maxOutputTokens": 256,
                "temperature": 0.4,
                "thinkingConfig": { "thinkingBudget": 0 }
            }
        });

        let text = call_gemini(&url, body).await?;
        Ok(models::parse_improve_output(&text, "gemini", model))
    }

    pub async fn list_models(&self, api_key: &str) -> Vec<AiModelOption> {
        let url = format!(
            "https://generativelanguage.googleapis.com/v1beta/models?key={}",
            api_key
        );
        let client = reqwest::Client::new();
        match client.get(&url).send().await {
            Ok(resp) => {
                if let Ok(json) = resp.json::<serde_json::Value>().await {
                    if let Some(arr) = json["models"].as_array() {
                        let models: Vec<_> = arr.iter()
                            .filter(|m| m["name"].as_str().map_or(false, |n| n.starts_with("models/gemini")))
                            .map(|m| {
                                let name = m["name"].as_str().unwrap_or("").replace("models/", "");
                                let display = m["displayName"].as_str().map(|s| s.to_string()).unwrap_or_else(|| name.clone());
                                AiModelOption { id: name, label: display, provider: "gemini".into() }
                            })
                            .collect();
                        if !models.is_empty() { return models; }
                    }
                }
                models::gemini_fallback_models()
            }
            Err(_) => models::gemini_fallback_models(),
        }
    }
}

async fn call_gemini(url: &str, body: serde_json::Value) -> Result<String, String> {
    let client = reqwest::Client::new();
    let resp = client
        .post(url)
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("NETWORK_ERROR: {}", e))?;

    let status = resp.status();
    let json: serde_json::Value = resp.json().await.map_err(|e| format!("API_ERROR: {}", e))?;

    if !status.is_success() {
        let msg = json["error"]["message"].as_str().unwrap_or("Unknown error");
        return Err(format!("API_ERROR: Gemini {} — {}", status.as_u16(), msg));
    }

    Ok(json["candidates"][0]["content"]["parts"][0]["text"]
        .as_str()
        .unwrap_or("")
        .trim()
        .to_string())
}
