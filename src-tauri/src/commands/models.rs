use crate::services::ai::{gemini::GeminiProvider, groq::GroqProvider};
use crate::types::{AiModelOption};

#[tauri::command]
pub async fn models_list_groq(api_key: String) -> Vec<AiModelOption> {
    let provider = GroqProvider;
    provider.list_models(&api_key).await
}

#[tauri::command]
pub async fn models_list_gemini(api_key: String) -> Vec<AiModelOption> {
    let provider = GeminiProvider;
    provider.list_models(&api_key).await
}
