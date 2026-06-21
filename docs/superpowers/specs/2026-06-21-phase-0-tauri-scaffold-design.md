# Phase 0: Dựng Tauri & Frontend Layer — Design Spec

> **Project:** Neris Translator — Vietnamese ⇄ English translation desktop app
> **Migration:** Electron 41 → Tauri 2.x (Rust)
> **Date:** 2026-06-21
> **Branch:** `main-rust`

---

## 1. Tổng quan

Phase 0 thiết lập Tauri project song song với code Electron hiện có. Kết quả Phase 0 là `cargo tauri dev` chạy được với UI React hiển thị (các Tauri commands trả về dummy/error).

### 1.1 Dependencies

**Rust (Cargo.toml):**
- `tauri = "2"` — core
- `tauri-plugin-shell = "2"` — mở URL
- `serde = { version = "1", features = ["derive"] }` — serialization
- `serde_json = "1"`

**npm (package.json):**
- `@tauri-apps/cli@^2` — dev (thay `electron-forge`)
- `@tauri-apps/api@^2` — frontend invoke
- `@tauri-apps/plugin-clipboard@^2` — clipboard
- `@tauri-apps/plugin-global-shortcut@^2` — shortcuts
- `@tauri-apps/plugin-shell@^2` — shell

### 1.2 Phương pháp

Dùng `pnpm create tauri-app` để scaffold base Tauri project, sau đó customize:
- Gộp 5 Vite config files → 1 `vite.config.ts` duy nhất
- Thêm 2 entry points cho quick + loading windows (multi-page)
- Tạo file bridge mới `src/lib/bridge-tauri.ts` dùng `invoke()` thay `window.electronAPI`
- Cấu hình 3 windows trong `tauri.conf.json`
- Thiết lập CSP cho Tauri security

---

## 2. Cấu trúc thư mục đích

```
english-tool/
├── src/                          ← Frontend (giữ nguyên, chỉ thêm bridge-tauri.ts)
│   ├── main.tsx                  ← Entry point main (rename từ index.tsx)
│   ├── index.css
│   ├── app.tsx
│   ├── components/ui/*
│   ├── features/
│   │   ├── translate/
│   │   ├── improve/
│   │   ├── history/
│   │   ├── settings/
│   │   └── quick-popup/
│   ├── hooks/
│   ├── lib/
│   │   ├── bridge.ts             ← Electron bridge (giữ nguyên)
│   │   ├── bridge-tauri.ts       ← Tauri bridge (MỚI)
│   │   ├── utils.ts
│   │   ├── format-shortcut.ts
│   │   ├── use-speech.ts
│   │   └── toast.ts
│   ├── shared/
│   │   ├── types.ts              ← Giữ nguyên (dùng chung)
│   │   └── ipc-channels.ts       ← Giữ nguyên
│   ├── renderer-quick.tsx        ← Quick popup entry
│   ├── renderer-loading.tsx      ← Loading screen entry
│   ├── main.ts                   ← Electron main (giữ nguyên)
│   └── preload.ts                ← Electron preload (giữ nguyên)
│
├── src-tauri/                    ← Backend Rust (MỚI)
│   ├── src/
│   │   ├── main.rs               ← Tauri Builder
│   │   └── lib.rs                ← Module tree (trống, Phase 1 fill)
│   ├── capabilities/
│   │   └── default.json          ← Core permissions
│   ├── icons/                    ← App icons
│   ├── Cargo.toml
│   └── tauri.conf.json
│
├── index.html                    ← Main window entry (CSP sửa cho Tauri)
├── index-quick.html              ← Quick popup entry (CSP sửa cho Tauri)
├── index-loading.html            ← Loading screen entry (CSP sửa cho Tauri)
├── vite.config.ts                ← 1 file gộp (MỚI)
├── package.json                  ← Thêm tauri deps, giữ electron deps
├── forge.config.ts               ← Electron (giữ nguyên)
├── vite.main.config.ts           ← Electron (giữ nguyên)
├── vite.preload.config.ts        ← Electron (giữ nguyên)
├── vite.renderer.config.ts       ← Electron (giữ nguyên)
├── vite.renderer.quick.config.ts ← Electron (giữ nguyên)
└── vite.renderer.loading.config.ts ← Electron (giữ nguyên)
```

---

## 3. Chi tiết thay đổi theo file

### 3.1 `src/lib/bridge-tauri.ts` — Tauri bridge

Thay `window.electronAPI` bằng `invoke()` từ `@tauri-apps/api/core`. Chỉ implement các methods Phase 1 sẽ xử lý (settings, history, clipboard), phần còn lại (translate, improve, quick, voice) sẽ thêm ở Phase 2+.

```typescript
import { invoke } from "@tauri-apps/api/core";
import type { AppSettings, HistoryItem, HistoryItemType, Result } from "../../shared/types";

export const bridge = {
  settings: {
    get: () => invoke<AppSettings>("settings_get"),
    update: (patch: Partial<AppSettings>) => invoke<Result<AppSettings>>("settings_update", { patch }),
    resetShortcuts: () => invoke<Result<AppSettings>>("settings_reset_shortcuts"),
  },
  history: {
    list: (opts?: { limit?: number; type?: HistoryItemType }) =>
      invoke<HistoryItem[]>("history_list", { opts }),
    delete: (id: number) => invoke<void>("history_delete", { id }),
    clear: () => invoke<void>("history_clear"),
  },
  clipboard: {
    writeText: (text: string) => invoke<void>("clipboard_write", { text }),
  },
};
```

### 3.2 `vite.config.ts` — Gộp config

Gộp 5 file Electron config thành 1. Dùng multi-page build với 3 entry points.

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, "index.html"),
        quick: path.resolve(__dirname, "index-quick.html"),
        loading: path.resolve(__dirname, "index-loading.html"),
      },
    },
  },
  clearScreen: false,
  server: { strictPort: true },
  envPrefix: ["VITE_", "TAURI_"],
});
```

### 3.3 `package.json` — Scripts + Dependencies

```json
{
  "scripts": {
    "tauri": "tauri",
    "tauri:dev": "tauri dev",
    "tauri:build": "tauri build",
    "dev": "tauri dev"
  },
  "devDependencies": {
    "@tauri-apps/cli": "^2"
  },
  "dependencies": {
    "@tauri-apps/api": "^2",
    "@tauri-apps/plugin-clipboard-board": "^2",
    "@tauri-apps/plugin-global-shortcut": "^2",
    "@tauri-apps/plugin-shell": "^2"
  }
}
```

> Giữ nguyên tất cả Electron dependencies + React + shadcn dependencies.

### 3.4 `index.html`, `index-quick.html`, `index-loading.html` — CSP

Thêm CSP meta tag phù hợp với Tauri:

```html
<meta
  http-equiv="Content-Security-Policy"
  content="
    default-src 'self';
    script-src 'self';
    style-src 'self' 'unsafe-inline';
    connect-src 'self' ipc: tauri://localhost http://localhost:*;
    img-src 'self' data: asset: tauri://localhost;
    font-src 'self' data:;
    frame-src 'self' tauri://localhost;
  "
/>
```

Mỗi file giữ `<div id="root">` và script import riêng:
- `index.html` → `src/index.tsx`
- `index-quick.html` → `src/renderer-quick.tsx`
- `index-loading.html` → `src/renderer-loading.tsx`

### 3.5 `tauri.conf.json` — Config chính

```json
{
  "$schema": "https://raw.githubusercontent.com/tauri-apps/tauri/dev/crates/tauri-config-schema/schema.json",
  "productName": "Neris Translator",
  "version": "2.0.0",
  "identifier": "com.neris.translator",
  "build": {
    "frontendDist": "../dist",
    "devUrl": "http://localhost:1420",
    "beforeDevCommand": "pnpm dev:vite",
    "beforeBuildCommand": "pnpm build"
  },
  "app": {
    "windows": [
      {
        "label": "main",
        "title": "Neris Translator",
        "url": "index.html",
        "width": 800,
        "height": 600,
        "minWidth": 600,
        "minHeight": 400,
        "resizable": true,
        "center": true
      },
      {
        "label": "quick",
        "url": "index-quick.html",
        "width": 420,
        "height": 250,
        "decorations": false,
        "alwaysOnTop": true,
        "focus": true,
        "visible": false,
        "center": true
      },
      {
        "label": "loading",
        "url": "index-loading.html",
        "width": 380,
        "height": 180,
        "decorations": false,
        "visible": false,
        "focus": false,
        "closable": false
      }
    ],
    "security": {
      "csp": null
    }
  },
  "bundle": {
    "active": true,
    "targets": "all",
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/128x128@2x.png",
      "icons/icon.icns",
      "icons/icon.ico"
    ]
  }
}
```

> `"csp": null` vì CSP được set trong HTML meta tag.

### 3.6 `src-tauri/capabilities/default.json` — Permissions

```json
{
  "identifier": "default",
  "description": "Default capability set for all windows",
  "windows": ["main", "quick", "loading"],
  "permissions": [
    "core:default",
    "core:event:default",
    "core:event:allow-listen",
    "core:event:allow-emit",
    "shell:allow-open"
  ]
}
```

### 3.7 `src-tauri/Cargo.toml`

```toml
[package]
name = "neris-translator"
version = "0.1.0"
edition = "2021"

[dependencies]
tauri = { version = "2", features = [] }
tauri-plugin-shell = "2"
serde = { version = "1", features = ["derive"] }
serde_json = "1"

[build-dependencies]
tauri-build = { version = "2", features = [] }
```

### 3.8 `src-tauri/src/main.rs` + `src-tauri/src/lib.rs`

```rust
// main.rs
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    neris_translator_lib::run()
}
```

```rust
// lib.rs
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

---

## 4. Thứ tự triển khai

| # | Task | Mô tả |
|---|------|-------|
| 0.1 | Init Tauri project | `pnpm create tauri-app` với template react-ts |
| 0.2 | Cài npm deps | `pnpm add @tauri-apps/api@^2 @tauri-apps/plugin-*` |
| 0.3 | Tạo vite.config.ts | Gộp từ 5 file → 1 file multi-entry |
| 0.4 | Tạo bridge-tauri.ts | File bridge mới dùng invoke() |
| 0.5 | Sửa CSP cho 3 index files | Thêm meta CSP cho Tauri security |
| 0.6 | Cấu hình tauri.conf.json | 3 windows, identifier, bundle |
| 0.7 | Cấu hình capabilities/default.json | Permissions cơ bản |
| 0.8 | Cấu hình Cargo.toml + main.rs/lib.rs | Rust module tree skeleton |
| 0.9 | Tạo app icons | `cargo tauri icon` từ assets/logo.png |
| 0.10 | `cargo tauri dev` verify | UI chạy, API trả về error (dummy) |

---

## 5. Known issues / Edge cases

1. **Vite port conflict:** Tauri dev server mặc định port 1420. Nếu conflict, `tauri.conf.json` cho phép đổi `devUrl`.
2. **Electron vs Tauri entry points:** `src/index.tsx` hiện tại là Electron renderer. Phase 0 cần rename/gộp thành `src/main.tsx` để tránh nhầm với Electron `src/main/` directory.
3. **shadcn/ui compatibility:** Shadcn components dùng Tailwind v4 + CSS variables — sẽ hoạt động bình thường trong Tauri WebView.
4. **`beforeDevCommand`:** Tauri cần command chạy Vite dev server. Cần tách `"dev:vite": "vite"` script riêng trong package.json.

---

## 6. File không thay đổi

Các file Electron sau giữ nguyên hoàn toàn:
- `forge.config.ts`, `forge.env.d.ts`
- `vite.main.config.ts`, `vite.preload.config.ts`
- `vite.renderer.config.ts`, `vite.renderer.quick.config.ts`, `vite.renderer.loading.config.ts`
- `src/main.ts`, `src/preload.ts`
- `src/main/` (toàn bộ Electron main process code)
- `src/tests/` (các test files)
- `build-macos.sh`, `entitlements.plist`
