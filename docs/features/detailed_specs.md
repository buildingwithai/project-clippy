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
