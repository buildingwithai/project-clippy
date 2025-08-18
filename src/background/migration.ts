/**
 * Handles data migration for Project Clippy.
 */
import type { Snippet } from '@/utils/types';
import { migrateSnippetToNewFormat } from '@/utils/snippet-helpers';

export const runMigrations = async (): Promise<void> => {
  console.log('Running migrations...');
  await migrateV1_to_V2();
  await migrateV2_to_V3();
  await migrateV3_to_V4();
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

/**
 * Migration from V2 to V3.
 * - Converts text/html from snippet root to versions array
 * - Adds currentVersionIndex to all snippets
 */
const migrateV2_to_V3 = async (): Promise<void> => {
  try {
    const result = await chrome.storage.local.get({ snippets: [], version: 2 });
    const snippets = result.snippets as Snippet[];
    const currentVersion = result.version as number;

    if (currentVersion >= 3) {
      console.log('Data is already at version 3 or higher. No migration needed.');
      return;
    }

    console.log('Migrating data from version 2 to 3 (version control system)...');
    const migratedSnippets = snippets.map(migrateSnippetToNewFormat);

    await chrome.storage.local.set({ snippets: migratedSnippets, version: 3 });
    console.log('Successfully migrated snippets to version 3 with version control.');
  } catch (error) {
    console.error('Error during V2 to V3 migration:', error);
  }
};

/**
 * Migration from V3 to V4.
 * - Adds `sourceUrl` and `sourceDomain` to the Snippet type for URL tracking
 */
const migrateV3_to_V4 = async (): Promise<void> => {
  try {
    const result = await chrome.storage.local.get({ snippets: [], version: 3 });
    const snippets = result.snippets as Snippet[];
    const currentVersion = result.version as number;

    if (currentVersion >= 4) {
      console.log('Data is already at version 4 or higher. No migration needed.');
      return;
    }

    console.log('Migrating data from version 3 to 4 (URL tracking)...');
    const migratedSnippets = snippets.map((snippet) => {
      if (typeof snippet.sourceUrl === 'undefined') {
        return {
          ...snippet,
          sourceUrl: undefined,
          sourceDomain: undefined,
        };
      }
      return snippet;
    });

    await chrome.storage.local.set({ snippets: migratedSnippets, version: 4 });
    console.log('Successfully migrated snippets to version 4 with URL tracking.');
  } catch (error) {
    console.error('Error during V3 to V4 migration:', error);
  }
};
