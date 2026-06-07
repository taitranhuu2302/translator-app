# Neris Translator

A desktop **Vietnamese ↔ English** translation app for Windows, macOS, and Linux — built with Electron + React + TypeScript.

---

## Features

### Manual Translation
Type or paste text into the Input field and press **Translate** (or `Ctrl+Enter` / `⌘Enter`) to translate. Swap direction (VI → EN / EN → VI) using the swap button or the `Ctrl+Shift+S` / `⌘⇧S` shortcut. Copy the result instantly with the **Copy** button.

### Quick Translate (floating popup)
The core feature: **select any text in any app**, press the global shortcut (default `Ctrl+Alt+Q` / `⌥⇧Q`) — a small popup appears with the translation instantly, without switching windows. Press `Esc` or click outside to dismiss.

### Quick Translate + Replace
Select any text in any app, then press the replace shortcut (default `Ctrl+Alt+R` / `⌥⇧R`). The app translates the selected text to your configured quick target language and pastes it back to replace the original selection.

### Custom Shortcuts
Both global shortcuts can be changed in **Settings**:
- **Quick Translate** — shortcut to translate the currently selected text
- **Quick Translate + Replace** — shortcut to translate and replace the selected text in place
- **Toggle App Window** — show/hide the main window

Shortcuts are validated before saving and automatically rolled back if registration fails.

### System Tray
The app minimizes to the system tray instead of quitting. Right-click the tray icon to **Show/Hide**, **Quick Translate**, **Settings**, or **Quit**.

### Auto Update
Packaged Windows and macOS builds automatically check GitHub Releases for updates. When a newer version finishes downloading, the app asks whether to **Restart Now** or **Later**.

### Other Settings
- **Auto-copy delay** — increase if text capture is unreliable on your machine
- **Restore clipboard** — restore original clipboard contents after capture
- **Popup always on top** — keep the Quick Translate popup above all other windows
- **Start minimized** — launch hidden to tray (Windows/Linux)

---

## Getting Started

**Requirements:** Node.js ≥ 18, npm ≥ 9

```bash
git clone <repo>
cd neris-translator
npm install
npm start
```

`npm start` launches Electron Forge with Vite HMR for development.

---

## Default Shortcuts

| Action | Windows / Linux | macOS |
|--------|-----------------|-------|
| Quick Translate | `Ctrl+Alt+Q` | `⌥⇧Q` |
| Quick Translate + Replace | `Ctrl+Alt+R` | `⌥⇧R` |
| Toggle App Window | `Ctrl+Alt+E` | `⌥⇧E` |
| Voice To Text | `Ctrl+Alt+D` | `⌥⇧D` |
| Swap language direction | `Ctrl+Shift+S` | `⌘⇧S` |
| Translate (in-app) | `Ctrl+Enter` | `⌘↵` |
| Close Quick popup | `Esc` | `Esc` |

---

## System Permissions

### macOS — Accessibility
Quick Translate simulates `Cmd+C` via AppleScript to read the selected text. macOS requires **Accessibility** access:

1. Open **System Settings → Privacy & Security → Accessibility**
2. Enable **Neris Translator** (or **Terminal** if running via `npm start`)

Without this permission the popup will display a clear error message explaining the issue.

### Linux — xdotool
Install `xdotool` for Quick Translate to work:

```bash
# Debian/Ubuntu
sudo apt install xdotool

# Arch
sudo pacman -S xdotool
```

---

## Build & Packaging

See **[BUILD.md](./BUILD.md)** for full step-by-step instructions.

Quick reference:

```bash
npm run typecheck   # type check
npm run lint        # lint
npm test            # run unit tests

npm run make        # build installer for the current OS
npm run publish     # publish release artifacts
```

Artifacts are output to `out/make/` (ZIP on macOS, Squirrel installer on Windows, deb/rpm on Linux).

To release an update, bump the `version` in `package.json`, then run `npm run publish`.
Auto-update via `update-electron-app` requires public GitHub Releases. If you move to private releases later, switch to a custom update feed.

---

## Known Limitations

- Text only — no file import (.docx, .pdf, …)
- No translation history or cloud sync
- No OCR or voice input
- Linux support is best-effort

---

## License

[MIT](./LICENSE) © [taitranhuu2302](https://github.com/taitranhuu2302)
