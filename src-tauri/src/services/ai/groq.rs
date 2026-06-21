use crate::services::ai::{models, prompts};
use crate::types::{AiModelOption, ImproveRequest, ImproveResult, TranslationRequest, TranslationResult};

pub struct GroqProvider;

impl GroqProvider {
    pub async fn translate(
        &self,
        req: &TranslationRequest,
        api_key: &str,
        model: &str,
    ) -> Result<TranslationResult, String> {
        let messages = serde_json::json!([
            {"role": "system", "content": prompts::build_translate_system_prompt(req)},
            {"role": "user", "content": prompts::build_translate_user_prompt(req)},
        ]);

        let body = serde_json::json!({
            "model": model,
            "messages": messages,
            "max_tokens": 1024,
            "temperature": 0.2,
        });

        let text = call_groq_chat(api_key, body).await?;
        if text.is_empty() {
            return Err("API_ERROR: Empty translation response from Groq".into());
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
        let messages = serde_json::json!([
            {"role": "system", "content": prompts::build_improve_system_prompt(&req.output_lang)},
            {"role": "user", "content": prompts::build_improve_user_prompt(req)},
        ]);

        let body = serde_json::json!({
            "model": model,
            "messages": messages,
            "max_tokens": 256,
            "temperature": 0.4,
        });

        let text = call_groq_chat(api_key, body).await?;
        Ok(models::parse_improve_output(&text, "groq", model))
    }

    pub async fn list_models(&self, api_key: &str) -> Vec<AiModelOption> {
        let client = reqwest::Client::new();
        match client
            .get("https://api.groq.com/openai/v1/models")
            .bearer_auth(api_key)
            .send()
            .await
        {
            Ok(resp) => {
                if let Ok(json) = resp.json::<serde_json::Value>().await {
                    if let Some(arr) = json["data"].as_array() {
                        let models: Vec<_> = arr.iter()
                            .filter(|m| m["id"].as_str().map_or(false, |id| {
                                !id.contains("whisper") && !id.contains("guard")
                            }))
                            .map(|m| AiModelOption {
                                id: m["id"].as_str().unwrap_or("").into(),
                                label: m["id"].as_str().unwrap_or("").into(),
                                provider: "groq".into(),
                            })
                            .collect();
                        if !models.is_empty() { return models; }
                    }
                }
                models::groq_fallback_models()
            }
            Err(_) => models::groq_fallback_models(),
        }
    }
}

async fn call_groq_chat(api_key: &str, body: serde_json::Value) -> Result<String, String> {
    let client = reqwest::Client::new();
    let resp = client
        .post("https://api.groq.com/openai/v1/chat/completions")
        .bearer_auth(api_key)
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("NETWORK_ERROR: {}", e))?;

    let status = resp.status();
    let json: serde_json::Value = resp.json().await.map_err(|e| format!("API_ERROR: {}", e))?;

    if !status.is_success() {
        let msg = json["error"]["message"].as_str().unwrap_or("Unknown error");
        return Err(format!("API_ERROR: Groq {} — {}", status.as_u16(), msg));
    }

    Ok(json["choices"][0]["message"]["content"]
        .as_str()
        .unwrap_or("")
        .trim()
        .to_string())
}
