# Project Clippy: Feature Roadmap & Enhancement Ideas

## 1. Workflow Enhancements

### Global Hotkey & Command Palette
- **User Value**: Keyboard-driven access to snippets without leaving workflow
- **Implementation**: `chrome.commands` shortcut → in-page overlay
- **Priority**: High - Core UX improvement

### Pinned/Starred Snippets
- **User Value**: Quick access to frequently used items
- **Implementation**: Boolean flag in IndexedDB + UI for pinning

### Snippet Preview & Inline Edit
- **User Value**: Reduces context switching
- **Implementation**: Hover tooltips + inline text editing

## 2. Smart Snippets

### Template Variables
- **Use Cases**: Email templates, form letters, code snippets
- **Implementation**: `{{variable}}` syntax with simple parser
- **Example**: `Hello {{name}}, thanks for your message about {{topic}}`

### Dynamic Data Tokens
- **Tokens to Support**:
  - `{{today}}` - Current date
  - `{{clipboard}}` - Last copied content
  - `{{time}}` - Current time

### Form-Filling Macros
- **User Value**: Automate repetitive form entry
- **Implementation**: `chrome.scripting.executeScript` for field population

## 3. Sync & Security

### Cross-Device Sync
- **Implementation**: Client-side encryption → Firebase/Supabase
- **Monetization**: Premium feature

### End-to-End Encryption
- **Implementation**: AES-GCM in browser
- **Use Case**: Secure storage of sensitive snippets

### Data Portability
- **Features**:
  - JSON export/import
  - Version history
  - Cloud backup/restore

## 4. Collaboration Features

### Team Spaces
- **Use Case**: Shared snippet libraries for teams
- **Implementation**: `ownerGroupId` in snippet schema

### Snippet Sharing
- **Features**:
  - Permalinks to specific snippets
  - Read-only sharing
  - Team collaboration controls

## 5. AI Features

### Auto-Suggest Snippets
- **Trigger**: Repeated copy actions
- **UI**: Non-intrusive toast notification

### Smart Transformations
- **Actions**:
  - Summarize
  - Fix grammar
  - Translate
  - Format
- **Implementation**: OpenAI API integration

## 6. Technical Improvements

### Chrome Integration
- Omnibox support (`cli <snippet>`)
- Manifest V3 migration
- i18n & RTL support

## Prioritization Guide

### Quick Wins (Phase 1)
1. Global hotkey overlay
2. Template variables
3. Basic snippet organization

### Monetization Drivers
- **Pro Tier ($3-5/month)**:
  - Unlimited snippets
  - Cloud sync
  - Encryption
  - Variables & macros
- **Team Tier ($7-10/user/month)**:
  - Shared folders
  - Analytics
  - Role-based permissions

## Implementation Notes
- Start with local storage MVP
- Add cloud sync as premium feature
- Implement AI features after core functionality is stable
- Use feature flags for gradual rollout
