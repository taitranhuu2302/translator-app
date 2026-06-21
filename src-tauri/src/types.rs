use serde::{Deserialize, Serialize};

pub type LanguageCode = String;
pub type TranslateSource = String;
pub type ManualDirection = String;
pub type TranslationMode = String;
pub type AiProvider = String;
pub type HistoryItemType = String;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppError {
    pub code: AppErrorCode,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum AppErrorCode {
    #[serde(rename = "EMPTY_TEXT")]
    EmptyText,
    #[serde(rename = "SELECTION_CAPTURE_FAILED")]
    SelectionCaptureFailed,
    #[serde(rename = "NETWORK_ERROR")]
    NetworkError,
    #[serde(rename = "TIMEOUT")]
    Timeout,
    #[serde(rename = "API_ERROR")]
    ApiError,
    #[serde(rename = "SHORTCUT_CONFLICT")]
    ShortcutConflict,
    #[serde(rename = "SHORTCUT_INVALID")]
    ShortcutInvalid,
    #[serde(rename = "SHORTCUT_REGISTER_FAILED")]
    ShortcutRegisterFailed,
    #[serde(rename = "CLIPBOARD_RESTORE_FAILED")]
    ClipboardRestoreFailed,
    #[serde(rename = "POPUP_NOT_READY")]
    PopupNotReady,
    #[serde(rename = "UNKNOWN")]
    Unknown,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Result<T: Serialize> {
    pub success: bool,
    pub data: Option<T>,
    pub error: Option<AppError>,
}

impl<T: Serialize> Result<T> {
    pub fn ok(data: T) -> Self {
        Self { success: true, data: Some(data), error: None }
    }

    pub fn err(code: AppErrorCode, message: impl Into<String>) -> Self {
        Self {
            success: false,
            data: None,
            error: Some(AppError { code, message: message.into() }),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppSettings {
    pub version: i32,
    pub translation_mode: String,
    pub manual_direction: String,
    pub quick_target_language: String,
    pub quick_replace_target_language: String,
    pub use_ai_translation: bool,
    pub ai_provider: String,
    pub ai_groq_api_key: String,
    pub ai_groq_model: String,
    pub ai_gemini_api_key: String,
    pub ai_gemini_model: String,
    pub improve_output_lang: String,
    pub quick_translate_shortcut: String,
    pub quick_translate_replace_shortcut: String,
    pub toggle_app_shortcut: String,
    pub voice_text_shortcut: String,
    pub auto_copy_delay_ms: i32,
    pub restore_clipboard: bool,
    pub popup_always_on_top: bool,
    pub start_minimized: bool,
    pub auto_launch_on_system_start: bool,
    pub tts_voice_uri: String,
    pub tts_rate: f64,
    pub tts_pitch: f64,
    pub tts_volume: f64,
    pub max_history_items: i32,
    pub track_history: bool,
}

impl AppSettings {
    pub fn default() -> Self {
        Self {
            version: 6,
            translation_mode: "manual".into(),
            manual_direction: "vi-en".into(),
            quick_target_language: "en".into(),
            quick_replace_target_language: "en".into(),
            use_ai_translation: false,
            ai_provider: "auto".into(),
            ai_groq_api_key: String::new(),
            ai_groq_model: "llama-3.3-70b-versatile".into(),
            ai_gemini_api_key: String::new(),
            ai_gemini_model: "gemini-2.0-flash".into(),
            improve_output_lang: "en".into(),
            quick_translate_shortcut: "CommandOrControl+Alt+Q".into(),
            quick_translate_replace_shortcut: "CommandOrControl+Alt+R".into(),
            toggle_app_shortcut: "CommandOrControl+Alt+E".into(),
            voice_text_shortcut: "CommandOrControl+Alt+D".into(),
            auto_copy_delay_ms: 200,
            restore_clipboard: true,
            popup_always_on_top: true,
            start_minimized: false,
            auto_launch_on_system_start: false,
            tts_voice_uri: String::new(),
            tts_rate: 1.0,
            tts_pitch: 1.0,
            tts_volume: 1.0,
            max_history_items: 500,
            track_history: true,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HistoryItem {
    pub id: i64,
    #[serde(rename = "type")]
    pub item_type: String,
    pub input: String,
    pub output: String,
    pub output2: Option<String>,
    pub lang_from: String,
    pub lang_to: String,
    pub provider: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub(crate) struct HistoryData {
    pub next_id: i64,
    pub items: Vec<HistoryItem>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QuickTranslatePayload {
    pub original: String,
    pub translated: String,
    pub source: String,
    pub target: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HistoryListOpts {
    pub limit: Option<i32>,
    #[serde(rename = "type")]
    pub filter_type: Option<String>,
}
