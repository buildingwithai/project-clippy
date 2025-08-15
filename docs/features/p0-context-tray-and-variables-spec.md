# P0 Feature Spec — Context‑Aware Tray + Variables & Quick‑Fill Prompts

Owner: PM/Eng/Design
Date: 2025‑08‑15
Branch: `feature/context-tray-and-variables-spec`
Related backlog: `P0‑4: Context‑aware tray` and `P0‑2: Variables & quick‑fill prompts` in `product/backlog_GPT-5_API_with_items_and_acceptance_criteria.md`

---

## 0) Purpose & Scope

- Purpose: Deliver two high‑impact “wow” features that make Clippy feel fast, reliable, and personal in rich web editors.
- In scope:
  - A domain/app‑aware mini tray, invoked via hotkey or floating bubble, filtered to the current site.
  - Lightweight templating with inline variables that prompt the user at paste time with a minimal popover near the caret.
- Out of scope:
  - Full template language (conditionals/loops), team collaboration, server‑side analytics. See “Out of Scope” in backlog.

---

## 1) Personas & JTBD

- Support/Success agents: “Paste the right, formatted answer instantly in Intercom/Zendesk.”
- SDR/AE: “Personalize intros with {{firstName}} in Gmail/LinkedIn quickly.”
- Recruiting/Talent Ops: “Drop role‑specific snippets into ATS forms reliably.”
- Content/Marketing/Writers: “Draft in Notion/Docs without fighting formatting.”

Jobs to be done:
- Find the right snippet for this site fast (context filter).
- Fill 1–5 variables at paste time with defaults/auto‑prefill.
- Paste with formatting integrity per site (pairs with P0‑1).

---

## 2) UX Overview

- Trigger: Hotkey (e.g., Ctrl/Cmd+Shift+Space) or 32×32 floating bubble toggle.
- Tray: Minimal overlay filtered to current domain; keyboard‑first navigation; paste or copy directly; ESC closes.
- Variables popover: Appears only if unresolved variables exist in the chosen snippet; anchored near caret; minimal fields; Enter to confirm & paste.
- Motion: One element transforms between bubble ↔ tray using scale/translate (200 ms ease‑out). Calm, confident, quick.

---

## 3) Context‑Aware Tray — Detailed UX & UI

### 3.1 Entry Points
- Hotkey: `Ctrl/Cmd+Shift+Space` opens the tray at last position (session‑persisted). If first open in session, center within viewport.
- Bubble: 32×32 bubble appears when `window.getSelection().toString()` is non‑empty or user explicitly toggles tray via hotkey. Clicking bubble expands into tray (animated scale+translate from bubble’s position).
- Right‑click: Optional context menu item “Open Clippy Tray here”.

### 3.2 Layout & Components
- Container: Rounded rectangle overlay (max‑width 480px; max‑height 60vh; min‑width 360px). Elevation via shadow token.
- Header Row:
  - Domain chip: “This site: {domain.com}” (active filter). Click to toggle filter on/off.
  - Search input: Type to filter title/keywords (debounced 100 ms). Shortcut `/` focuses search.
  - Close button (X): Click or `Esc`.
- List area:
  - Sections (if any): Pinned for this site; Recent; All (filtered).
  - Snippet Row (compact density): Title, optional hotkey badge (slots 1–12), small “mode” chip (HTML/MD/Plain) if P0‑1 is set.
  - Row actions (on hover/focus): Paste (Enter), Copy (Shift+Enter), More (…) to open in full popup.
- Footer:
  - Hint text: “↑/↓ navigate · Enter paste · Shift+Enter copy · Esc close”.

### 3.3 States & Interactions
- Idle: Subtle entrance animation (opacity 0→1, scale 0.98→1 in 150–200 ms ease‑out). 
- Hover (rows): Background token `hover` (4.5:1 contrast), subtle raise.
- Focus (rows): 2px focus ring; arrow keys move focus.
- Active/Press: Quick 90 ms press scale 0.98; then paste action triggers.
- Disabled: Not applicable to rows; buttons may disable while pasting.
- Empty (no matches): Show “No snippets for this site. Clear the ‘This site’ filter or open full popup.”

### 3.4 Keyboard Navigation
- Up/Down: Move focused row.
- Enter: Paste focused snippet via background pipeline.
- Shift+Enter: Copy focused snippet to clipboard.
- Tab: Cycle to header inputs and footer links.
- Esc: Close tray.

### 3.5 Accessibility
- ARIA roles: `role="dialog"` for tray container; labelled by header. Rows as `role="listitem"` within `role="list"`.
- Focus trapping: Within tray until dismiss.
- Screen reader hints: Live region updates on paste success/failure (“Pasted ‘{title}’ to page”).

### 3.6 Animation & Emotion
- Bubble→Tray: Single element transform using `transform: scale() translate()`, 200 ms ease‑out, from bubble origin to tray target.
- Tray→Bubble: Reverse on outside click or X.
- Emotional tone: Calm (no bounce), confident (decisive), efficient (sub‑200 ms).

### 3.7 Position Persistence
- While the page is open: `sessionStorage` memory in content script to remember last drag position.
- Default: Centered if no prior position this session.

---

## 4) Variables & Quick‑Fill Prompts — Detailed UX & UI

### 4.1 Detection & Syntax
- Syntax: `{{variableName}}` or `{{variableName:Default Value}}` inside snippet content (text and/or HTML version).
- Detection: Parsing utility scans snippet on selection to determine if unresolved variables exist.

### 4.2 Popover Behavior
- When shown: Only if unresolved variables remain after checking stored defaults (per domain and per snippet).
- Anchor: Near caret if possible; fallback to tray header anchor with arrow.
- Structure:
  - Title: “Fill variables” and snippet title.
  - Fields: Render in order of appearance; each input labeled; defaults applied from snippet or stored preferences.
  - Data sources for auto‑prefill: 
    1) Stored per‑domain defaults
    2) Stored per‑snippet defaults
    3) Current selection text (if short)
    4) Clipboard text (permission‑gated)
  - Actions: “Fill & Paste” (Enter), “Copy Filled”, “Remember these values for this domain?” (checkbox)
  - Hint: “Hold Alt when pasting to edit variables even if defaults exist.”

### 4.3 States & Interactions
- Idle: Popover fades in (opacity 0→1, 120 ms). First input auto‑focuses.
- Hover: Inputs and buttons show standard hover tokens.
- Focus: Clear focus rings; up/down to move between fields; `Tab` normal tab order.
- Validation: Required fields highlight with inline error if left blank.
- Submit: Enter triggers fill+paste; disabled while background paste promise pending.
- Dismiss: `Esc` closes popover (and tray, if it originated there, only after explicit dismiss or paste completes).

### 4.4 Accessibility
- ARIA `role="dialog"` with `aria-describedby` pointing to the list of fields; focus trapped within popover.
- SR announcement: “Variables filled. Pasting now.” on submit; “Defaults saved for {domain}.” on opt‑in.

### 4.5 Emotion & Motion
- Micro‑motion only; keep it fast. Goal emotion: “The app read my mind.”

---

## 5) Data Model & Storage

- Storage areas:
  - `chrome.storage.local` for per‑domain rules and defaults (privacy‑safe device local).
  - `chrome.storage.sync` for cross‑device basics where safe (e.g., hotkey mappings, non‑sensitive defaults). Ensure size limits are respected.

- Keys (illustrative):
  - `clippy.domainProfiles`: { [domain: string]: { pasteMode: "html" | "markdown" | "plain" } }
  - `clippy.variableDefaults`: {
      perDomain: { [domain: string]: { [variableName: string]: string } },
      perSnippet: { [snippetId: string]: { [variableName: string]: string } }
    }
  - `clippy.trayLastPosition`: { top: number, left: number } (session scoped in content; optional persisted opt‑in)
  - `clippy.usageCounters`: { [snippetId: string]: { [domain: string]: { paste: number, copy: number, lastUsed: number } } }

- Privacy: Never store raw pasted content in telemetry; domain‑level signals only (paste/copy events).

---

## 6) Architecture & Messaging

- Content script (`src/content/content.ts`):
  - Renders tray overlay and variables popover (lazy‑load heavier UI on first open).
  - Captures keyboard events, selection data, and caret coordinates.
  - Sends paste/copy requests to background with resolved content.

- Background service worker (`src/background/background.ts`):
  - Central paste pipeline, including integration with `P0‑1` formatting profiles (transform HTML→MD/Plain if needed).
  - Variables resolution step BEFORE paste when triggered from tray; ensure `getCurrentVersion(snippet)` is used to obtain correct versioned text/html.
  - Robust injection path (per prior fix): try debug paste across frames, then legacy, then clipboard fallback and URL navigation if applicable. Coerce undefined HTML to empty string to avoid serialization errors.
  - Telemetry counters (anonymous): increment on success; store by {snippetId, domain}.

- Messaging contracts (examples):
  - `clippy.openTray` → content opens tray.
  - `clippy.requestSnippetsForDomain` → background returns filtered list with usage metadata.
  - `clippy.requestPaste` → background performs variables resolution (if any) + formatting transform + paste.
  - `clippy.saveDefaults` → background persists per‑domain/per‑snippet defaults.

---

## 7) Formatting & Integration (ties to P0‑1)

- On paste, background checks domain profile: HTML/Markdown/Plain; transforms snippet content accordingly prior to injection.
- Tray row shows a temporary “mode” chip after paste (e.g., HTML), per acceptance criteria.

---

## 8) Security, Privacy, CSP

- Strict CSP; no remote code execution; sanitize all user‑generated text in UI.
- API keys are never in page scope. Variables default storage never includes secrets.
- Host permissions: least privilege; request context menu permissions only if user enables the context menu entry.
- Clipboard access: only when user action requires; avoid persistent polling.

---

## 9) Performance & Bundling

- Content script bundle budget ≤ 30 kB minified; the overlay UI is code‑split and only loaded on first open.
- Use requestIdleCallback to warm caches after first interaction.
- Avoid memory leaks in service worker; remove listeners on unload.

---

## 10) i18n & RTL

- All strings via `chrome.i18n` under `_locales/`.
- Test for length expansion and RTL mirroring (tray layout, popover arrow direction).

---

## 11) Accessibility

- Color contrast ≥ 4.5:1 for all text/interactive states.
- Keyboard operability end‑to‑end: open → navigate → paste/copy → close.
- Focus trapping in both tray and popover; `Esc` closes popover; second `Esc` closes tray.

---

## 12) QA & Test Plan

- Unit (Vitest):
  - Variable parser (defaults, edge cases, escaping).
  - Domain profile transform (HTML/MD/Plain).
  - Storage adapters (read/write/merge precedence).
- E2E (Playwright):
  - Tray: hotkey open, domain filter chip, keyboard navigation, paste to input in Gmail/Notion test pages.
  - Variables: snippet with `{{firstName}}` prompts, prefill from selection, Enter to paste; Alt‑override flow.
  - Failure path: if all paste attempts fail, clipboard fallback; verify clipboard content.
- Accessibility checks: axe‑core scan on tray & popover; focus order tests.
- Performance: measure first open time and code‑split chunk sizes.

---

## 13) Acceptance Criteria Mapping

- Tray
  - Opens and filters by current domain; position persists for session; keyboard navigation works (↑/↓, Enter paste, Shift+Enter copy); background paste succeeds; ESC closes.
- Variables
  - Given unresolved variables, show popover near caret; defaults applied from per‑domain/per‑snippet; Enter fills & pastes; Alt forces edit when defaults exist; consistent behavior for paste and copy.
- Telemetry (anonymous): counters increment on success with domain context; opt‑out toggle respected.

---

## 14) Milestones & Timeline

- M1 (2–3 days): Tech scaffolding — content overlay shell, message contracts, code‑split, storage keys.
- M2 (3–4 days): Tray UI + keyboard nav + domain filtering + paste/copy wiring.
- M3 (3–4 days): Variables parser + popover + defaults storage + auto‑prefill + submit flows.
- M4 (2–3 days): Formatting profile integration, polish (chips, hints), accessibility & i18n pass.
- M5 (2 days): QA/E2E + instrumentation + docs.

---

## 15) Risks & Mitigations

- Rich editor variability (iframes/contenteditable quirks):
  - Mitigation: multi‑frame debug paste first; robust fallbacks (legacy, clipboard copy).
- Anchor near caret may be blocked by editor: 
  - Mitigation: fallback anchor to tray header; clear instruction.
- Content script bundle creep:
  - Mitigation: code‑split UI; lazy‑load; monitor build size.

---

## 16) Open Questions

- Should tray position persist beyond session (per domain) or stay ephemeral? Default to session‑only for now.
- Should variable defaults be scoped by domain+snippet or allow global fallbacks? Proposed: per‑domain first, then per‑snippet, else none.
- Should we offer a “Preview filled output” button in popover? Optional v2; initial MVP shows 1‑line diff preview.
