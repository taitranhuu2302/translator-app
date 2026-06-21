# Phase 2: Translation Engine — Groq, Gemini, Google Translate

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Full translation pipeline in Rust — Groq + Gemini AI translation/improvement with rate-limit fallback, Google Translate for short text, and model listing commands. Translate + Improve pages work via `invoke()`.

**Architecture:** Direct HTTP calls via `reqwest` to Groq (`api.groq.com/`), Gemini (`generativelanguage.googleapis.com/`), and Google Translate (`translate.googleapis.com/`). Prompts and fallback logic ported verbatim from TypeScript. Config stored in AppSettings (Phase 1).

**Tech Stack:** reqwest 0.12 (HTTP), serde_json (response parsing), tauri (async commands)

**Branch:** `main-rust`

---

### Task 2.1: Add deps, scaffold modules, add types

**Files:**
- Modify: `src-tauri/Cargo.toml`
- Modify: `src-tauri/src/types.rs`
- Create: `src-tauri/src/services/mod.rs`
- Create: `src-tauri/src/services/ai/mod.rs`
- Create: `src-tauri/src/services/translation/mod.rs`

- [ ] **Step 1: Add reqwest to Cargo.toml**
```toml
[dependencies]
tauri = { version = "2", features = [] }
tauri-plugin-shell = "2"
tauri-plugin-clipboard-manager = "2"
reqwest = { version = "0.12", features = ["json"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
```

- [ ] **Step 2: Add AiModelOption, ImproveRequest, ImproveResult to types.rs**
```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AiModelOption {
    pub id: String,
    pub label: String,
    pub provider: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImproveRequest {
    pub text: String,
    pub output_lang: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImproveResult {
    pub corrected: String,
    pub suggestion: String,
    pub provider: String,
    pub model: String,
}
```

- [ ] **Step 3: Create service mod files**
```rust
// src/services/mod.rs
pub mod ai;
pub mod translation;
```

- [ ] **Step 4: Commit** — `git add -A && git commit -m "feat: add reqwest, AiModelOption, ImproveResult to Rust types"`

---

### Task 2.2: Create AI prompts

**File:** Create `src-tauri/src/services/ai/prompts.rs`

Ported verbatim from TypeScript prompts. Returns strings for system/user messages.

- [ ] **Step 1: Create src-tauri/src/services/ai/prompts.rs**
```rust
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
```

- [ ] **Step 2: Commit** — `git add -A && git commit -m "feat: port AI prompts to Rust"`

---

### Task 2.3: Create model defaults + parseImproveOutput

**File:** Create `src-tauri/src/services/ai/models.rs`

Fallback model lists (used when API listing fails) and the JSON parser for improve responses.

- [ ] **Step 1: Create src-tauri/src/services/ai/models.rs**
```rust
use crate::types::{AiModelOption, ImproveResult};

pub const GROQ_FALLBACK_MODELS: &[AiModelOption] = &[
    AiModelOption { id: "llama-3.3-70b-versatile".into(), label: "Llama 3.3 70B".into(), provider: "groq".into() },
    AiModelOption { id: "llama-3.1-8b-instant".into(), label: "Llama 3.1 8B (fast)".into(), provider: "groq".into() },
    AiModelOption { id: "gemma2-9b-it".into(), label: "Gemma 2 9B".into(), provider: "groq".into() },
];

pub const GEMINI_FALLBACK_MODELS: &[AiModelOption] = &[
    AiModelOption { id: "gemini-2.0-flash".into(), label: "Gemini 2.0 Flash".into(), provider: "gemini".into() },
    AiModelOption { id: "gemini-1.5-flash".into(), label: "Gemini 1.5 Flash".into(), provider: "gemini".into() },
    AiModelOption { id: "gemini-1.5-flash-8b".into(), label: "Gemini 1.5 Flash 8B".into(), provider: "gemini".into() },
];

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
```

- [ ] **Step 2: Commit** — `git add -A && git commit -m "feat: add fallback model lists and improve JSON parser"`

---

### Task 2.4: Create Groq provider

**File:** Create `src-tauri/src/services/ai/groq.rs`

HTTP client for `POST https://api.groq.com/openai/v1/chat/completions`. Uses serde_json::Value for flexible response parsing.

- [ ] **Step 1: Create src-tauri/src/services/ai/groq.rs**
```rust
use crate::services::ai::models;
use crate::services::ai::prompts;
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
                    let models = json["data"].as_array().map(|arr| {
                        arr.iter()
                            .filter(|m| {
                                m["id"].as_str().map_or(false, |id| {
                                    !id.contains("whisper") && !id.contains("guard")
                                })
                            })
                            .map(|m| AiModelOption {
                                id: m["id"].as_str().unwrap_or("").into(),
                                label: m["id"].as_str().unwrap_or("").into(),
                                provider: "groq".into(),
                            })
                            .collect::<Vec<_>>()
                    });
                    if let Some(list) = models {
                        if !list.is_empty() { return list; }
                    }
                }
                models::GROQ_FALLBACK_MODELS.to_vec()
            }
            Err(_) => models::GROQ_FALLBACK_MODELS.to_vec(),
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
```

- [ ] **Step 2: Commit** — `git add -A && git commit -m "feat: implement Groq HTTP API client"`

---

### Task 2.5: Create Gemini provider

**File:** Create `src-tauri/src/services/ai/gemini.rs`

HTTP client for `POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={apiKey}`.

- [ ] **Step 1: Create src-tauri/src/services/ai/gemini.rs**
```rust
use crate::services::ai::models;
use crate::services::ai::prompts;
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
                    let models = json["models"].as_array().map(|arr| {
                        arr.iter()
                            .filter(|m| {
                                m["name"].as_str().map_or(false, |n| n.starts_with("models/gemini"))
                            })
                            .map(|m| {
                                let name = m["name"].as_str().unwrap_or("").replace("models/", "");
                                let display = m["displayName"].as_str().unwrap_or(&name);
                                AiModelOption {
                                    id: name,
                                    label: display.into(),
                                    provider: "gemini".into(),
                                }
                            })
                            .collect::<Vec<_>>()
                    });
                    if let Some(list) = models {
                        if !list.is_empty() { return list; }
                    }
                }
                models::GEMINI_FALLBACK_MODELS.to_vec()
            }
            Err(_) => models::GEMINI_FALLBACK_MODELS.to_vec(),
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
```

- [ ] **Step 2: Commit** — `git add -A && git commit -m "feat: implement Gemini HTTP API client"`

---

### Task 2.6: Create Google Translate provider

**File:** Create `src-tauri/src/services/translation/google.rs`

Uses the undocumented `translate.googleapis.com/translate_a/single` API — same as the existing `googletrans` npm package.

- [ ] **Step 1: Create src-tauri/src/services/translation/google.rs**
```rust
use crate::types::{TranslationRequest, TranslationResult};

const GOOGLE_TRANSLATE_TIMEOUT: std::time::Duration = std::time::Duration::from_secs(30);

pub async fn translate(req: &TranslationRequest) -> Result<TranslationResult, String> {
    let source = if req.source == "auto" { "" } else { &req.source };

    let url = format!(
        "https://translate.googleapis.com/translate_a/single?client=gtx&sl={}&tl={}&dt=t&q={}",
        source,
        req.target,
        urlencoding(&req.text)
    );

    let client = reqwest::Client::builder()
        .timeout(GOOGLE_TRANSLATE_TIMEOUT)
        .build()
        .map_err(|e| format!("NETWORK_ERROR: {}", e))?;

    let resp = client
        .get(&url)
        .send()
        .await
        .map_err(|e| {
            if e.is_timeout() {
                "TIMEOUT: Translation request timed out".to_string()
            } else {
                format!("NETWORK_ERROR: {}", e)
            }
        })?;

    let status = resp.status();
    let body = resp.text().await.map_err(|e| format!("API_ERROR: {}", e))?;

    if !status.is_success() {
        return Err(format!("API_ERROR: Google Translate {} — {}", status.as_u16(), body));
    }

    let json: serde_json::Value = serde_json::from_str(&body)
        .map_err(|e| format!("API_ERROR: Invalid response — {}", e))?;

    let translation = json[0][0][0].as_str().unwrap_or("").to_string();
    if translation.is_empty() {
        return Err("API_ERROR: Empty translation from Google".into());
    }

    Ok(TranslationResult {
        translation,
        source_text: req.text.clone(),
        source: req.source.clone(),
        target: req.target.clone(),
        details: None,
    })
}

fn urlencoding(text: &str) -> String {
    // Simple percent-encoding for URL
    let mut result = String::with_capacity(text.len() * 3);
    for byte in text.bytes() {
        match byte {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                result.push(byte as char);
            }
            b' ' => result.push_str("%20"),
            _ => {
                result.push_str(&format!("%{:02X}", byte));
            }
        }
    }
    result
}
```

- [ ] **Step 2: Commit** — `git add -A && git commit -m "feat: implement Google Translate HTTP API client"`

---

### Task 2.7: Create translation routing + service mod

**Files:**
- Create: `src-tauri/src/services/translation/mod.rs`
- Create: `src-tauri/src/services/ai/mod.rs` (orchestration)

- [ ] **Step 1: Create src-tauri/src/services/translation/mod.rs**
```rust
pub mod google;

pub fn count_words(text: &str) -> usize {
    text.trim().split_whitespace().count()
}

pub fn should_use_google_translate(text: &str) -> bool {
    count_words(text) <= 2
}
```

- [ ] **Step 2: Create src-tauri/src/services/ai/mod.rs**
```rust
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

    let models: Vec<&str> = {
        let mut v = vec![preferred_model];
        for m in models::GROQ_FALLBACK_MODELS.iter() {
            if m.id != preferred_model { v.push(&m.id); }
        }
        v
    };

    for model in &models {
        // Try Groq first
        match groq.improve(req, api_key, model).await {
            Ok(r) => return Ok(r),
            Err(e) => {
                if !is_429(&e) { return Err(e); }
                last_err = e;
            }
        }
    }

    for model in &models {
        // Then Gemini
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

    let models: Vec<&str> = {
        let mut v = vec![preferred_model];
        for m in models::GROQ_FALLBACK_MODELS.iter() {
            if m.id != preferred_model { v.push(&m.id); }
        }
        v
    };

    for model in &models {
        match groq.translate(req, api_key, model).await {
            Ok(r) => return Ok(r),
            Err(e) => {
                if !is_429(&e) { return Err(e); }
                last_err = e;
            }
        }
    }

    for model in &models {
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
    let try_provider = |api_key: &str, model: &str| async {
        try_improve_with_fallback(&req, api_key, model).await
    };

    match settings.ai_provider.as_str() {
        "groq" => {
            if settings.ai_groq_api_key.trim().is_empty() {
                return Err("API_ERROR: Groq API key is not configured. Please add it in Settings → AI.".into());
            }
            try_provider(&settings.ai_groq_api_key, &settings.ai_groq_model).await
        }
        "gemini" => {
            if settings.ai_gemini_api_key.trim().is_empty() {
                return Err("API_ERROR: Gemini API key is not configured. Please add it in Settings → AI.".into());
            }
            try_provider(&settings.ai_gemini_api_key, &settings.ai_gemini_model).await
        }
        _ => {
            // auto — try Groq first, then Gemini
            if !settings.ai_groq_api_key.trim().is_empty() {
                match try_provider(&settings.ai_groq_api_key, &settings.ai_groq_model).await {
                    Ok(r) => return Ok(r),
                    Err(e) => if !is_429(&e) { return Err(e); }
                }
            }
            if !settings.ai_gemini_api_key.trim().is_empty() {
                return try_provider(&settings.ai_gemini_api_key, &settings.ai_gemini_model).await;
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
    let try_provider = |api_key: &str, model: &str| async {
        try_translate_with_fallback(&req, api_key, model).await
    };

    let ai_result = match settings.ai_provider.as_str() {
        "groq" => {
            if settings.ai_groq_api_key.trim().is_empty() {
                Err("API_ERROR: Groq API key is not configured.".into())
            } else {
                try_provider(&settings.ai_groq_api_key, &settings.ai_groq_model).await
            }
        }
        "gemini" => {
            if settings.ai_gemini_api_key.trim().is_empty() {
                Err("API_ERROR: Gemini API key is not configured.".into())
            } else {
                try_provider(&settings.ai_gemini_api_key, &settings.ai_gemini_model).await
            }
        }
        _ => {
            let mut last_err = String::new();
            if !settings.ai_groq_api_key.trim().is_empty() {
                match try_provider(&settings.ai_groq_api_key, &settings.ai_groq_model).await {
                    Ok(r) => return Ok(r),
                    Err(e) => last_err = e,
                }
            }
            if !settings.ai_gemini_api_key.trim().is_empty() {
                match try_provider(&settings.ai_gemini_api_key, &settings.ai_gemini_model).await {
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
```

- [ ] **Step 3: Commit** — `git add -A && git commit -m "feat: implement AI orchestration with provider/fallback logic"`

---

### Task 2.8: Create translate, improve, models commands

**Files:**
- Create: `src-tauri/src/commands/translate.rs`
- Create: `src-tauri/src/commands/improve.rs`
- Create: `src-tauri/src/commands/models.rs`

- [ ] **Step 1: Create src-tauri/src/commands/translate.rs**
```rust
use tauri::State;
use crate::services::ai;
use crate::stores::settings::SettingsState;
use crate::types::{ImproveRequest, ImproveResult, Result, TranslationRequest, TranslationResult};

#[tauri::command]
pub async fn translate_manual(
    settings_state: State<'_, SettingsState>,
    request: TranslationRequest,
) -> Result<TranslationResult> {
    let settings = { settings_state.0.lock().unwrap().get() };
    match ai::run_ai_translate(request, settings, true).await {
        Ok(data) => Result::ok(data),
        Err(e) => Result::err(crate::types::AppErrorCode::ApiError, e),
    }
}
```

- [ ] **Step 2: Create src-tauri/src/commands/improve.rs**
```rust
use tauri::State;
use crate::services::ai;
use crate::stores::settings::SettingsState;
use crate::types::{ImproveRequest, ImproveResult, Result};

#[tauri::command]
pub async fn improve_run(
    settings_state: State<'_, SettingsState>,
    request: ImproveRequest,
) -> Result<ImproveResult> {
    let settings = { settings_state.0.lock().unwrap().get() };
    match ai::run_improve(request, settings).await {
        Ok(data) => Result::ok(data),
        Err(e) => Result::err(crate::types::AppErrorCode::ApiError, e),
    }
}
```

- [ ] **Step 3: Create src-tauri/src/commands/models.rs**
```rust
use crate::services::ai::{gemini::GeminiProvider, groq::GroqProvider};
use crate::types::{AiModelOption, Result};

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
```

- [ ] **Step 4: Update commands/mod.rs**
```rust
pub mod clipboard;
pub mod history;
pub mod improve;
pub mod models;
pub mod settings;
pub mod translate;
```

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat: add translate, improve, models commands"`

---

### Task 2.9: Wire in lib.rs

**File:** Modify `src-tauri/src/lib.rs`

Add new module declarations and register new commands.

- [ ] **Step 1: Update src-tauri/src/lib.rs**
```rust
mod commands;
mod services;
mod stores;
mod types;

use std::sync::Mutex;
use tauri::Manager;

use stores::history::HistoryStore;
use stores::settings::SettingsStore;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .setup(|app| {
            let app_data_dir = app
                .path()
                .app_data_dir()
                .expect("failed to resolve app data dir");

            let settings_store = SettingsStore::new(app_data_dir.clone());
            let history_store = HistoryStore::new(app_data_dir);

            app.manage(stores::settings::SettingsState(Mutex::new(settings_store)));
            app.manage(stores::history::HistoryState(Mutex::new(history_store)));

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::settings::settings_get,
            commands::settings::settings_update,
            commands::settings::settings_reset_shortcuts,
            commands::history::history_list,
            commands::history::history_delete,
            commands::history::history_clear,
            commands::clipboard::clipboard_write,
            commands::translate::translate_manual,
            commands::improve::improve_run,
            commands::models::models_list_groq,
            commands::models::models_list_gemini,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

- [ ] **Step 2: Commit** — `git add -A && git commit -m "feat: wire Phase 2 commands and services in lib.rs"`

---

### Task 2.10: Build & verify

- [ ] **Step 1: Build**
```bash
cargo build --manifest-path src-tauri/Cargo.toml 2>&1
```

- [ ] **Step 2: Fix any compilation errors** — most likely missing imports, wrong type names, or field name mismatches (camelCase vs snake_case in serde)

- [ ] **Step 3: Update bridge.ts stubs** to wire translate/improve/models to invoke

Edit `src/renderer/lib/bridge.ts`:

```typescript
translate: {
  manual: (request: TranslationRequest): Promise<Result<TranslationResult>> =>
    invoke<Result<TranslationResult>>("translate_manual", { request }),
},

improve: {
  run: (request: ImproveRequest): Promise<Result<ImproveResult>> =>
    invoke<Result<ImproveResult>>("improve_run", { request }),
},

models: {
  listGroq: (apiKey: string): Promise<AiModelOption[]> =>
    invoke<AiModelOption[]>("models_list_groq", { apiKey }),
  listGemini: (apiKey: string): Promise<AiModelOption[]> =>
    invoke<AiModelOption[]>("models_list_gemini", { apiKey }),
},
```

- [ ] **Step 4: TypeScript typecheck**
```bash
pnpm typecheck
```

- [ ] **Step 5: Verify dev server**
```bash
pnpm tauri dev
```

- [ ] **Step 6: Final commit**
```bash
git add -A && git commit -m "feat: complete Phase 2 — translation engine (Groq, Gemini, Google Translate)"
```
