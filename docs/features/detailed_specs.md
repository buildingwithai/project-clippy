# Project Clippy: Detailed Feature Specifications

## 1. Workflow Enhancements

### Global Hotkey & Command Palette
- **User Story**: As a keyboard-first power user, I want to open Clippy without touching the mouse.
- **Flow**:
  1. Press ⌥⌘C (default)
  2. A small overlay appears
  3. Type to filter snippets
  4. Hit Enter to paste
- **Value**: Zero context switching, saves seconds on every paste

### Pinned Snippets
- **User Story**: As a heavy user, I want to mark my top snippets so they always show first.
- **Flow**:
  1. Click ⭐ next to a snippet
  2. Hotkey overlay opens showing starred section on top
  3. Select and paste
- **Value**: Surfaces most used content instantly

## 2. Smart & Dynamic Snippets

### Template Variables
- **User Story**: As a recruiter, I want to insert a name and date into one template.
- **Flow**:
  1. Create snippet with `{{name}} {{date}}`
  2. Paste → modal asks for values
  3. Fill fields and confirm
  4. Personalized text appears
- **Value**: Turns snippets into micro-templates

### Form-Filling Macros
- **User Story**: As a salesperson, I want Clippy to walk through a form and drop known values.
- **Flow**:
  1. Open web form
  2. Right-click page → Clippy → Run macro
  3. Macro fills each field
  4. Review then submit
- **Value**: Speeds up repetitive sign-ups or demos

## 3. Sync & Security

### Cloud Sync
- **User Story**: As a remote worker, I want my snippets on every computer.
- **Flow**:
  1. Toggle Sync in settings
  2. Sign in with Google
  3. Snippets upload then appear on second device after login
- **Value**: Continuity across devices

### End-to-End Encryption
- **User Story**: As a developer, I want to store API keys safely.
- **Flow**:
  1. Turn on Pass-lock
  2. Create master password
  3. Paste encrypted snippet → Clippy prompts for password → decrypts and pastes
- **Value**: Trust to save sensitive info

## 4. Collaboration Features

### Team Spaces
- **User Story**: As an agency PM, I want to share folders with my team.
- **Flow**:
  1. Create new Team space
  2. Invite teammates by email
  3. Drag snippets into shared folder
  4. Teammates see them instantly
- **Value**: Keeps everyone on message

### Snippet Permalinks
- **User Story**: As a mentor, I want to send a link that pre-loads a snippet.
- **Flow**:
  1. Right-click snippet → Copy link
  2. Paste link in chat
  3. Receiver clicks link → Clippy opens import dialog → Save
- **Value**: One-click snippet sharing

## 5. AI Features

### Auto-Suggest Save
- **User Story**: As a new user, I want Clippy to notice repeated copies.
- **Flow**:
  1. Copy same text 3 times
  2. Toast appears "Save to Clippy?"
  3. Click Save, choose folder
  4. Snippet now ready
- **Value**: Onboards users gradually

### Contextual Rewrite
- **User Story**: As a marketer, I want to shorten or translate highlighted text.
- **Flow**:
  1. Highlight text
  2. Right-click → Clippy → Shorten
  3. AI returns summary
  4. Click Paste
- **Value**: Quick content transformations

## 6. Technical Improvements

### Omnibox Command
- **User Story**: As a dev, I want to paste a snippet from the address bar.
- **Flow**:
  1. Focus address bar
  2. Type `cli invoice`
  3. Autocomplete inserts snippet in current field
- **Value**: Frictionless, mouse-free

### i18n Support
- **User Story**: As a non-English user, I want the UI in my language.
- **Flow**:
  1. Clippy reads Chrome locale
  2. UI labels switch automatically
- **Value**: Broadens audience

## Implementation Notes
- Each feature follows the pattern: User Story → Step-by-Step Flow → Business Value
- Features are grouped by category for easy reference
- Implementation complexity varies from simple (UI tweaks) to complex (AI features)
- Prioritize features based on user impact vs implementation effort

## 7. Competitors: Clippr (Chrome Web Store)

### Overview
- Name: Clippr — "Save text and images from the web"
- Listing summary: One-click capture for text/images, organization via folders/shortcuts, notes, search, board view, image crop/edit, multi-select, undo, themes, and cross-device transfer/sync. Privacy statement: no data collection (per listing).

### Analogy (mental model)
- Clippr is like a personal scrapbook or Pinterest board for your web finds. You collect pieces (text/images), label them, and browse them visually. In contrast, Project Clippy is a command palette for pasting the right content into rich web editors reliably and fast.

### Deep feature explanations (how it works, who uses it, value, and why now)

1) Save Text and Images (one-click capture)
- How to use: Highlight text or hover an image → click the Clippr action (toolbar icon or context menu) → the item is saved to your library.
- User story: As a student, I want to quickly save quotes and diagrams from articles so I can review them later without losing source context.
- Value: Reduces friction for collecting inspiration/research; keeps disparate content in one place.
- Analogy: Like adding clippings to a physical notebook as you read magazines.
- Why now: Browsing sessions are fragmented; saving snippets prevents context loss and eliminates browser-tab overload.

2) Folders & Folder Shortcuts (auto-organize by website)
- How to use: Create folders (e.g., “Recipes”, “Design Inspo”). Enable folder shortcuts that route items from specific domains into a chosen folder automatically.
- User story: As a home cook, I want anything saved from allrecipes.com to land in my Recipes folder without manual sorting.
- Value: Low-effort organization that scales as your library grows; builds consistent structure.
- Analogy: Rules in email that auto-file messages into folders.
- Why now: As collections grow, manual sorting becomes a chore; auto-rules maintain order.

3) Notes on Clips
- How to use: After saving, add a freeform note to a clip to capture why it matters or what to do next.
- User story: As a marketer, I want to save a competitor’s headline with a note like “Test similar hook for Q4 landing page.”
- Value: Preserves intent and context, increasing the usefulness of saved items later.
- Analogy: Sticky notes attached to magazine cutouts.
- Why now: Memory decays quickly; short notes preserve reasoning at capture time.

4) Board View (Pinterest-like grid)
- How to use: Switch library view to a grid to browse clips as tiles/cards.
- User story: As a designer, I want to visually scan saved screenshots to spot patterns and themes.
- Value: Visual scanning is faster for imagery-heavy collections; improves discovery.
- Analogy: A mood board of your saved items.
- Why now: Visual-first workflows are common (design, social, ecommerce); grid browsing accelerates curation.

5) Image Edit (Crop & Edit)
- How to use: After saving an image, open it in the built-in editor to crop or lightly adjust before storing.
- User story: As a researcher, I want to crop irrelevant parts of a chart so only the key area remains.
- Value: Keeps clips clean and focused; reduces noise in future reviews.
- Analogy: Trimming a photo before pinning it to your board.
- Why now: Screenshots often contain extra UI; quick edits save time vs opening a full editor.

6) Search
- How to use: Use the search bar to filter by text matches across saved items; optionally combine with folder filters.
- User story: As a student, I want to find that quote about “working memory” without re-opening dozens of tabs.
- Value: Retrieval speed; turns a pile of clippings into a usable knowledge base.
- Analogy: Spotlight search for your clippings.
- Why now: Larger libraries demand fast retrieval to remain useful.

7) Multi-Select + Bulk Delete
- How to use: Enter selection mode, choose multiple items, and delete them in one action.
- User story: As a frequent saver, I want to purge low-quality or outdated clips occasionally without clicking each one.
- Value: Library hygiene at scale.
- Analogy: Batch-selecting photos on your phone.
- Why now: Collections bloat over time; bulk ops keep storage and cognitive load manageable.

8) Undo Delete
- How to use: After a delete action, an “Undo” toast appears to restore items.
- User story: As a student, I want to quickly recover if I delete the wrong quote.
- Value: Safety net; encourages confident cleanup.
- Analogy: Ctrl+Z for your clippings.
- Why now: Users are more willing to organize when errors are reversible.

9) Themes
- How to use: Pick from preset themes to change the extension’s look and feel.
- User story: As a night-owl, I want a darker theme to reduce eye strain.
- Value: Comfort/personalization; minor but pleasant usability boost.
- Analogy: Skins for your notebook.
- Why now: Personalization improves adoption and satisfaction.

10) Cross-Device Transfer/Sync
- How to use: Sign into Chrome sync or Clippr’s account flow (implied by listing) to access your clips across devices.
- User story: As a remote worker, I want clips from my home laptop to show up on my work machine.
- Value: Continuity across contexts; your library follows you.
- Analogy: Notes syncing between your phone and laptop.
- Why now: Hybrid work makes cross-device continuity table stakes.

### Personas (Clippr)
- Consumers/prosumers: students, home cooks, designers, hobbyists, inspiration collectors.
- Jobs-to-be-done: capture, lightly annotate, visually browse, and occasionally clean up.

### Overlap vs Project Clippy
- Capture highlighted text: Aligns with our `P0‑5: Highlight‑to‑save+` (we add URL/timestamp + dedupe suggestions).
- Organization/bulk ops: Related to our later `P2: Bulk operations & tags` roadmap.

### Gaps vs Project Clippy (our key differentiators)
- Adaptive "Paste As" formatting profiles per domain (`P0‑1`): correctness in rich editors (HTML/Markdown/Plain).
- Variables & quick‑fill prompts (`P0‑2`): micro-templating with popover auto-fill.
- Analytics v1 + auto‑reorder suggestions (`P0‑3`): promote winners, prune noise.
- Context‑aware tray (`P0‑4`): domain/app filtered mini-launcher with keyboard nav.
- Expanded hotkeys 8/12 (`P0‑6`) and command palette (`P1`): speed for power users.
- Compliance & per‑app visibility rules (`P1`): governance not present in Clippr’s model.

### They have that we don’t prioritize today
- Image-centric workflows: image capture + crop/edit; Board View; themes.
- Undo affordance as a first-class UX pattern.
- Auto-folder by domain (we could mirror via auto-tags by domain).
- Explicit “transfer to other devices” messaging (we rely on Chrome sync; ensure we communicate it).

### Why users pick Clippr vs Project Clippy
- Clippr: Best when the primary job is collecting and browsing saved content (especially images) with light notes and visual discovery.
- Project Clippy: Best when the primary job is pasting accurately and fast into rich web editors (Gmail, Intercom, Notion, Docs) with personalization, hotkeys, and telemetry-driven curation.

### Recommendations for us (selective parity without losing focus)
- Add Undo after delete in snippet list (lightweight, trust-building).
- Consider Auto-tag by domain as a rules analog to auto-foldering.
- Clearly message cross-device sync if using `chrome.storage.sync`.
- Stay focused on paste reliability + workflow accelerators (tray, variables, formatting profiles), which are outside Clippr’s scope.

### References
- Source of competitor data: Chrome Web Store listing for Clippr (extension ID `pfglcbmpkoenkbpmjikbefpahaeechpg`).
- Our roadmap for overlap/gaps: `product/backlog_GPT-5_API_with_items_and_acceptance_criteria.md`.
