/**
 * Development helpers for testing features
 * These are only used during development and should not be included in production builds
 */

import type { Snippet, SnippetVersion } from './types';

/**
 * Add test versions to an existing snippet for testing the version carousel
 * This will modify the first snippet in storage to have multiple versions
 */
export async function addTestVersionsToFirstSnippet(): Promise<void> {
  try {
    const result = await chrome.storage.local.get(['snippets']);
    const snippets: Snippet[] = result.snippets || [];
    
    if (snippets.length === 0) {
      console.warn('No snippets found to add test versions to');
      return;
    }
    
    const firstSnippet = snippets[0];
    
    // Create test versions
    const testVersions: SnippetVersion[] = [
      {
        id: `version-${firstSnippet.id}-1`,
        text: "This is version 2 of the snippet - edited with additional details",
        html: firstSnippet.html ? `<p>This is <strong>version 2</strong> of the snippet - edited with additional details</p>` : undefined,
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
      },
      {
        id: `version-${firstSnippet.id}-2`,
        text: "Version 3: Complete rewrite with new functionality and improved wording for better clarity",
        html: firstSnippet.html ? `<p>Version 3: <em>Complete rewrite</em> with new functionality and improved wording for <strong>better clarity</strong></p>` : undefined,
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
      },
      {
        id: `version-${firstSnippet.id}-3`,
        text: "Version 4: Final version with all the bells and whistles, comprehensive coverage of all use cases",
        html: firstSnippet.html ? `<p>Version 4: <strong>Final version</strong> with all the bells and whistles, comprehensive coverage of all use cases</p>` : undefined,
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
      },
    ];
    
    // Add versions to the first snippet
    firstSnippet.versions = testVersions;
    
    // Save back to storage
    await chrome.storage.local.set({ snippets });
    
    console.log('✅ Added test versions to first snippet. Reload the extension to see the version carousel!');
    console.log(`Snippet "${firstSnippet.title || 'Untitled'}" now has ${testVersions.length + 1} versions`);
    
  } catch (error) {
    console.error('Failed to add test versions:', error);
  }
}

/**
 * Remove test versions from all snippets
 */
export async function removeTestVersions(): Promise<void> {
  try {
    const result = await chrome.storage.local.get(['snippets']);
    const snippets: Snippet[] = result.snippets || [];
    
    // Remove versions from all snippets
    const cleanedSnippets = snippets.map(snippet => {
      const { versions, currentVersionIndex, ...rest } = snippet;
      return rest;
    });
    
    await chrome.storage.local.set({ snippets: cleanedSnippets });
    
    console.log('✅ Removed all test versions from snippets');
    
  } catch (error) {
    console.error('Failed to remove test versions:', error);
  }
}

// Make functions available in the global scope for console testing
if (typeof window !== 'undefined') {
  (window as any).addTestVersions = addTestVersionsToFirstSnippet;
  (window as any).removeTestVersions = removeTestVersions;
}