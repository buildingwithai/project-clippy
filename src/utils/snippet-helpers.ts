/**
 * Helper functions for working with versioned snippets
 */

import type { Snippet, SnippetVersion } from './types';

/**
 * Get the current version of a snippet safely
 * Handles both old format (text/html at root) and new format (versions array)
 */
export function getCurrentVersion(snippet: Snippet): SnippetVersion {
  // New format - use versions array
  if (snippet.versions && snippet.versions.length > 0) {
    const currentIndex = snippet.currentVersionIndex ?? 0;
    const version = snippet.versions[currentIndex];
    if (version) {
      return version;
    }
  }
  
  // Fallback to old format for backward compatibility
  return {
    id: `version-${Date.now()}-0`, // Generate ID for backward compatibility
    text: snippet.text,
    html: snippet.html,
    createdAt: snippet.createdAt,
  };
}

/**
 * Get all versions of a snippet safely
 * Handles both old format and new format
 */
export function getAllVersions(snippet: Snippet): SnippetVersion[] {
  // New format - return versions array directly
  if (snippet.versions && snippet.versions.length > 0) {
    return snippet.versions;
  }
  
  // Fallback to old format - create single version from root text/html
  return [{
    id: `version-${snippet.id}-0`, // Generate ID based on snippet ID
    text: snippet.text,
    html: snippet.html,
    createdAt: snippet.createdAt,
  }];
}

/**
 * Get the total number of versions for a snippet
 */
export function getVersionCount(snippet: Snippet): number {
  return getAllVersions(snippet).length;
}

/**
 * Check if snippet has multiple versions
 */
export function hasMultipleVersions(snippet: Snippet): boolean {
  return getVersionCount(snippet) > 1;
}

/**
 * Convert old format snippet to new format
 * This is used for migration and runtime compatibility
 */
export function migrateSnippetToNewFormat(snippet: Snippet): Snippet {
  // Already in new format
  if (snippet.versions && snippet.versions.length > 0) {
    return {
      ...snippet,
      currentVersionIndex: snippet.currentVersionIndex ?? 0,
    };
  }
  
  // Convert from old format
  const version: SnippetVersion = {
    id: `version-${snippet.id}-0`, // Generate ID for migration
    text: snippet.text,
    html: snippet.html,
    createdAt: snippet.createdAt,
  };
  
  return {
    ...snippet,
    versions: [version],
    currentVersionIndex: 0,
  };
}

/**
 * Create a new version of a snippet
 */
export function createNewVersion(
  snippet: Snippet, 
  newText: string, 
  newHtml?: string,
  newTitle?: string
): Snippet {
  const currentVersions = getAllVersions(snippet);
  const versionCount = currentVersions.length;
  const newVersion: SnippetVersion = {
    id: `version-${snippet.id}-${versionCount}`, // Generate sequential ID
    title: newTitle, // Optional version-specific title
    text: newText,
    html: newHtml,
    createdAt: new Date().toISOString(),
  };
  
  return {
    ...snippet,
    versions: [...currentVersions, newVersion],
    currentVersionIndex: currentVersions.length, // Point to the new version
  };
}

/**
 * Update the current version of a snippet
 */
export function updateCurrentVersion(
  snippet: Snippet,
  newText: string,
  newHtml?: string
): Snippet {
  const versions = getAllVersions(snippet);
  const currentIndex = snippet.currentVersionIndex ?? 0;
  
  const updatedVersions = [...versions];
  updatedVersions[currentIndex] = {
    ...updatedVersions[currentIndex],
    text: newText,
    html: newHtml,
  };
  
  return {
    ...snippet,
    versions: updatedVersions,
    currentVersionIndex: currentIndex,
  };
}

/**
 * Switch to a different version of a snippet
 */
export function switchToVersion(snippet: Snippet, versionIndex: number): Snippet {
  const versions = getAllVersions(snippet);
  if (versionIndex < 0 || versionIndex >= versions.length) {
    return snippet; // Invalid index
  }
  
  return {
    ...snippet,
    versions,
    currentVersionIndex: versionIndex,
  };
}

/**
 * Get version by ID
 */
export function getVersionById(snippet: Snippet, versionId: string): SnippetVersion | null {
  const versions = getAllVersions(snippet);
  return versions.find(v => v.id === versionId) || null;
}

/**
 * Get version index by ID
 */
export function getVersionIndexById(snippet: Snippet, versionId: string): number {
  const versions = getAllVersions(snippet);
  return versions.findIndex(v => v.id === versionId);
}

/**
 * Truncate text for previews
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength) + '...';
}

/**
 * Get version preview (20 chars for display, 60 for hover)
 */
export function getVersionPreview(version: SnippetVersion, mode: 'display' | 'hover' = 'display'): string {
  const maxLength = mode === 'hover' ? 60 : 20;
  return truncateText(version.text, maxLength);
}