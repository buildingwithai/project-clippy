/**
 * Background service worker for Project Clippy.
 * Handles context menu creation and other background tasks.
 */
import { runMigrations } from './migration';

import type { Snippet } from '@/utils/types';

const PACK_REGISTRY_URL = 'https://buildingwithai.github.io/project-clippy/packs/index.json';
const SIX_HOURS_MS = 6 * 60 * 60 * 1000;

// Flag to prevent race condition during initialization
let isInitializing = false;

// Fallback mock data for testing when the pack registry is not available
const MOCK_PACK_REGISTRY = {
  packs: [
    {
      id: 'basic-dev-snippets',
      name: 'Basic Development Snippets',
      description: 'Common code snippets for developers',
      snippetCount: 12,
      url: '/packs/basic-dev-snippets.json'
    },
    {
      id: 'ui-components',
      name: 'UI Component Templates',
      description: 'Ready-to-use UI component snippets',
      snippetCount: 8,
      url: '/packs/ui-components.json'
    },
    {
      id: 'productivity-templates',
      name: 'Productivity Templates',
      description: 'Email templates, meeting notes, and more',
      snippetCount: 15,
      url: '/packs/productivity-templates.json'
    }
  ]
};

async function fetchPackRegistry() {
  try {
    const res = await fetch(PACK_REGISTRY_URL, { cache: 'no-store' });
    if (!res.ok) {
      if (res.status === 404) {
        console.warn('[Clippy] Pack registry not found (404). Using fallback mock data for testing.');
        // Use mock data as fallback
        await chrome.storage.local.set({ 
          packRegistry: MOCK_PACK_REGISTRY, 
          packRegistryFetchedAt: Date.now(),
          usingMockData: true 
        });
        console.log('[Clippy] Mock pack registry loaded');
        return;
      }
      throw new Error(`HTTP ${res.status}`);
    }
    const data = await res.json();
    await chrome.storage.local.set({ 
      packRegistry: data, 
      packRegistryFetchedAt: Date.now(),
      usingMockData: false 
    });
    console.log('[Clippy] Pack registry updated');
  } catch (err) {
    console.error('[Clippy] Failed to fetch pack registry', err);
    // Fallback to mock data on any error
    console.warn('[Clippy] Using fallback mock data due to fetch error.');
    await chrome.storage.local.set({ 
      packRegistry: MOCK_PACK_REGISTRY, 
      packRegistryFetchedAt: Date.now(),
      usingMockData: true 
    });
    console.log('[Clippy] Mock pack registry loaded as fallback');
  }
}

if (chrome.alarms?.onAlarm) {
  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === "refreshPackRegistry") fetchPackRegistry();
  });
} else {
  console.warn("[Clippy] chrome.alarms API not available – skipping periodic registry refresh");
}

chrome.runtime.onInstalled.addListener(async () => {
  isInitializing = true;
  console.log('Project Clippy extension installed.');
  await runMigrations();
  initializeContextMenus();
  // Fetch packs immediately and set recurring alarm
  await fetchPackRegistry();
  chrome.alarms?.create?.("refreshPackRegistry", { periodInMinutes: 360 });
  isInitializing = false;
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
  }, () => {
    // Initial setup of paste menu items
    if (!chrome.runtime.lastError) {
      populatePasteSubmenuItems();
    }
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
        // Fallback for older browsers
        const textNode = document.createTextNode(textToPaste);
        const range = document.createRange();
        range.selectNodeContents(activeElement);
        range.collapse(false);
        range.insertNode(textNode);
      }
    }
  }
}

async function updatePasteContextMenu() {
  // 1. Remove the main parent item. This removes all its children.
  chrome.contextMenus.remove('pasteSnippetParent', () => {
    // Ignore errors if it doesn't exist (e.g., first run after an error or clean install)
    if (chrome.runtime.lastError && 
        !chrome.runtime.lastError.message?.includes('Cannot find menu item with id pasteSnippetParent')) {
      console.warn('Error removing main pasteSnippetParent:', chrome.runtime.lastError.message);
    }

    // 2. Recreate the main parent item.
    chrome.contextMenus.create({
      id: 'pasteSnippetParent',
      title: 'Paste from Clippy',
      contexts: ['editable'],
    }, () => {
      if (chrome.runtime.lastError) {
        console.error('Error recreating pasteSnippetParent:', chrome.runtime.lastError.message);
        return;
      }
      // 3. Populate its children with current snippets.
      populatePasteSubmenuItems(); // Renamed for clarity
    });
  });
}

// Renamed and slightly adjusted function to populate items
function populatePasteSubmenuItems() {
  chrome.storage.local.get({ snippets: [] }, (result) => {
    const snippets: Snippet[] = result.snippets as Snippet[];
    
    if (snippets.length === 0) {
      chrome.contextMenus.create({
        id: 'noSnippetsToPaste',
        parentId: 'pasteSnippetParent', // Parent is the newly created one
        title: '(No snippets saved yet)',
        contexts: ['editable'],
        enabled: false,
      });
      return;
    }

    // No need to create 'pasteSnippetParentChildren' group anymore, 
    // as we are rebuilding under the main 'pasteSnippetParent'.

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
        id: 'open-clippy-to-see-all', // Handled by the main onClicked listener
        parentId: 'pasteSnippetParent',
        title: 'More... (Open Clippy)',
        contexts: ['editable'],
      });
    }
  });
}

chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  if (request.action === 'getPackRegistry') {
    const { packRegistry, packRegistryFetchedAt } = await chrome.storage.local.get([
      'packRegistry',
      'packRegistryFetchedAt',
    ]) as { packRegistry?: unknown; packRegistryFetchedAt?: number };
    // If older than 6h or missing, refresh asynchronously (response returns cached / undefined immediately)
    if (!packRegistry || !packRegistryFetchedAt || Date.now() - packRegistryFetchedAt > SIX_HOURS_MS) {
      fetchPackRegistry();
    }
    sendResponse({ packRegistry });
    return true; // keep port open for async
  }
  if (request.type === 'PASTE_SNIPPET' && sender.origin === chrome.runtime.getURL('').slice(0, -1)) {
    handlePasteRequest(request.snippet);
  } else if (request.type === 'PASTE_SNIPPET_BY_ID') {
    const { snippetId } = request;
    const result = await chrome.storage.local.get('snippets');
    const snippets: Snippet[] = result.snippets || [];
    const snippetToPaste = snippets.find(s => s.id === snippetId);
    if (snippetToPaste) {
      handlePasteRequest(snippetToPaste);
    }
  }
  return true; // Keep channel open for async responses
});

async function handlePasteRequest(snippet: Snippet) {
  // DOMPurify is not available in the background service worker; use plain text
  const sanitizedText = snippet.text;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;

  // First, check if the active element is editable
  const injectionResults = await chrome.scripting.executeScript({
    target: { tabId: tab.id, allFrames: true },
    func: () => document.activeElement instanceof HTMLInputElement || document.activeElement instanceof HTMLTextAreaElement || (document.activeElement as HTMLElement).isContentEditable,
  });

  if (injectionResults.some((r: chrome.scripting.InjectionResult) => r.result)) {
    chrome.scripting.executeScript({
      target: { tabId: tab.id, allFrames: true },
      func: pasteTextInActiveElement,
      args: [sanitizedText],
    }).catch(err => console.error('Error pasting text:', err));
  } else {
    // If not editable, or if it's the address bar, copy to clipboard and notify
    await copyToClipboardAndNotify(sanitizedText, 'Pasted to clipboard!');
    // If it looks like a URL, try to navigate
    if (sanitizedText.startsWith('http://') || sanitizedText.startsWith('https://')) {
      chrome.tabs.update(tab.id, { url: sanitizedText });
    }
  }
}

async function copyToClipboardAndNotify(text: string, message: string) {
  try {
    // Use the offscreen document to write to the clipboard
    await chrome.scripting.executeScript({
      target: { tabId: (await chrome.tabs.query({ active: true, currentWindow: true }))[0].id! },
      func: (textToCopy) => navigator.clipboard.writeText(textToCopy),
      args: [text],
    });

    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: 'Clippy',
      message: message,
    });
  } catch (err) {
    console.error('Failed to copy to clipboard:', err);
  }
}

chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.snippets && !isInitializing) {
    updatePasteContextMenu();
    chrome.runtime.sendMessage({ action: 'snippetSaved' }).catch((e: unknown) => console.log("Popup not open or error sending message:", e));
  }
});

chrome.commands.onCommand.addListener(async (command, tab) => {
  if (command === 'toggle-overlay' && tab?.id) {
    console.log(`Command '${command}' triggered on tab ${tab.id}`);

    // Prevent injection on special pages
    if (tab.url?.startsWith('chrome://')) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: 'Clippy Action',
        message: "Clippy cannot be used on this special Chrome page."
      });
      return;
    }

    // Inject the content script to toggle the overlay
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: toggleOverlay,
    }).catch(err => console.error('Failed to inject script:', err));
    return;
  }

  // Handle hotkey-1, hotkey-2, etc. commands
  if (/^hotkey-\d+$/.test(command) && tab?.id) {
    const slot = command; // e.g., 'hotkey-1'
    console.log(`[Clippy] Hotkey command received: ${command} (slot: ${slot}) on tab ${tab.id}`);
    const result = await chrome.storage.local.get(['hotkeyMappings', 'snippets']);
    const hotkeyMappings = result.hotkeyMappings || [];
    const snippets: Snippet[] = result.snippets || [];
    const mapping = hotkeyMappings.find((m: { slot: string; snippetId: string }) => m.slot === slot);
    if (!mapping || !mapping.snippetId) {
      console.warn(`[Clippy] No snippet mapped for slot ${slot}`);
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: 'Clippy',
        message: `No snippet mapped for ${slot}. Set it in Clippy Options.`,
      });
      return;
    }
    const snippet = snippets.find(s => s.id === mapping.snippetId);
    if (!snippet) {
      console.warn(`[Clippy] Snippet with ID ${mapping.snippetId} not found for slot ${slot}`);
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: 'Clippy',
        message: `Snippet not found.`,
      });
      return;
    }
    // Paste the snippet
    console.log(`[Clippy] Pasting snippet for slot ${slot}:`, snippet);
    handlePasteRequest(snippet);
  }
});

/**
 * Injected into the active page to toggle the search overlay.
 * This function creates a host element, attaches a shadow DOM, and injects an
 * iframe pointing to the React-based overlay application.
 */
function toggleOverlay() {
  const CONTAINER_ID = 'clippy-search-overlay-container';

  // If the overlay exists, remove it and focus the body
  const existingContainer = document.getElementById(CONTAINER_ID);
  if (existingContainer) {
    existingContainer.remove();
    window.focus(); // Return focus to the main page
    return;
  }

  // Create the host container for the shadow DOM
  const host = document.createElement('div');
  host.id = CONTAINER_ID;
  document.body.appendChild(host);

  // Create a shadow root
  const shadowRoot = host.attachShadow({ mode: 'open' });

  // Create the iframe that will host the React app
  const iframe = document.createElement('iframe');
  iframe.src = chrome.runtime.getURL('overlay/index.html');
  Object.assign(iframe.style, {
    width: '100vw',
    height: '100vh',
    border: 'none',
    position: 'fixed',
    top: '0',
    left: '0',
    zIndex: '2147483647',
  });

  // Append the iframe to the shadow root
  shadowRoot.appendChild(iframe);

  // Add a listener to remove the overlay when a message is received from the iframe
  const messageListener = (event: MessageEvent) => {
    if (event.source === iframe.contentWindow && event.data.type === 'CLOSE_CLIPPY_OVERLAY') {
      host.remove();
      window.removeEventListener('message', messageListener);
    }
  };

  window.addEventListener('message', messageListener);
}

console.log('Background script loaded. Context menus initialized.');
