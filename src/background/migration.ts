/**
 * Handles data migration for Project Clippy.
 */
import type { Snippet } from '@/utils/types';

export const runMigrations = async (): Promise<void> => {
  console.log('Running migrations...');
  await migrateV1_to_V2();
  console.log('Migrations complete.');
};

/**
 * Migration from V1 to V2.
 * - Adds `isPinned` and `pinnedAt` to the Snippet type.
 */
const migrateV1_to_V2 = async (): Promise<void> => {
  try {
    const result = await chrome.storage.local.get({ snippets: [], version: 1 });
    const snippets = result.snippets as Snippet[];
    const currentVersion = result.version as number;

    if (currentVersion >= 2) {
      console.log('Data is already at version 2 or higher. No migration needed.');
      return;
    }

    console.log('Migrating data from version 1 to 2...');
    const migratedSnippets = snippets.map((snippet) => {
      if (typeof snippet.isPinned === 'undefined') {
        return {
          ...snippet,
          isPinned: false,
          pinnedAt: undefined,
        };
      }
      return snippet;
    });

    await chrome.storage.local.set({ snippets: migratedSnippets, version: 2 });
    console.log('Successfully migrated snippets to version 2.');
  } catch (error) {
    console.error('Error during V1 to V2 migration:', error);
  }
};
