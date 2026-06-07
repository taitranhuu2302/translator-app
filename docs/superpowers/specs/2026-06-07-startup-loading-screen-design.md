# Startup Loading Screen Design

## Problem

On app startup, the main window appears but shows a white/blank screen momentarily before React hydrates and renders the UI. This is caused by:

1. The BrowserWindow's default background is white (`#ffffff`)
2. `createRoot` replaces the HTML splash (`#app-splash`) immediately, and during the brief gap before `<App />` paints its first frame, the white window background shows through
3. Module loading (renderer → index.css + index.tsx → React + providers + translate page) takes noticeable time

## Solution: `backgroundColor` + Graceful Splash Handoff

### Change 1 — Main Window Background Color

In `src/main/windows/window-manager.ts`, add `backgroundColor` to the main window `BrowserWindow` options:

```ts
backgroundColor: '#181926'
```

This matches `hsl(234, 23%, 12%)` — the app's dark theme background (`--background` in `index.css`). The window itself now has a dark background, eliminating any white flash during:

- CSS loading before inline splash styles apply
- Between React removing the splash and rendering the first App frame
- Any other timing gaps during startup

### Change 2 — Graceful Splash Handoff

In `src/index.tsx`, after `root.render(<App />)`, fade out the splash instead of letting React abruptly remove it:

```tsx
root.render(<App />);

// Fade out splash after React paints its first frame
requestAnimationFrame(() => {
  const splash = document.getElementById("app-splash");
  if (splash) {
    splash.style.transition = "opacity .15s ease-out";
    splash.style.opacity = "0";
    setTimeout(() => splash.remove(), 150);
  }
});
```

This creates a smooth visual transition: dark splash → fade out → React content appears.

### What Does NOT Change

- Loading window (44×44 spinner) — still used for quick-translate/voice operations, not startup
- Main window `show: false` + `ready-to-show` logic — unchanged
- `index.html` splash content — unchanged
- No new windows, no architectural changes
- No changes to quick window or loading window

## Testing

1. Launch app — verify no white flash during startup
2. Verify splash (logo + animated dots) appears briefly and fades out smoothly
3. Verify app functions normally after splash disappears
4. Run `npm run typecheck` and `npm run lint`

## Files Changed

| File | Change |
|------|--------|
| `src/main/windows/window-manager.ts` | Add `backgroundColor: '#181926'` to main window options |
| `src/index.tsx` | Add splash fade-out after `root.render()` |
