/**
 * Type definitions for Project Clippy.
 */

export interface Snippet {
  id: string;
  title?: string; // Optional title
  text: string;    // The snippet content
  createdAt: string; // ISO date string for when it was created
  folderId?: string; // Optional: ID of the folder this snippet belongs to
  tags?: string[];   // Optional tags for better organization
  lastUsed?: string; // Optional: ISO date string for when it was last used
  frequency?: number; // Optional: How many times it has been used
  isPinned?: boolean; // Optional: True if the snippet is pinned
  pinnedAt?: string;  // Optional: ISO date string for when it was pinned
}

export interface Folder {
  id: string;
  name: string;
  emoji: string; // Emoji representing the folder
  createdAt: string; // ISO date string
}
