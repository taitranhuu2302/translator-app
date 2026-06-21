# Phase 1: Core Backend — Settings, History, Clipboard, Events

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rust backend stores for Settings + History with full CRUD commands, clipboard write, and event system setup — so the frontend Settings page and History page work via `invoke()`.

**Architecture:** Error types (`AppErrorCode`, `AppError`, `Result<T>`) mirror the TypeScript shared types. Singleton stores behind `Mutex<T>` managed via `tauri::State`. Commands live in `commands/` (one file per domain), stores in `stores/`, types in `types.rs`. Files live in `src-tauri/src/`.

**Tech Stack:** Tauri 2.x, serde + serde_json, tauri-plugin-clipboard-manager

**Branch:** `main-rust`

**Prerequisites:** Phase 0 complete — `src-tauri/` scaffolded, `vite.config.ts` multi-entry, `bridge-tauri.ts` created, 3 windows configured, `cargo tauri dev` verified.

---

## File Structure (new/changed files)

```
src-tauri/src/
├── main.rs                 ← unmodified
├── lib.rs                  ← MODIFY: add modules + manage state + register commands
├── types.rs                ← CREATE: AppSettings, HistoryItem, Result<T>, AppError, etc.
├── commands/
│   ├── mod.rs              ← CREATE: re-exports
│   ├── settings.rs         ← CREATE: get, update, reset_shortcuts
│   ├── history.rs          ← CREATE: list, delete, clear
│   └── clipboard.rs        ← CREATE: write
├── stores/
│   ├── mod.rs              ← CREATE: re-exports
│   ├── settings.rs         ← CREATE: load/save/migrate settings.json
│   └── history.rs          ← CREATE: load/save/prune history.json

src-tauri/Cargo.toml        ← MODIFY: add tauri-plugin-clipboard-manager
src-tauri/capabilities/default.json  ← MODIFY: add clipboard-manager permission
src/lib/bridge-tauri.ts     ← MODIFY (if needed): already written in Phase 0, verify correct
```

---

### Task 1.1: Create Rust type system (types.rs + commands/mod.rs + stores/mod.rs)

**Files:**
- Create: `src-tauri/src/types.rs`
- Create: `src-tauri/src/commands/mod.rs`
- Create: `src-tauri/src/stores/mod.rs`

These are the foundation every other task imports from.

- [ ] **Step 1: Check current lib.rs structure**

```bash
cat src-tauri/src/lib.rs
```

Current content (from Phase 0):
```rust
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

- [ ] **Step 2: Create src-tauri/src/types.rs**

```rust
use serde::{Deserialize, Serialize};

// ── Domain types ──

pub type LanguageCode = String; // "vi" | "en"
pub type TranslateSource = String; // "auto" | "vi" | "en"
pub type ManualDirection = String; // "vi-en" | "en-vi"
pub type TranslationMode = String; // "manual" | "auto"
pub type AiProvider = String; // "groq" | "gemini" | "auto"
pub type HistoryItemType = String; // "translate" | "improve"

// ── Error types ──

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

// ── AppSettings ──

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppSettings {
    pub version: i32,
    // Translation
    pub translation_mode: String,
    pub manual_direction: String,
    pub quick_target_language: String,
    pub quick_replace_target_language: String,
    pub use_ai_translation: bool,
    // AI
    pub ai_provider: String,
    pub ai_groq_api_key: String,
    pub ai_groq_model: String,
    pub ai_gemini_api_key: String,
    pub ai_gemini_model: String,
    pub improve_output_lang: String,
    // Shortcuts
    pub quick_translate_shortcut: String,
    pub quick_translate_replace_shortcut: String,
    pub toggle_app_shortcut: String,
    pub voice_text_shortcut: String,
    // Behavior
    pub auto_copy_delay_ms: i32,
    pub restore_clipboard: bool,
    pub popup_always_on_top: bool,
    pub start_minimized: bool,
    pub auto_launch_on_system_start: bool,
    // Voice (Text-to-Speech)
    pub tts_voice_uri: String,
    pub tts_rate: f64,
    pub tts_pitch: f64,
    pub tts_volume: f64,
    // Data
    pub max_history_items: i32,
    pub track_history: bool,
}

impl AppSettings {
    pub fn default() -> Self {
        Self {
            version: 6,
            // Translation
            translation_mode: "manual".into(),
            manual_direction: "vi-en".into(),
            quick_target_language: "en".into(),
            quick_replace_target_language: "en".into(),
            use_ai_translation: false,
            // AI
            ai_provider: "auto".into(),
            ai_groq_api_key: String::new(),
            ai_groq_model: "llama-3.3-70b-versatile".into(),
            ai_gemini_api_key: String::new(),
            ai_gemini_model: "gemini-2.0-flash".into(),
            improve_output_lang: "en".into(),
            // Shortcuts
            quick_translate_shortcut: "CommandOrControl+Alt+Q".into(),
            quick_translate_replace_shortcut: "CommandOrControl+Alt+R".into(),
            toggle_app_shortcut: "CommandOrControl+Alt+E".into(),
            voice_text_shortcut: "CommandOrControl+Alt+D".into(),
            // Behavior
            auto_copy_delay_ms: 200,
            restore_clipboard: true,
            popup_always_on_top: true,
            start_minimized: false,
            auto_launch_on_system_start: false,
            // Voice
            tts_voice_uri: String::new(),
            tts_rate: 1.0,
            tts_pitch: 1.0,
            tts_volume: 1.0,
            // Data
            max_history_items: 500,
            track_history: true,
        }
    }
}

// ── History ──

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

// ── Quick Translate payload ──

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QuickTranslatePayload {
    pub original: String,
    pub translated: String,
    pub source: String,
    pub target: String,
}

// ── Filter for history list ──

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HistoryListOpts {
    pub limit: Option<i32>,
    #[serde(rename = "type")]
    pub filter_type: Option<String>,
}
```

- [ ] **Step 3: Create src-tauri/src/commands/mod.rs**

```rust
pub mod clipboard;
pub mod history;
pub mod settings;
```

- [ ] **Step 4: Create src-tauri/src/stores/mod.rs**

```rust
pub mod history;
pub mod settings;
```

- [ ] **Step 5: Commit**

```bash
git add src-tauri/src/types.rs src-tauri/src/commands/mod.rs src-tauri/src/stores/mod.rs
git commit -m "feat: add Rust type system (AppSettings, HistoryItem, Result, errors)"
```

---

### Task 1.2: Implement SettingsStore

**Files:**
- Create: `src-tauri/src/stores/settings.rs`

Implements load/save/migrate for `settings.json` in app data directory. Handles migration from older schema versions via spread merge with defaults.

- [ ] **Step 1: Create src-tauri/src/stores/settings.rs**

```rust
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;

use crate::types::AppSettings;

pub struct SettingsStore {
    path: PathBuf,
    settings: AppSettings,
}

impl SettingsStore {
    pub fn new(app_data_dir: PathBuf) -> Self {
        let path = app_data_dir.join("settings.json");
        let settings = Self::load_from_disk(&path).unwrap_or_else(|_| {
            let defaults = AppSettings::default();
            let _ = Self::save_to_disk(&path, &defaults);
            defaults
        });
        Self { path, settings }
    }

    fn load_from_disk(path: &PathBuf) -> Result<AppSettings, String> {
        let content = fs::read_to_string(path).map_err(|e| e.to_string())?;
        let raw: serde_json::Value =
            serde_json::from_str(&content).map_err(|e| e.to_string())?;
        let defaults = serde_json::to_value(AppSettings::default())
            .map_err(|e| e.to_string())?;

        // Merge: fill missing fields with defaults
        let merged = deep_merge(defaults, raw);
        let mut settings: AppSettings =
            serde_json::from_value(merged).map_err(|e| e.to_string())?;
        settings.version = 6;
        Ok(settings)
    }

    fn save_to_disk(path: &PathBuf, settings: &AppSettings) -> Result<(), String> {
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
        let json = serde_json::to_string_pretty(settings).map_err(|e| e.to_string())?;
        fs::write(path, json).map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn get(&self) -> AppSettings {
        self.settings.clone()
    }

    pub fn update(&mut self, patch: serde_json::Value) -> Result<AppSettings, String> {
        let current = serde_json::to_value(&self.settings).map_err(|e| e.to_string())?;
        let merged = deep_merge(current, patch);
        let new_settings: AppSettings =
            serde_json::from_value(merged).map_err(|e| e.to_string())?;
        Self::save_to_disk(&self.path, &new_settings)?;
        self.settings = new_settings.clone();
        Ok(new_settings)
    }

    pub fn reload(&mut self) {
        if let Ok(settings) = Self::load_from_disk(&self.path) {
            self.settings = settings;
        }
    }

    pub fn reset_shortcuts(&mut self) -> Result<AppSettings, String> {
        let mut s = self.settings.clone();
        s.quick_translate_shortcut = "CommandOrControl+Alt+Q".into();
        s.quick_translate_replace_shortcut = "CommandOrControl+Alt+R".into();
        s.toggle_app_shortcut = "CommandOrControl+Alt+E".into();
        s.voice_text_shortcut = "CommandOrControl+Alt+D".into();
        Self::save_to_disk(&self.path, &s)?;
        self.settings = s.clone();
        Ok(s)
    }
}

/// Recursively merge two JSON values. `base` provides defaults, `overlay` overrides.
/// Arrays are replaced entirely by overlay.
fn deep_merge(base: serde_json::Value, overlay: serde_json::Value) -> serde_json::Value {
    match (base, overlay) {
        (serde_json::Value::Object(mut base_map), serde_json::Value::Object(overlay_map)) => {
            for (key, overlay_val) in overlay_map {
                if let Some(base_val) = base_map.remove(&key) {
                    base_map.insert(key, deep_merge(base_val, overlay_val));
                } else {
                    base_map.insert(key, overlay_val);
                }
            }
            serde_json::Value::Object(base_map)
        }
        (_base, overlay) => overlay,
    }
}

// ── Tauri managed state wrapper ──

pub struct SettingsState(pub Mutex<SettingsStore>);
```

- [ ] **Step 2: Commit**

```bash
git add src-tauri/src/stores/settings.rs
git commit -m "feat: implement SettingsStore with load/save/migrate"
```

---

### Task 1.3: Implement HistoryStore

**Files:**
- Create: `src-tauri/src/stores/history.rs`

Implements load/save/prune for `history.json`.

- [ ] **Step 1: Create src-tauri/src/stores/history.rs**

```rust
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;

use crate::types::{HistoryData, HistoryItem, HistoryListOpts};

pub struct HistoryStore {
    path: PathBuf,
    data: HistoryData,
}

impl HistoryStore {
    pub fn new(app_data_dir: PathBuf) -> Self {
        let path = app_data_dir.join("history.json");
        let data = Self::load_from_disk(&path).unwrap_or_else(|_| HistoryData {
            next_id: 1,
            items: Vec::new(),
        });
        Self { path, data }
    }

    fn load_from_disk(path: &PathBuf) -> Result<HistoryData, String> {
        let content = fs::read_to_string(path).map_err(|e| e.to_string())?;
        serde_json::from_str(&content).map_err(|e| e.to_string())
    }

    fn save_to_disk(&self) -> Result<(), String> {
        if let Some(parent) = self.path.parent() {
            fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
        let json =
            serde_json::to_string_pretty(&self.data).map_err(|e| e.to_string())?;
        fs::write(&self.path, json).map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn list(&self, opts: Option<HistoryListOpts>) -> Vec<HistoryItem> {
        let opts = opts.unwrap_or(HistoryListOpts {
            limit: Some(200),
            filter_type: None,
        });
        let limit = opts.limit.unwrap_or(200) as usize;
        let mut items: Vec<HistoryItem> = self
            .data
            .items
            .iter()
            .filter(|item| {
                if let Some(ref t) = opts.filter_type {
                    item.item_type == *t
                } else {
                    true
                }
            })
            .cloned()
            .collect();
        items.truncate(limit);
        items
    }

    pub fn add(&mut self, item: HistoryItem, max_items: i32) {
        self.data.items.insert(0, item);
        self.data.next_id += 1;
        if max_items > 0 {
            self.data.items.truncate(max_items as usize);
        }
        let _ = self.save_to_disk();
    }

    pub fn delete(&mut self, id: i64) {
        self.data.items.retain(|item| item.id != id);
        let _ = self.save_to_disk();
    }

    pub fn clear(&mut self) {
        self.data.items.clear();
        let _ = self.save_to_disk();
    }
}

pub struct HistoryState(pub Mutex<HistoryStore>);
```

- [ ] **Step 2: Commit**

```bash
git add src-tauri/src/stores/history.rs
git commit -m "feat: implement HistoryStore with load/save/prune"
```

---

### Task 1.4: Implement commands — settings

**Files:**
- Create: `src-tauri/src/commands/settings.rs`

Three Tauri commands: `settings_get`, `settings_update`, `settings_reset_shortcuts`.

- [ ] **Step 1: Create src-tauri/src/commands/settings.rs**

```rust
use tauri::State;
use crate::stores::settings::SettingsState;
use crate::types::{AppSettings, Result};

#[tauri::command]
pub fn settings_get(state: State<SettingsState>) -> AppSettings {
    let store = state.0.lock().unwrap();
    store.get()
}

#[tauri::command]
pub fn settings_update(
    state: State<SettingsState>,
    patch: serde_json::Value,
) -> Result<AppSettings> {
    let mut store = state.0.lock().unwrap();
    match store.update(patch) {
        Ok(settings) => Result::ok(settings),
        Err(e) => Result::err(crate::types::AppErrorCode::Unknown, e),
    }
}

#[tauri::command]
pub fn settings_reset_shortcuts(state: State<SettingsState>) -> Result<AppSettings> {
    let mut store = state.0.lock().unwrap();
    match store.reset_shortcuts() {
        Ok(settings) => Result::ok(settings),
        Err(e) => Result::err(crate::types::AppErrorCode::Unknown, e),
    }
}
```

- [ ] **Step 2: Commit**

```bash
git add src-tauri/src/commands/settings.rs
git commit -m "feat: implement settings commands (get, update, reset_shortcuts)"
```

---

### Task 1.5: Implement commands — history

**Files:**
- Create: `src-tauri/src/commands/history.rs`

Three Tauri commands: `history_list`, `history_delete`, `history_clear`.

- [ ] **Step 1: Create src-tauri/src/commands/history.rs**

```rust
use tauri::State;
use crate::stores::history::HistoryState;
use crate::types::{HistoryItem, HistoryListOpts, Result};

#[tauri::command]
pub fn history_list(
    state: State<HistoryState>,
    opts: Option<HistoryListOpts>,
) -> Vec<HistoryItem> {
    let store = state.0.lock().unwrap();
    store.list(opts)
}

#[tauri::command]
pub fn history_delete(state: State<HistoryState>, id: i64) -> Result<()> {
    let mut store = state.0.lock().unwrap();
    store.delete(id);
    Result::ok(())
}

#[tauri::command]
pub fn history_clear(state: State<HistoryState>) -> Result<()> {
    let mut store = state.0.lock().unwrap();
    store.clear();
    Result::ok(())
}
```

Note: `Result<()>` uses `()` as the data type. Serde serializes `()` as `null`. The frontend expects `{ success: true, data: null }`.

- [ ] **Step 2: Commit**

```bash
git add src-tauri/src/commands/history.rs
git commit -m "feat: implement history commands (list, delete, clear)"
```

---

### Task 1.6: Implement commands — clipboard

**Files:**
- Create: `src-tauri/src/commands/clipboard.rs`

Uses `tauri-plugin-clipboard-manager` to write text to clipboard.

- [ ] **Step 1: Add tauri-plugin-clipboard-manager to Cargo.toml**

```bash
grep -n "tauri-plugin" src-tauri/Cargo.toml
```

Expected output shows current deps. Add the clipboard plugin.

```toml
# After tauri-plugin-shell = "2"
tauri-plugin-clipboard-manager = "2"
```

- [ ] **Step 2: Create src-tauri/src/commands/clipboard.rs**

```rust
use tauri::AppHandle;
use tauri_plugin_clipboard_manager::ClipboardExt;
use crate::types::Result;

#[tauri::command]
pub fn clipboard_write(app: AppHandle, text: String) -> Result<()> {
    match app.clipboard().write_text(text) {
        Ok(()) => Result::ok(()),
        Err(e) => Result::err(crate::types::AppErrorCode::Unknown, e.to_string()),
    }
}
```

- [ ] **Step 3: Commit**

```bash
git add src-tauri/commands/clipboard.rs
git commit -m "feat: implement clipboard write command"
```

---

### Task 1.7: Wire everything in lib.rs

**Files:**
- Modify: `src-tauri/src/lib.rs`

Add module declarations, state management, and command registration.

- [ ] **Step 1: Rewrite src-tauri/src/lib.rs**

```rust
mod commands;
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
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

- [ ] **Step 2: Commit**

```bash
git add src-tauri/src/lib.rs
git commit -m "feat: wire stores, commands, and plugins in lib.rs"
```

---

### Task 1.8: Update capabilities + Cargo.toml

**Files:**
- Modify: `src-tauri/capabilities/default.json`
- Modify: `src-tauri/Cargo.toml`

Add `clipboard-manager` permission and crate dependency.

- [ ] **Step 1: Update src-tauri/capabilities/default.json**

```json
{
  "identifier": "default",
  "description": "Baseline permissions for all windows",
  "windows": ["main", "quick", "loading"],
  "permissions": [
    "core:default",
    "core:event:default",
    "core:event:allow-listen",
    "core:event:allow-emit",
    "shell:allow-open",
    "clipboard-manager:default",
    "clipboard-manager:allow-write-text",
    "clipboard-manager:allow-read-text"
  ]
}
```

- [ ] **Step 2: Update src-tauri/Cargo.toml**

```toml
[dependencies]
tauri = { version = "2", features = [] }
tauri-plugin-shell = "2"
tauri-plugin-clipboard-manager = "2"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
```

- [ ] **Step 3: Update src/lib/bridge-tauri.ts to verify clipboard matches**

Read and verify the clipboard bridge method matches the command name:

```bash
cat src/lib/bridge-tauri.ts
```

Expected: clipboard invokes `clipboard_write`:
```typescript
clipboard: {
  writeText: (text: string): Promise<void> =>
    invoke<void>("clipboard_write", { text }),
},
```

The command name `"clipboard_write"` matches `#[tauri::command] pub fn clipboard_write` (Tauri auto-converts snake_case in Rust to camelCase in JS by default? No — Tauri 2 uses the exact function name in snake_case for invoke() calls. So `invoke("clipboard_write", ...)` matches `clipboard_write`.)

Wait — actually, Tauri 2 converts Rust snake_case command names to camelCase by default for the frontend. Let me verify:

Actually, in Tauri 2, command names are NOT automatically converted. The `invoke()` function uses the exact Rust function name. So `clipboard_write` in Rust matches `invoke("clipboard_write", ...)` in JS. This is correct — no change needed.

- [ ] **Step 4: Commit**

```bash
git add src-tauri/capabilities/default.json src-tauri/Cargo.toml
git commit -m "feat: add clipboard-manager plugin and permissions"
```

---

### Task 1.9: Build & verify with cargo tauri dev

**Files:**
- Verify: entire setup compiles and runs

- [ ] **Step 1: Build to check compilation**

```bash
cd /Users/taitran/Desktop/english-tool
pnpm tauri build 2>&1 | tail -30
```

Expected: Rust compilation succeeds. The React frontend should be built and bundled.

(Note: If `cargo tauri build` produces an actual installer binary you don't want, use `cargo build --manifest-path src-tauri/Cargo.toml` instead to just compile Rust without bundling.)

- [ ] **Step 2: Alternative — quick compile check**

```bash
cargo build --manifest-path src-tauri/Cargo.toml 2>&1
```

Expected output ends with:
```
Finished `dev` profile [unoptimized + debuginfo] target(s) in X.XXs
```

- [ ] **Step 3: Run dev server to verify frontend-backend bridge**

```bash
pnpm tauri dev 2>&1
```

Expected:
- Vite dev server starts on port 1420
- Rust compiles and launches
- Tauri window opens with Neris Translator UI
- Console may show IPC errors for commands not yet implemented in later phases (translate, improve, models, quick, shortcuts, etc.)
- Settings and history commands no longer error (they respond with actual data)

- [ ] **Step 4: If successful, commit any generated files**

```bash
git add -A
git commit -m "feat: complete Phase 1 — core backend (settings, history, clipboard, events)"
```

---

## Post-Implementation Notes

### Settings file format on disk

The `settings.json` is written to Tauri's app data directory (typically `~/Library/Application Support/com.neris.translator/settings.json` on macOS). Format:

```json
{
  "version": 6,
  "translation_mode": "manual",
  "manual_direction": "vi-en",
  "ai_groq_api_key": "",
  ...
}
```

Field names use `snake_case` in Rust, which serde serializes as `snake_case` in JSON. This differs from the Electron version which uses `camelCase`. The bridge layer will need to map between them if migration from Electron settings is needed — but for now the Tauri app starts fresh.

### Error handling pattern

All commands return `Result<T>`. The frontend `bridge-tauri.ts` already expects this pattern:

```typescript
// Frontend usage
const result = await bridge.settings.update({ translationMode: "auto" });
if (result.success) {
  // use result.data
} else {
  // handle result.error
}
```

### Events (not implemented in Phase 1)

The event system (`tauri::Emitter`) is not wired in Phase 1. Event channels (`quick:show`, `voice:speak`, `app:navigate`, etc.) will be implemented in Phase 3+ when the multi-window and quick translate features are built.
