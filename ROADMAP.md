# ROADMAP: Electron → Tauri Migration

> **Project:** Neris Translator — Vietnamese ⇄ English translation desktop app
> **Current:** Electron 41 + React 19 + Vite + TypeScript
> **Target:** Tauri 2.x (Rust) + React 19 + Vite + TypeScript
> **Platforms:** macOS · Windows

---

## Kiến trúc đích (Tauri thuần)

```
english-tool/
├── src/                          ← Frontend React (giữ nguyên 95%)
│   ├── main.tsx                  ← Entry point duy nhất
│   ├── App.tsx                   ← Giữ từ app.tsx
│   ├── components/ui/*           ← shadcn (giữ nguyên)
│   ├── features/                 ← translate / improve / history / settings / quick-popup
│   ├── hooks/                    ← use-speech, format-shortcut, bridge
│   ├── lib/
│   │   └── bridge.ts             ← SỬA: invoke() thay electronAPI
│   └── shared/types.ts           ← Giữ nguyên
│
├── src-tauri/                    ← Backend Rust (viết mới 100%)
│   ├── src/
│   │   ├── main.rs               ← Tauri Builder + plugin setup
│   │   ├── lib.rs                ← Module tree
│   │   ├── commands/             ← #[tauri::command] (~20 handlers)
│   │   ├── services/             ← Business logic (AI, translation, selection…)
│   │   └── stores/               ← Settings + History (serde + app_dir)
│   ├── capabilities/
│   ├── Cargo.toml
│   └── tauri.conf.json
│
├── index.html                    ← SỬA CSP cho Tauri
├── vite.config.ts                ← 1 file thay 5 file Forge config
├── package.json                  ← Thay electron deps = @tauri-apps/*
└── components.json               ← Giữ (shadcn)
```

---

## Phases

### ▸ Phase 0: Dựng Tauri & Frontend Layer

**Mục tiêu:** Tauri dev server chạy được, UI React hiển thị.

| Task | Mô tả | Crate / Plugin |
|------|-------|----------------|
| 0.1 | `npm create tauri-app` trong repo — React + TypeScript + Vite | `@tauri-apps/cli` |
| 0.2 | Copy `src/` frontend vào, giữ nguyên trừ bridge | — |
| 0.3 | Sửa `package.json`: thêm `@tauri-apps/api`, xóa electron deps | — |
| 0.4 | Gộp 5 vite config → 1 `vite.config.ts` | `@tauri-apps/plugin-vite` |
| 0.5 | Sửa `index.html` CSP: `tauri://localhost` `ipc:` | — |
| 0.6 | **SỬA `src/lib/bridge.ts`** — `invoke()` thay `electronAPI` | `@tauri-apps/api` |
| 0.7 | Gộp 3 entry points → `src/main.tsx` | — |
| 0.8 | Tạo `tauri.conf.json`: 3 windows (main/quick/loading) | — |
| 0.9 | Cấu hình `capabilities/` permissions | — |
| 0.10 | `cargo tauri dev` → UI chạy (API fail) | — |

---

### ▸ Phase 1: Core Backend

**Mục tiêu:** Settings + History lưu được, basic commands hoạt động.

| Task | Mô tả | Crate / Plugin |
|------|-------|----------------|
| 1.1 | Dựng module tree Rust: `main.rs` `lib.rs` `commands/` `stores/` `services/` | — |
| 1.2 | **`shared/types.rs`** — mirror TypeScript types (AppSettings, HistoryItem, Result…) | `serde`, `serde_json` |
| 1.3 | **`stores/settings.rs`** — load/save/migrate settings.json trong app_dir | `serde_json`, `tauri::Manager` |
| 1.4 | **`stores/history.rs`** — load/save/prune history.json | `serde_json` |
| 1.5 | **Commands:** `settings::get`, `settings::update`, `settings::reset_shortcuts` | — |
| 1.6 | **Commands:** `history::list`, `history::delete`, `history::clear` | — |
| 1.7 | **Commands:** `clipboard::write` | `tauri-plugin-clipboard` |
| 1.8 | Tauri events system setup (thay EventEmitter) | `tauri::Emitter` |
| 1.9 | **Kết quả:** Settings page + History page hoạt động | ✅ |

---

### ▸ Phase 2: Translation Engine

**Mục tiêu:** Google Translate + Groq + Gemini hoạt động từ Rust.

| Task | Mô tả | Crate / Plugin |
|------|-------|----------------|
| 2.1 | **`services/ai/groq.rs`** — Groq REST API (chat completions + models) | `reqwest` |
| 2.2 | **`services/ai/gemini.rs`** — Gemini REST API (generateContent + models) | `reqwest` |
| 2.3 | **`services/ai/prompts.rs`** — system prompts cho translate/improve | — |
| 2.4 | **`services/ai/mod.rs`** — orchestration (rate-limit fallback, auto provider) | — |
| 2.5 | **`services/translation/google.rs`** — Google Translate API | `reqwest` |
| 2.6 | **`services/translation/mod.rs`** — `shouldUseGoogleTranslate()` routing | — |
| 2.7 | **Commands:** `translate::manual`, `improve::run` | — |
| 2.8 | **Commands:** `models::list_groq`, `models::list_gemini` | — |
| 2.9 | **Kết quả:** Translate + Improve pages hoạt động đầy đủ | ✅ |

---

### ▸ Phase 3: Multi-window & Global Shortcuts

**Mục tiêu:** 3 cửa sổ quản lý đúng, 4 global shortcuts đăng ký được.

| Task | Mô tả | Crate / Plugin |
|------|-------|----------------|
| 3.1 | Window manager Rust: main/quick/loading window | `tauri::WebviewWindow` |
| 3.2 | Show/hide/toggle logic (ẩn/hiện/thoát) | — |
| 3.3 | Quick popup positioning gần cursor (monitor API) | `tauri::monitor` |
| 3.4 | Loading window transparent + không focusable | `WebviewWindowBuilder` |
| 3.5 | Window state: `ActivateGuard` + `AppQuitting` (AtomicBool) | `std::sync::atomic` |
| 3.6 | **`commands/shortcuts.rs`** — 4 global shortcuts: | `tauri-plugin-global-shortcut` |
| | toggle, quick translate, quick replace, voice text | |
| 3.7 | Validate accelerator + conflict detection | — |
| 3.8 | Shortcut update flow: unregister → register → persist | — |
| 3.9 | App navigation commands: `app::open_settings`, `app::open_full`, `app::toggle` | — |
| 3.10 | **Kết quả:** Shortcuts settings + window toggling hoạt động | ✅ |

---

### ▸ Phase 4: Quick Translate — Selection Capture

**Mục tiêu:** Quick Translate + Quick Translate Replace + Voice Text pipelines.

| Task | Mô tả | Crate / Plugin |
|------|-------|----------------|
| 4.1 | **`services/native_input.rs`** — simulate Cmd+C / Cmd+V | `tauri-plugin-shell` |
| | macOS: `osascript` (System Events keystroke) | |
| | Windows: `PowerShell SendKeys` | |
| 4.2 | **`services/selection_capture.rs`** — capture selected text | `tauri-plugin-clipboard` |
| | snapshot clipboard → sentinel → simulate copy → poll → extract → restore | |
| 4.3 | **`services/clipboard.rs`** — clipboard snapshot/restore (text/HTML/RTF/image) | `tauri-plugin-clipboard` |
| 4.4 | **`commands/quick_translate.rs`** — pipeline: | — |
| | shortcut → hide windows → wait → macos permissions → capture → route → translate → show popup | |
| 4.5 | **`commands/quick_replace.rs`** — pipeline: | — |
| | capture → translate → write clipboard → paste → restore | |
| 4.6 | **`commands/voice.rs`** — pipeline: capture text → emit event → TTS | — |
| 4.7 | **`commands/macos.rs`** — macOS Accessibility + Automation permissions check | `tauri-plugin-shell` |
| 4.8 | Open privacy settings pane (deep link) | `tauri-plugin-shell` |
| 4.9 | **Kết quả:** Quick translate popup + replace + voice đầy đủ | ✅ |

---

### ▸ Phase 5: Polish

**Mục tiêu:** Hoàn thiện tính năng còn lại, sẵn sàng build.

| Task | Mô tả | Crate / Plugin |
|------|-------|----------------|
| 5.1 | System tray (Windows): Hide/Show + Quick Translate + Settings + Quit | `tauri-plugin-tray` |
| 5.2 | Auto launch on system start | `tauri-plugin-autostart` |
| 5.3 | Single instance lock | Built-in (`tauri.conf.json`) |
| 5.4 | macOS Dock behavior: hide on close, keep in Dock | `tauri::ActivationPolicy` |
| 5.5 | Error normalization (TIMEOUT / NETWORK_ERROR / API_ERROR) | — |
| 5.6 | Capabilities permissions hoàn chỉnh (`src-tauri/capabilities/`) | — |
| 5.7 | App icons (`assets/` → `src-tauri/icons/`) | `cargo tauri icon` |
| 5.8 | Build scripts (`cargo tauri build`) | — |
| 5.9 | **Kết quả:** App build được, đầy đủ tính năng | ✅ |

---

### ▸ Phase 6: Dọn dẹp & Nâng cấp (Future)

| Task | Mô tả | Crate / Plugin |
|------|-------|----------------|
| 6.1 | Xóa toàn bộ Electron files | — |
| | `forge.config.ts`, `vite.main.config.ts`, `vite.preload.config.ts` | |
| | `vite.renderer*.config.ts`, `src/main/`, `src/preload.ts` | |
| | `entitlements.plist`, `forge.env.d.ts`, `build-macos.sh` | |
| 6.2 | Auto-updater từ GitHub Releases | `tauri-plugin-updater` |
| 6.3 | macOS code signing + notarization | — |
| 6.4 | Cân nhắc: WebSocket refresh cho quick translate | — |

---

## Tổng quan dependencies (Rust Crates)

| Crate | Mục đích | Phase |
|-------|----------|-------|
| `serde` + `serde_json` | Serialize/deserialize JSON settings + history | 1 |
| `reqwest` | HTTP client cho AI APIs + Google Translate | 2 |
| `tokio` | Async runtime (Tauri built-in) | 1 |
| `tauri-plugin-clipboard` | Đọc/ghi clipboard | 1, 4 |
| `tauri-plugin-global-shortcut` | Global shortcuts | 3 |
| `tauri-plugin-shell` | osascript / PowerShell | 4 |
| `tauri-plugin-tray` | System tray (Windows) | 5 |
| `tauri-plugin-autostart` | Auto launch | 5 |
| `tauri-plugin-updater` | Auto updater | 6 |

---

## Electron API → Tauri Plugin Map

| Electron API | Tauri thay thế |
|---|---|
| `BrowserWindow` | `tauri::WebviewWindow` |
| `globalShortcut` | `tauri-plugin-global-shortcut` |
| `clipboard` | `tauri-plugin-clipboard` |
| `Tray` / `Menu` | `tauri-plugin-tray` |
| `shell.openExternal` | `tauri-plugin-shell` (open) |
| `app.setLoginItemSettings` | `tauri-plugin-autostart` |
| `app.getPath("userData")` | `tauri::path::app_data_dir()` |
| `ipcMain` / `ipcRenderer` | `#[tauri::command]` / `invoke()` |
| `webContents.send` | `tauri::Emitter::emit()` |
| `contextBridge` | Không cần — Tauri IPC tự động isolated |
| `screen` | `tauri::Window::available_monitors()` |
| `systemPreferences` | `tauri-plugin-shell` (osascript) |
| `app.requestSingleInstanceLock` | Built-in (`tauri.conf.json`) |
| `child_process` (execSync/spawnSync) | `tauri-plugin-shell` |
| `fs` (read/write) | `std::fs` + app_dir path |

---

## Timeline

```
Phase 0: Dựng Tauri + Frontend      ██       1-2 ngày
Phase 1: Core Backend                ██       1-2 ngày
Phase 2: Translation Engine          ███      2-3 ngày
Phase 3: Windows + Shortcuts        ██       2 ngày
Phase 4: Quick Translate             ███      2-3 ngày
Phase 5: Polish                      █        1 ngày
Phase 6: Cleanup                     █        Future
──────────────────────────────────────────────
Total: ~10-14 ngày
```
