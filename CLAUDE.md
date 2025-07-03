# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
Project Clippy is a Chrome extension for saving and reusing text snippets. Built with Vite, React, TypeScript, Tailwind CSS, and Radix UI components.

## Development Commands
- `npm run dev` - Start development server (Vite)
- `npm run build` - Build extension for production (creates `dist/` folder)
- `npm run lint` - Run ESLint with TypeScript support
- `npm run preview` - Preview built extension

## Project Architecture

### Chrome Extension Structure
This is a Manifest V3 Chrome extension with multiple entry points:
- **Popup** (`src/popup/`) - Main extension popup interface
- **Background** (`src/background/`) - Service worker handling context menus, hotkeys, and storage
- **Content Scripts** (`src/content/`) - Scripts injected into web pages
- **Overlay** (`src/overlay/`) - Full-screen search interface (triggered by Alt+Shift+V)
- **Options** (`src/options/`) - Extension settings page

### Key Components
- **FolderTabs** - Tab-based folder navigation system
- **SnippetItem** - Individual snippet display with copy/edit/pin actions
- **SnippetFormModal** - Modal for creating/editing snippets
- **CustomTooltip** - Consistent tooltip component (preferred over default tooltip)

### Data Flow
- Chrome storage API (`chrome.storage.local`) for persistence
- Background script manages context menus and hotkey commands
- Popup app communicates with background via `chrome.runtime` messaging
- Content scripts handle text pasting in active elements

### Build System
- Vite with custom rollup configuration for multiple entry points
- TypeScript paths alias `@/` maps to `src/`
- Tailwind CSS with custom theme including space/astronomy colors
- Post-build scripts handle manifest generation and file copying

### Storage Schema
```typescript
type Snippet = {
  id: string;
  title?: string;
  text: string;
  folderId?: string;
  createdAt: string;
  lastUsed?: string;
  frequency?: number;
  isPinned?: boolean;
  pinnedAt?: string;
}

type Folder = {
  id: string;
  name: string;
  emoji: string;
  createdAt: string;
}
```

### Extension Permissions
- `storage` - Local data persistence
- `contextMenus` - Right-click context menu integration
- `activeTab` - Access to current tab for pasting
- `scripting` - Inject scripts for text pasting functionality

## Development Notes
- Uses strict TypeScript configuration
- Follows Chrome extension security best practices
- Background script uses DOMPurify for text sanitization
- Supports global hotkeys for snippet pasting (configurable in options)
- Context menus dynamically update when snippets change