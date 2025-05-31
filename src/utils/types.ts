/**
 * Type definitions for Project Clippy.
 */

export interface Snippet {
  id: string;
  title?: string; // Optional title
  text: string;    // The snippet content
  createdAt: string; // ISO date string for when it was created
  tags?: string[];   // Optional tags for better organization
  lastUsed?: string; // Optional: ISO date string for when it was last used
  frequency?: number; // Optional: How many times it has been used
}
