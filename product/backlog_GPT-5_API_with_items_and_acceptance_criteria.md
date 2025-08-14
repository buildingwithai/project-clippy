# Product Backlog — Project Clippy

Filename: backlog_GPT-5_API_with_items_and_acceptance_criteria.md
Audience: PM, Eng, Design, Marketing
Source: April Dunford positioning output + P0/P1 themes
Date: 2025-08-11

---

## Positioning Context (why this backlog exists)
Project Clippy is a browser‑native rich‑text snippet automation platform for cross‑site workflows. We win in web‑first teams using rich editors/iframes (Docs, Notion, Gmail, Intercom/HubSpot/LinkedIn/ATS) that value speed, reliability, formatting integrity, and continuous improvement via versions + analytics.

Primary personas: Support/Success, Sales/SDR/AE, Recruiting/Talent Ops, Content/Marketing/Writers, Founders/Operators.

---

## Now / Next / Later
- Now (P0):
  1) Adaptive "Paste As" formatting profiles (per app/domain)
  2) Variables & quick‑fill prompts (lightweight templating)
  3) Analytics v1 + auto‑reorder suggestions
  4) Context‑aware tray (domain/app aware)
  5) Highlight‑to‑save+ (metadata & dedupe)
  6) Expand hotkeys: 4 → 8/12 with layers

- Next (P1):
  7) Compliance: Approved versions + labels
  8) Per‑app visibility rules
  9) Pack Store 2.0 (ratings/updates/search)
  10) Keyboard‑first command palette

- Later (P2):
  11) Collaboration & sharing
  12) Translation workflow
  13) Bulk operations & tags
  14) Outcome‑tied analytics

---

## P0‑1: Adaptive "Paste As" formatting profiles (per app/domain)

- Problem
  - Formatting inconsistencies across editors force manual cleanup. Users need predictable output per site/app.

- Value hypothesis
  - Per‑domain defaults (HTML/Markdown/Plain) reduce cleanup time and increase paste success confidence.

- User stories
  - As a Support agent in Intercom, I want to paste as Plain to avoid stray HTML in the chat composer.
  - As an SDR in Gmail, I want HTML so my headings and bullets survive.
  - As a writer in Notion, I want Markdown or HTML depending on the block so structure remains intact.

- When/why they use it
  - First paste on a site, or whenever output doesn’t look right. They set it once; it sticks per domain.

- Access & flow (Chrome extension)
  - Popup → `SnippetItem` action menu → "Paste As…" → choose [HTML | Markdown | Plain] → "Remember for this site" checkbox.
  - Context menu → "Paste As" submenu with the same options and a star to set default for current domain.
  - Options page → Formatting Profiles: search/add domain rules, set default mode, preview example.
  - First‑time nudge: non‑blocking toast "Set default paste format for this site?"

- Design notes (display)
  - Use a compact radio group with short help text and small preview chips (H1, bullet, link) to visualize differences.
  - Badge on snippet row temporarily shows the mode used (e.g., HTML) after paste.

- Acceptance criteria
  - Given no rule for domain X, when user chooses "Paste As: Markdown" and checks "Remember", then future pastes on domain X use Markdown until changed.
  - Given a saved rule, when pasting from hotkey or context menu, then formatting engine respects the rule without opening the popup.
  - Given "Plain" mode, headings/lists/links are stripped to text; given "HTML", block/inline tags are preserved where the editor allows; given "Markdown", lists/headings render correctly in Markdown‑friendly editors.
  - Telemetry records domain, selected mode, and paste success/failure (privacy‑safe, no content).

- Metrics
  - ↓ formatting fixes per paste; ↑ paste success rate per domain; rule adoption rate; rule change frequency.

- Engineering notes
  - Add a per‑domain rules store in `chrome.storage.local`.
  - Extend background injection path to transform snippet HTML → desired output (MD/plain) before paste; fallback strategy remains.

---

## P0‑2: Variables & quick‑fill prompts (lightweight templating)

- Problem
  - Personalized fields (first name, company, ticket ID) require manual edits after paste.

- Value hypothesis
  - Inline variables with a pre‑paste quick‑fill sheet speed personalization without complexity.

- User stories
  - As an SDR, I want {{firstName}} to prompt me at paste time so I can personalize quickly.
  - As Support, I want {{ticketId}} auto‑suggested from clipboard or page selection to avoid typing.
  - As a recruiter, I want per‑variable defaults so I don’t re‑enter the same signature fields.

- When/why they use it
  - For semi‑templated messages with 1–5 fields. They prefer speed over a heavy template engine.

- Access & flow
  - Editor: Define variables in the rich editor with `{{variableName}}`; optional default `{{company:Acme}}`.
  - Paste time: If unresolved vars exist, show a small anchored popover near caret with inputs (prefilled from defaults, last used, or selection/clipboard).
  - Actions: "Fill & Paste", "Copy Filled", "Remember these values for this domain?" (optional per‑domain defaults).

- Design notes
  - Minimal, keyboard‑first form; order matches appearance in text; show a 1‑line preview diff in the popover footer.

- Acceptance criteria
  - Given a snippet with `{{firstName}}`, when pasting, then a popover prompts for the value unless a saved default exists for this domain.
  - Given defaults present, when pasting, then variables are auto‑resolved with a quick confirmation toast and no popover unless user holds Alt to edit.
  - Values are applied consistently for both "Paste" and "Copy" flows.

- Metrics
  - Variable usage rate, average fields per paste, popover completion time, abort rate.

- Engineering notes
  - Parsing/resolution utility; small store for per‑domain and per‑snippet defaults; integrate with background paste path.

---

## P0‑3: Analytics v1 + auto‑reorder suggestions

- Problem
  - Users can’t tell which snippets perform; libraries drift and get cluttered.

- Value hypothesis
  - Lightweight usage analytics and gentle suggestions help users promote winners and prune noise.

- User stories
  - As a Support lead, I want to see my top 10 snippets this week so I can pin/refine them.
  - As an individual, I want the app to suggest moving a frequently used snippet higher.

- When/why they use it
  - Weekly review, or in‑flow via suggestions after clear usage patterns.

- Access & flow
  - Popup: Badges on each snippet (Used, Last Used). A "Suggestions" banner appears when criteria met (e.g., 10+ pastes in 7d).
  - Click suggestion → one‑click "Pin" or "Move to Top"; undo in toast.
  - Options: Analytics tab with 7/30‑day charts per domain/app.

- Acceptance criteria
  - Usage counters increment on successful paste/copy with domain/app context; anonymous and content‑free.
  - Suggestions trigger when thresholds hit; user can accept/decline; acceptance updates `sortOrder`/pin state.
  - Opt‑out toggle exists in Settings.

- Metrics
  - Suggestion CTR, reorder acceptance rate, paste volume lift of promoted snippets.

- Engineering notes
  - Counters keyed by {snippetId, domain}; suggestion engine runs in background; UI banner in popup.

---

## P0‑4: Context‑aware tray (domain/app aware)

- Problem
  - Searching through a large library slows users down; they want the right subset for the current site.

- Value hypothesis
  - A small tray filtered to current domain/app cuts retrieval time.

- User stories
  - As a Support agent in Zendesk, I want the tray to show my Zendesk snippets first.
  - As a marketer in Notion, I want only my drafting snippets visible by default.

- Access & flow
  - Access: Hotkey (e.g., Ctrl/Cmd+Shift+Space) or 32×32 floating bubble toggle on page (respects product’s global UI guidelines).
  - Tray shows: search field, pinned for this site, and a "This site" filter chip; link to full popup.
  - Right‑click paste or click‑to‑copy directly from the tray; ESC closes.

- Design notes
  - Minimal, high‑contrast, ARIA‑labeled; draggable within viewport; remembers last position while page open.

- Acceptance criteria
  - Tray opens and filters by current domain; paste/copy actions work via background pipeline; position persists for the session.
  - Keyboard navigation: up/down to navigate, Enter to paste, Shift+Enter to copy.

- Metrics
  - Open rate, time‑to‑paste from tray, domain filter usage.

- Engineering notes
  - Content script overlay; message bridge to background; reuse snippet list item components with smaller density.

---

## P0‑5: Highlight‑to‑save+ (metadata & dedupe)

- Problem
  - Captured snippets lack context; duplicates accumulate.

- Value hypothesis
  - Auto‑metadata and dedupe keep the library clean and searchable.

- User stories
  - As a researcher, I want URL and timestamp captured automatically when I save highlighted text.
  - As a power user, I want the app to suggest appending to an existing snippet when the content is similar.

- Access & flow
  - Right‑click selected text → "Save to Clippy".
  - Modal prefilled with Title (auto from first line), URL, Favicon, Timestamp; show "Possible duplicates" with side‑by‑side diff.
  - Actions: "Create new", "Append to existing", "Replace version".

- Acceptance criteria
  - Metadata fields are captured automatically; dedupe uses a simple hash + fuzzy match; user can merge or create new.
  - If append chosen, new content becomes a new version or appended block based on user selection.

- Metrics
  - Duplicate rate over time; append vs create ratio; time saved per capture session.

- Engineering notes
  - Hashing/fuzzy utils; duplicates search; minor updates to `SnippetFormModal`.

---

## P0‑6: Expand hotkeys (4 → 8/12 with layers)

- Problem
  - Power users outgrow 4 slots quickly.

- Value hypothesis
  - More slots with a simple mental model preserves speed without complexity.

- User stories
  - As a heavy user, I want 8–12 fast slots so my core library is one shortcut away.

- Access & flow
  - Options → Hotkeys: slots 1–12 mapped to Chrome shortcuts (with OS‑normalized labels). Layering example: hold Alt for slots 5–8, Shift for 9–12.
  - Popup: Hotkey badges display the actual OS shortcut; tooltips explain layers.

- Acceptance criteria
  - Users can assign and use slots 1–12; layering works reliably; badges/shortcuts displayed correctly across OS.

- Metrics
  - Slots utilization; paste latency; error rate when triggering layered shortcuts.

- Engineering notes
  - Extend commands in manifest; update background listeners; UI in Options and badges.

---

## P1: Summaries (brief)
- Compliance: Approved versions + labels → lock an Approved variant; visible label chips; admin‑only toggle for team packs.
- Per‑app visibility rules → include/exclude by domain/app; pairs with context‑aware tray.
- Pack Store 2.0 → ratings, updates, changelog; improved discovery and update prompts.
- Command palette → global keyboard launcher for type→enter paste/copy.

---

## Cross‑feature Non‑functional Requirements
- Accessibility: keyboard navigation, ARIA labels, focus trapping.
- Privacy: no snippet content in telemetry; domain‑level signals only.
- Performance: content script bundle ≤ 30 kB; defer heavy UI until needed.
- Security: strict CSP; sanitize user‑generated text; least privilege permissions.

---

## Visual Guidance (for Marketing)
- Where features live
  - Popup: snippet list, actions, suggestions banner; settings for formatting profiles.
  - Options: domains/format profiles, hotkeys, analytics.
  - Context Menu: Paste/Paste As/Save from selection.
  - Overlay Tray: filtered quick picker; hotkey to open; draggable.

- How it looks/behaves
  - Clean, compact lists using shadcn/ui + Tailwind tokens.
  - Badges for status (Used/Last Used/Mode). Small preview chips for formatting modes.
  - Quick‑fill popover near caret for variables; minimal, keyboard‑first.

---

## Acceptance Criteria Template (for future items)
- Given [context]
- When [action]
- Then [expected outcome]
- And [error/edge handling]

---

## Open Research Questions
- Which editors most often mangle HTML vs accept Markdown? (rank Intercom, Zendesk, LinkedIn, Gmail, Notion, Docs.)
- Minimal variable set per persona (SDR vs Recruiting vs Support).
- Appetite for layered hotkeys vs command palette; discoverability options.
- Signals/thresholds users find helpful vs noisy for suggestions.

---

## Out of Scope (for now)
- Team cloud accounts or real‑time collaboration.
- Full template language (conditionals/loops); we start with simple variables.
- Server‑side analytics; we remain device‑local & privacy‑safe initially.
