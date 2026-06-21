# Phase 0: Tauri Scaffold & Frontend Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold Tauri 2.x project alongside existing Electron app, configure 3 windows (main/quick/loading), unify Vite config, create Tauri bridge, and verify UI renders via `cargo tauri dev`.

**Architecture:** Tauri project lives in `src-tauri/` parallel to existing Electron `src/`. Frontend (React + shadcn) stays in `src/` with 3 HTML entry points for 3 windows. A new `bridge-tauri.ts` replaces `window.electronAPI` with `invoke()` calls. Vite config consolidated from 5 Electron-specific files to 1 multi-entry config.

**Tech Stack:** Tauri 2.x (Rust), React 19 + Vite + TypeScript, Tailwind v4, shadcn/ui

**Branch:** `main-rust` (existing)

## Global Constraints

- Keep all existing Electron files untouched (src/main/, forge.config.ts, etc.)
- Use pnpm (not npm) for all package management
- Use `pnpm create tauri-app` for initial scaffold
- CSP set in HTML meta tags, not in tauri.conf.json
- bridge-tauri.ts lives at `src/lib/bridge-tauri.ts` — separate from bridge.ts (Electron)

---

### Task 0.1: Init Tauri project

**Files:**
- Create: `src-tauri/` (directory tree via tauri CLI)
- Modify: `package.json`

- [ ] **Step 1: Run tauri scaffold command**

```bash
cd /Users/taitran/Desktop/english-tool
pnpm create tauri-app@latest -- --template react-ts --manager pnpm
```

This creates:
- `src-tauri/Cargo.toml`
- `src-tauri/src/main.rs` + `lib.rs`
- `src-tauri/tauri.conf.json`
- `src-tauri/capabilities/`
- `src-tauri/icons/`
- Updates `package.json` with `@tauri-apps/cli` and scripts

- [ ] **Step 2: Install npm dependencies**

```bash
pnpm add @tauri-apps/api@^2
pnpm add @tauri-apps/plugin-clipboard-board@^2
pnpm add @tauri-apps/plugin-global-shortcut@^2
pnpm add @tauri-apps/plugin-shell@^2
```

> Note: `@tauri-apps/plugin-clipboard-board` is the package name. Verify with Tauri 2.x docs.

- [ ] **Step 3: Verify tauri CLI works**

```bash
pnpm tauri --version
```

Expected: `pnpm tauri --version` shows version 2.x

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: scaffold Tauri 2.x project via CLI"
```

---

### Task 0.2: Create vite.config.ts (multi-entry)

**Files:**
- Create: `vite.config.ts`

The new Vite config consolidates all Electron-specific Vite configs. It uses multi-page build with 3 entries: main, quick, loading.

- [ ] **Step 1: Create vite.config.ts**

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
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
  server: {
    strictPort: true,
  },
  envPrefix: ["VITE_", "TAURI_"],
});
```

- [ ] **Step 2: Commit**

```bash
git add vite.config.ts
git commit -m "feat: create multi-entry vite.config.ts for Tauri"
```

---

### Task 0.3: Create bridge-tauri.ts

**Files:**
- Create: `src/lib/bridge-tauri.ts`

Frontend bridge using `invoke()` pattern instead of `window.electronAPI`. Only implements settings, history, and clipboard methods that Phase 1 will handle.

- [ ] **Step 1: Create bridge-tauri.ts**

```typescript
import { invoke } from "@tauri-apps/api/core";
import type {
  AppSettings,
  HistoryItem,
  HistoryItemType,
  Result,
} from "../../shared/types";

export const bridge = {
  settings: {
    get: (): Promise<AppSettings> => invoke<AppSettings>("settings_get"),
    update: (patch: Partial<AppSettings>): Promise<Result<AppSettings>> =>
      invoke<Result<AppSettings>>("settings_update", { patch }),
    resetShortcuts: (): Promise<Result<AppSettings>> =>
      invoke<Result<AppSettings>>("settings_reset_shortcuts"),
  },
  history: {
    list: (
      opts?: { limit?: number; type?: HistoryItemType },
    ): Promise<HistoryItem[]> =>
      invoke<HistoryItem[]>("history_list", { opts }),
    delete: (id: number): Promise<void> =>
      invoke<void>("history_delete", { id }),
    clear: (): Promise<void> => invoke<void>("history_clear"),
  },
  clipboard: {
    writeText: (text: string): Promise<void> =>
      invoke<void>("clipboard_write", { text }),
  },
};
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/bridge-tauri.ts
git commit -m "feat: add Tauri bridge with invoke() pattern"
```

---

### Task 0.4: Update 3 HTML files with Tauri CSP

**Files:**
- Modify: `index.html`
- Modify: `index-quick.html`
- Modify: `index-loading.html`

Replace or add CSP meta tag compatible with Tauri in all 3 files.

- [ ] **Step 1: Read current index.html to find CSP**

```bash
head -20 index.html index-quick.html index-loading.html
```

- [ ] **Step 2: Add/modify CSP meta tag in each file**

In the `<head>` section of each HTML file, add:

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

- [ ] **Step 3: Commit**

```bash
git add index.html index-quick.html index-loading.html
git commit -m "fix: update CSP for Tauri security model"
```

---

### Task 0.5: Configure tauri.conf.json

**Files:**
- Modify: `src-tauri/tauri.conf.json`

Set up 3 windows, identifier, build config, and bundle settings.

- [ ] **Step 1: Write tauri.conf.json**

```json
{
  "$schema": "https://raw.githubusercontent.com/tauri-apps/tauri/dev/crates/tauri-config-schema/schema.json",
  "productName": "Neris Translator",
  "version": "2.0.0",
  "identifier": "com.neris.translator",
  "build": {
    "frontendDist": "../dist",
    "devUrl": "http://localhost:1420",
    "beforeDevCommand": "pnpm dev",
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
        "center": true,
        "focus": true
      },
      {
        "label": "quick",
        "title": "Quick Translate",
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
        "title": "",
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

> `"csp": null` because CSP is handled via HTML meta tags.
> `"beforeDevCommand": "pnpm dev"` uses existing script. May need adjustment — the script should run the Vite dev server. We'll define it in package.json later.

- [ ] **Step 2: Commit**

```bash
git add src-tauri/tauri.conf.json
git commit -m "feat: configure 3 windows in tauri.conf.json"
```

---

### Task 0.6: Configure capabilities/default.json

**Files:**
- Modify: `src-tauri/capabilities/default.json`

Set baseline permissions for all 3 windows.

- [ ] **Step 1: Write capabilities/default.json**

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
    "shell:allow-open"
  ]
}
```

- [ ] **Step 2: Commit**

```bash
git add src-tauri/capabilities/default.json
git commit -m "feat: set baseline Tauri capabilities"
```

---

### Task 0.7: Configure Cargo.toml + Rust entry points

**Files:**
- Modify: `src-tauri/Cargo.toml`
- Modify: `src-tauri/src/main.rs`
- Modify: `src-tauri/src/lib.rs`

Set up Rust dependencies (serde, serde_json, tauri-plugin-shell) and clean entry points.

- [ ] **Step 1: Write Cargo.toml**

```toml
[package]
name = "neris-translator"
version = "2.0.0"
edition = "2021"

[lib]
name = "neris_translator_lib"
crate-type = ["lib", "cdylib", "staticlib"]

[build-dependencies]
tauri-build = { version = "2", features = [] }

[dependencies]
tauri = { version = "2", features = [] }
tauri-plugin-shell = "2"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
```

- [ ] **Step 2: Write src/main.rs**

```rust
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    neris_translator_lib::run()
}
```

- [ ] **Step 3: Write src/lib.rs**

```rust
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

- [ ] **Step 4: Commit**

```bash
git add src-tauri/Cargo.toml src-tauri/src/main.rs src-tauri/src/lib.rs
git commit -m "feat: configure Rust dependencies and entry points"
```

---

### Task 0.8: Update package.json scripts

**Files:**
- Modify: `package.json`

Add Tauri development scripts while keeping Electron scripts.

- [ ] **Step 1: Read current package.json scripts section**

```bash
grep -A 15 '"scripts"' package.json
```

- [ ] **Step 2: Update scripts section**

Add these entries:
```json
{
  "scripts": {
    "tauri": "tauri",
    "tauri:dev": "tauri dev",
    "tauri:build": "tauri build",
    "dev": "tauri dev"
  }
}
```

> Note: The existing `"start": "electron-forge start"` and other Electron scripts remain untouched.

- [ ] **Step 3: Commit**

```bash
git add package.json
git commit -m "feat: add Tauri dev/build scripts"
```

---

### Task 0.9: Generate app icons

**Files:**
- Modify: `src-tauri/icons/` (generated)

Generate proper icon set from the existing logo for all platforms.

- [ ] **Step 1: Generate icons**

```bash
cd /Users/taitran/Desktop/english-tool
pnpm tauri icon assets/logo.png
```

Expected: Icon files generated in `src-tauri/icons/`

- [ ] **Step 2: Commit**

```bash
git add src-tauri/icons/
git commit -m "feat: generate app icons for Tauri"
```

---

### Task 0.10: Verify with `cargo tauri dev`

**Files:**
- Verify: entire setup

Run the Tauri dev server to verify UI renders.

- [ ] **Step 1: Run cargo tauri dev**

```bash
cd /Users/taitran/Desktop/english-tool
pnpm tauri dev
```

Expected:
- Rust compilation succeeds
- Vite dev server starts on port 1420
- Tauri window opens showing the React UI with Neris Translator layout
- Console shows IPC errors for settings/history commands (expected — Phase 1)

- [ ] **Step 2: If successful, commit any generated files**

```bash
git add -A
git commit -m "feat: complete Phase 0 Tauri scaffold and verify UI"
```

> If `cargo tauri dev` fails, debug common issues:
> - Missing Rust toolchain: `rustup update`
> - Port conflict: kill process on port 1420
> - Missing beforeDevCommand: ensure `"dev": "tauri dev"` script works
> - Cargo build errors: check Cargo.toml dependency versions
