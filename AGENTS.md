# AGENTS.md

## Project

Electron desktop app (Neris Translator) — Vietnamese ↔ English translation. Electron Forge + React 19 + TypeScript + Tailwind CSS v4 + shadcn/ui.

## Commands

```bash
npm start              # dev with HMR (electron-forge start)
npm run typecheck      # tsc --noEmit
npm run lint           # eslint --ext .ts,.tsx .
npm test               # vitest run (src/tests/**/*.test.ts)
npm run test:watch     # vitest watch mode
npm run make           # build installer for current OS
npm run package        # package app without installer
npm run publish        # publish to GitHub Releases
```

## Architecture

```
src/main.ts              → Electron main process entry
src/preload.ts           → contextBridge (exposes window.electronAPI)
src/main/                → main process: windows, ipc, settings, shortcuts, translation, tray, updater
src/renderer/            → React renderer (features/, app/, lib/)
src/shared/              → types.ts + ipc-channels.ts (shared between main & renderer)
src/components/ui/       → shadcn/ui components
src/tests/               → Vitest tests (globals: true, environment: 'node')
```

Three renderer windows: **main_window** (`index.html`), **quick_window** (`index-quick.html`), **loading_window** (`index-loading.html`).

## Key Conventions

- **Path alias**: `@/` → `src/` (tsconfig + all vite configs + vitest config)
- **IPC**: Channels defined as `const` objects in `src/shared/ipc-channels.ts`. Typed via `IpcInvokeMap` / `IpcPushMap` interfaces. Preload exposes `window.electronAPI` via contextBridge.
- **Error handling**: `Result<T>` = `{ success: true, data: T } | { success: false, error: AppError }`. Use `ok()`, `err()`, `isOk()`, `isErr()` helpers from `src/shared/types.ts`.
- **Styling**: Tailwind v4 via `@tailwindcss/vite` plugin. Use `cn()` from `@/lib/utils` for class merging.
- **shadcn**: `radix-nova` style, lucide icons, components at `@/components/ui`.
- **Tests**: Only `src/tests/**/*.test.ts`. Use `vi.mock` for electron/node API mocking.

## Gotchas

- `vite.main.config.ts` marks `bufferutil`, `utf-8-validate`, `better-sqlite3` as external (native modules). If you add new native deps, add them there.
- Tailwind v4 uses the Vite plugin directly — the `postcss.config.mjs` exists but is legacy. CSS entry is `src/index.css`.
- CI (`release.yml`) triggers on `release/v*.*.*` branches, builds all 3 platforms in parallel.
- Settings use a versioned JSON file (`version: 6` in `DEFAULT_SETTINGS`). Bump the version when changing the schema.
- The `build-macos.sh` and `entitlements.plist` are for macOS notarization/signing.
