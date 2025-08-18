# Context Tray & Overlay Troubleshooting Guide

This document captures symptoms, root causes, and fixes for issues encountered while implementing the Context Tray overlay and input bubble.

Last updated: 2025-08-15

---

## Summary of Issues

- White/grey page background covering the site when opening modal
- Overlay not appearing on some sites (e.g., GitHub), but working on others (e.g., LinkedIn)
- Logo/bubble icon broken or not visible
- Keyboard shortcut not triggering; bubble click doing nothing
- `Unchecked runtime.lastError: The message port closed before a response was received`

---

## Root Causes & Fixes

### 1) White background hides the site
- Root cause: iframe-based overlay (full-viewport) + default white backgrounds inside the iframe document and CSS not consistently forcing transparency on all layers.
- Additional constraint: Some sites (GitHub) have strict CSP that interferes with iframe rendering.
- Fixes we applied (progressive):
  - Force transparency on every layer inside the iframe (html/body/root, wrapper, iframe element). Worked on LinkedIn, still broken on GitHub.
  - Final fix: Replace iframe-based overlay with a CSP-safe, direct DOM injection approach (no iframe). The modal is now a set of elements appended to `document.body` with transparent container and a single white modal box.

Relevant code:
- `src/background/background.ts` → `toggleOverlay()` now injects DOM directly instead of placing an iframe.
- Removed reliance on `src/overlay/index.html` for GitHub; still available for future use if needed elsewhere.

### 2) Overlay works on LinkedIn but not on GitHub
- Root cause: GitHub’s strict Content Security Policy (CSP) blocking/altering extension iframes (`frame-src 'self'`).
- Fix: Use non-iframe direct DOM injection. This avoids CSP frame restrictions entirely.

### 3) Broken bubble/logo image
- Root cause: Icon files were not exposed via `web_accessible_resources` so `chrome.runtime.getURL()` could not load them on some pages.
- Fixes:
  - Added `"icons/*"` to `public/manifest.json -> web_accessible_resources`.
  - Replaced the bubble icon with an inline SVG to avoid any runtime asset loading issues.

Relevant code:
- `public/manifest.json` → include `icons/*` in `web_accessible_resources`.
- `src/content/content.ts` → bubble uses inline SVG.

### 4) Keyboard shortcut not working
- Root cause(s):
  - Wrong expected combo used during testing (Cmd+Shift+P vs Cmd+Shift+Space).
  - Potential event conflicts without `stopPropagation()`.
- Fixes:
  - The content script listens for Cmd/Ctrl + Shift + Space and calls `openTray()`.
  - Added logging + `e.stopPropagation()` to avoid site-level handlers swallowing the event.

Relevant code:
- `src/content/content.ts` → keydown handler logs and triggers `openTray()` on Space.

### 5) "Message port closed before a response" warning
- Root cause: `chrome.runtime.sendMessage` without a response handler from background or the receiver closed early.
- Fix: Added `.then/.catch` logging from the sender; background side toggles overlay directly and does not need to respond. Warning is benign; logs help trace.

Relevant code:
- `src/content/content.ts` → `.then/.catch` around `chrome.runtime.sendMessage`.

---

## Quick Diagnostic Checklist

Run these checks in the page DevTools console:

1) Content script loaded?
- Expect: `[Clippy Content] Content script loaded and running`
- If missing: verify `public/manifest.json` content scripts and page matches.

2) Keyboard shortcut captured?
- Press Cmd+Shift+Space
- Expect: logs showing `Key pressed: Space` and `Keyboard shortcut triggered`

3) Bubble click captured?
- Expect: `[Clippy Content] Input bubble clicked`

4) Is background responding?
- Expect: `[Clippy] Received toggleOverlayNow from content { originX, originY }`

5) Modal creation success?
- If using DOM injection, elements with IDs should exist after trigger:
  - `#clippy-search-overlay-container`
  - `#clippy-search-input`

6) For GitHub or strict sites: ensure non-iframe path is used.

---

## Implementation Notes

- Overlay injection (DOM):
  - Container: fixed, full-viewport, transparent
  - Modal: centered with white background, shadow, border
  - Close logic: click outside or press `Esc`
  - Animation: scale from bubble origin

- Input bubble:
  - Shows on focus of text inputs, `contenteditable`
  - Excludes password fields
  - Draggable; position remembered during session
  - Inline SVG icon to avoid asset resolution issues

- Accessibility:
  - Bubble has `role="button"` and `aria-label`
  - Keyboard support: Enter/Space on bubble
  - Modal inputs focus management

---

## Common Errors & Resolutions

- White page background (GitHub): switch to DOM injection overlay
- Icon not visible: expose `icons/*` in manifest or use inline SVG
- Hotkey ignored: ensure Cmd+Shift+Space, add `stopPropagation()`
- Message port closed: add `.then/.catch` for logging; safe to ignore if overlay toggles

---

## Regression Tests (Manual)

- GitHub: open overlay → page remains visible; modal floats without backdrop
- LinkedIn: same behavior as above
- Gmail: verify no CSP breakage; overlay appears
- Bubble: appears on input focus, draggable, clickable
- Hotkey: Cmd+Shift+Space triggers overlay consistently

---

## File Touchpoints

- `src/background/background.ts` → `toggleOverlay()` (DOM-injected modal)
- `src/content/content.ts` → bubble logic, keyboard handler, messaging, logging
- `public/manifest.json` → expose `icons/*` in `web_accessible_resources`
- `src/overlay/*` → retained; not used for GitHub path (kept for future)

---

## Rollback Strategy

- If DOM-injected modal causes site conflicts, fall back to iframe-based overlay on permissive sites
- Feature-flag the overlay method by hostname if needed

---

## Future Hardening

- Migrate DOM-injected modal to a Shadow DOM container for better CSS isolation
- Add e2e tests covering GitHub/LinkedIn/Gmail
- Add telemetry (optional) for overlay open/close success
