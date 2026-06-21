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
