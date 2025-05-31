/**
 * Background service worker for Project Clippy.
 * Handles context menu creation and other background tasks.
 */
import type { Snippet } from '@/utils/types';

chrome.runtime.onInstalled.addListener(() => {
  console.log('Project Clippy extension installed.');
  initializeContextMenus();
  updatePasteContextMenu(); // Initial setup
});

function initializeContextMenus() {
  chrome.contextMenus.create({
    id: 'saveSnippet',
    title: 'Save to Clippy',
    contexts: ['selection'],
  });

  chrome.contextMenus.create({
    id: 'pasteSnippetParent',
    title: 'Paste from Clippy',
    contexts: ['editable'],
  });
}

// Listener for context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'saveSnippet') {
    if (info.selectionText && tab?.id) {
      console.log('Selected text to save via context menu:', info.selectionText);
      await chrome.storage.local.set({ pendingSnippetText: info.selectionText });
      try {
        await chrome.action.openPopup();
      } catch (e: unknown) {
        console.warn("chrome.action.openPopup() failed, attempting to open popup.html in a new tab.", e);
        chrome.tabs.create({ url: chrome.runtime.getURL('src/popup/index.html') });
      }
    }
  } else if (typeof info.menuItemId === 'string' && info.menuItemId.startsWith('paste-snippet-')) {
    const snippetIdToPaste = info.menuItemId.replace('paste-snippet-', '');
    chrome.storage.local.get({ snippets: [] }, (result) => {
      const snippets: Snippet[] = result.snippets as Snippet[];
      const snippet = snippets.find((s) => s.id === snippetIdToPaste);
      if (snippet && tab?.id) {
        chrome.scripting.executeScript({
          target: { tabId: tab.id, allFrames: true },
          func: pasteTextInActiveElement,
          args: [snippet.text],
        }).catch(err => console.error('Error executing script:', err));
      }
    });
  } else if (info.menuItemId === 'open-clippy-to-see-all') {
    try {
      await chrome.action.openPopup();
    } catch (e: unknown) {
      console.warn("chrome.action.openPopup() failed, attempting to open popup.html in a new tab.", e);
      chrome.tabs.create({ url: chrome.runtime.getURL('src/popup/index.html') });
    }
  }
});

function pasteTextInActiveElement(textToPaste: string) {
  const activeElement = document.activeElement as HTMLInputElement | HTMLTextAreaElement | HTMLElement;
  if (activeElement && (activeElement.isContentEditable || activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
    if ('value' in activeElement && typeof activeElement.value === 'string') {
      const el = activeElement as HTMLInputElement | HTMLTextAreaElement;
      const start = typeof el.selectionStart === 'number' ? el.selectionStart : el.value.length;
      const end = typeof el.selectionEnd === 'number' ? el.selectionEnd : el.value.length;
      el.value = el.value.substring(0, start) + textToPaste + el.value.substring(end);
      const newCursorPosition = start + textToPaste.length;
      el.selectionStart = newCursorPosition;
      el.selectionEnd = newCursorPosition;
    } else if (activeElement.isContentEditable) {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        range.insertNode(document.createTextNode(textToPaste));
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
      } else {
        document.execCommand('insertText', false, textToPaste);
      }
    }
  }
}

async function updatePasteContextMenu() {
  chrome.contextMenus.remove('pasteSnippetParentChildren', () => {
    if (chrome.runtime.lastError && !chrome.runtime.lastError.message?.includes('Cannot find menu item')) {
      console.warn('Error removing old paste submenus (pasteSnippetParentChildren):', chrome.runtime.lastError.message);
    }
    createOrUpdatePasteSubmenuItems();
  });
}

function createOrUpdatePasteSubmenuItems() {
  chrome.storage.local.get({ snippets: [] }, (result) => {
    const snippets: Snippet[] = result.snippets as Snippet[];
    if (snippets.length > 0) {
      chrome.contextMenus.create({
        id: 'pasteSnippetParentChildren',
        parentId: 'pasteSnippetParent',
        title: 'Your Snippets',
        contexts: ['editable'],
        enabled: false
      });

      const recentSnippets = snippets.slice(0, 10);
      recentSnippets.forEach((snippet) => {
        chrome.contextMenus.create({
          id: `paste-snippet-${snippet.id}`,
          parentId: 'pasteSnippetParent',
          title: snippet.title ? (snippet.title.length > 30 ? snippet.title.substring(0,27) + "..." : snippet.title) : (snippet.text.length > 30 ? snippet.text.substring(0, 27) + "..." : snippet.text),
          contexts: ['editable'],
        });
      });
      if (snippets.length > 10) {
        chrome.contextMenus.create({
          id: 'paste-separator-more',
          parentId: 'pasteSnippetParent',
          type: 'separator',
          contexts: ['editable'],
        });
        chrome.contextMenus.create({
          id: 'open-clippy-to-see-all',
          parentId: 'pasteSnippetParent',
          title: 'More... (Open Clippy)',
          contexts: ['editable'],
        });
      }
    } else {
      chrome.contextMenus.remove('pasteSnippetParentChildren', () => {
        if (chrome.runtime.lastError && !chrome.runtime.lastError.message?.includes('Cannot find menu item')) {
          console.warn('Error removing pasteSnippetParentChildren when no snippets exist:', chrome.runtime.lastError.message);
        }
      });
      chrome.contextMenus.create({
        id: 'noSnippetsToPaste',
        parentId: 'pasteSnippetParent',
        title: '(No snippets saved yet)',
        contexts: ['editable'],
        enabled: false,
      });
    }
  });
}

chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.snippets) {
    updatePasteContextMenu();
    chrome.runtime.sendMessage({ action: 'snippetSaved' }).catch((e: unknown) => console.log("Popup not open or error sending message:", e));
  }
});

console.log('Background script loaded. Context menus initialized.');
