/**
 * Type definitions for Project Clippy.
 */

export interface SnippetVersion {
  id: string;      // Unique identifier for this version
  text: string;    // The snippet content (plain text)
  html?: string;   // Optional: HTML content for rich formatting
  createdAt: string; // ISO date string for when this version was created
}

export interface Snippet {
  id: string;
  title?: string; // Optional title
  text: string;    // DEPRECATED: The snippet content - use getCurrentVersion() instead
  html?: string;   // DEPRECATED: HTML content - use getCurrentVersion() instead  
  createdAt: string; // ISO date string for when it was created
  folderId?: string; // Optional: ID of the folder this snippet belongs to
  tags?: string[];   // Optional tags for better organization
  lastUsed?: string; // Optional: ISO date string for when it was last used
  frequency?: number; // Optional: How many times it has been used
  isPinned?: boolean; // Optional: True if the snippet is pinned
  pinnedAt?: string;  // Optional: ISO date string for when it was pinned
  sortOrder?: number; // Optional: Custom sort order for drag and drop reordering
  versions: SnippetVersion[]; // Array of ALL versions (including current) - required
  currentVersionIndex: number; // Index of the currently active version (default: 0)
}

export interface Folder {
  id: string;
  name: string;
  emoji: string; // Emoji representing the folder
  createdAt: string; // ISO date string
}
