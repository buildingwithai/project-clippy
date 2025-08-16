/**
 * Background service worker for Project Clippy.
 * Handles context menu creation and other background tasks.
 */
import type { Snippet, Folder } from '@/utils/types';

import { runMigrations } from './migration';
import { getCurrentVersion } from '@/utils/snippet-helpers';

import { parseVariables, resolveVariables } from '@/utils/variables';

const PACK_REGISTRY_URL = 'https://buildingwithai.github.io/project-clippy/packs/index.json';
const SIX_HOURS_MS = 6 * 60 * 60 * 1000;

// Flag to prevent race condition during initialization
let isInitializing = false;

// Fallback mock data for testing when the pack registry is not available
const MOCK_PACK_REGISTRY = [
  {
    id: 'ai-prompts',
    name: 'AI Prompts',
    description: 'Collection of useful AI prompts',
    snippetCount: 10,
    url: 'https://buildingwithai.github.io/project-clippy/packs/ai-prompts.json',
    version: '1.0.0',
    new: true
  },
  {
    id: 'basic-dev-snippets',
    name: 'Basic Development Snippets',
    description: 'Common code snippets for developers',
    snippetCount: 12,
    url: 'https://buildingwithai.github.io/project-clippy/packs/basic-dev-snippets.json',
    version: '1.0.0',
    new: false
  },
  {
    id: 'ui-components',
    name: 'UI Component Templates',
    description: 'Ready-to-use UI component snippets',
    snippetCount: 8,
    url: 'https://buildingwithai.github.io/project-clippy/packs/ui-components.json',
    version: '1.0.0',
    new: false
  }
];

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
    // Handle both array format and { packs: [...] } format for backward compatibility
    const packRegistry = Array.isArray(data) ? { packs: data } : data;
    
    await chrome.storage.local.set({ 
      packRegistry,
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
      console.log('[Clippy] Context menu - Selected text to save:', info.selectionText);
      
      // Get HTML content from the selection
      try {
        const results = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => {
            const selection = window.getSelection();
            if (!selection || selection.rangeCount === 0) return { html: '', plainText: '' };
            
            // Enhanced HTML capture with comprehensive formatting preservation
            function captureStyledHTML() {
              if (!selection || selection.rangeCount === 0) return '';
              
              const range = selection.getRangeAt(0);
              
              // Method 1: Try to use the browser's built-in HTML serialization
              function tryNativeHTMLCapture(): string {
                try {
                  // Create a temporary div to hold the cloned content
                  const tempDiv = document.createElement('div');
                  tempDiv.appendChild(range.cloneContents());
                  
                  // Walk through and enhance formatting
                  const walker = document.createTreeWalker(
                    tempDiv,
                    NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT
                  );
                  
                  let node = walker.nextNode();
                  while (node) {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                      const element = node as Element;
                      
                      // Try to find the corresponding original element
                      const xpath = getElementPath(element, tempDiv);
                      const originalElement = findOriginalElement(xpath, range.commonAncestorContainer);
                      
                      if (originalElement) {
                        const computedStyle = window.getComputedStyle(originalElement);
                        applyFormattingToElement(element, computedStyle);
                      }
                    }
                    node = walker.nextNode();
                  }
                  
                  return tempDiv.innerHTML;
                } catch (error) {
                  console.warn('Native HTML capture failed:', error);
                  return '';
                }
              }
              
              // Method 2: More aggressive style preservation
              function tryAggressiveCapture(): string {
                try {
                  const fragment = range.cloneContents();
                  const tempDiv = document.createElement('div');
                  tempDiv.appendChild(fragment);
                  
                  // Process all text nodes and their parent elements
                  const textNodes: Text[] = [];
                  const walker = document.createTreeWalker(
                    tempDiv,
                    NodeFilter.SHOW_TEXT,
                    null
                  );
                  
                  let textNode = walker.nextNode() as Text;
                  while (textNode) {
                    textNodes.push(textNode);
                    textNode = walker.nextNode() as Text;
                  }
                  
                  // For each text node, wrap it with appropriate formatting
                  textNodes.forEach(textNode => {
                    const text = textNode.textContent || '';
                    if (text.trim()) {
                      // Find the original text node in the document
                      const originalTextNode = findOriginalTextNode(text, range);
                      if (originalTextNode && originalTextNode.parentElement) {
                        const parentElement = originalTextNode.parentElement;
                        const computedStyle = window.getComputedStyle(parentElement);
                        
                        // Create a span with proper formatting
                        const span = document.createElement('span');
                        applyFormattingToElement(span, computedStyle);
                        span.textContent = text;
                        
                        textNode.parentNode?.replaceChild(span, textNode);
                      }
                    }
                  });
                  
                  return tempDiv.innerHTML;
                } catch (error) {
                  console.warn('Aggressive capture failed:', error);
                  return '';
                }
              }
              
              // Helper function to apply formatting based on computed styles
              function applyFormattingToElement(element: Element, computedStyle: CSSStyleDeclaration) {
                const styles: string[] = [];
                
                // Font weight (bold)
                const fontWeight = computedStyle.fontWeight;
                if (fontWeight === 'bold' || fontWeight === '700' || parseInt(fontWeight) >= 700) {
                  styles.push('font-weight: bold');
                  // Also add semantic bold tag if not already present
                  if (element.tagName !== 'STRONG' && element.tagName !== 'B') {
                    const strong = document.createElement('strong');
                    while (element.firstChild) {
                      strong.appendChild(element.firstChild);
                    }
                    element.appendChild(strong);
                  }
                }
                
                // Font style (italic)
                const fontStyle = computedStyle.fontStyle;
                if (fontStyle === 'italic') {
                  styles.push('font-style: italic');
                  if (element.tagName !== 'EM' && element.tagName !== 'I') {
                    const em = document.createElement('em');
                    while (element.firstChild) {
                      em.appendChild(element.firstChild);
                    }
                    element.appendChild(em);
                  }
                }
                
                // Text decoration (underline, strikethrough, etc.)
                const textDecoration = computedStyle.textDecoration || computedStyle.textDecorationLine;
                if (textDecoration && textDecoration !== 'none' && textDecoration !== 'initial') {
                  styles.push(`text-decoration: ${textDecoration}`);
                  if (textDecoration.includes('underline') && element.tagName !== 'U') {
                    const u = document.createElement('u');
                    while (element.firstChild) {
                      u.appendChild(element.firstChild);
                    }
                    element.appendChild(u);
                  }
                }
                
                // Color and background
                const color = computedStyle.color;
                const backgroundColor = computedStyle.backgroundColor;
                if (color && color !== 'rgb(0, 0, 0)' && color !== 'rgba(0, 0, 0, 1)') {
                  styles.push(`color: ${color}`);
                }
                if (backgroundColor && backgroundColor !== 'rgba(0, 0, 0, 0)' && backgroundColor !== 'transparent') {
                  styles.push(`background-color: ${backgroundColor}`);
                }
                
                // Apply collected styles
                if (styles.length > 0) {
                  const existingStyle = element.getAttribute('style') || '';
                  const newStyle = existingStyle + (existingStyle ? '; ' : '') + styles.join('; ');
                  element.setAttribute('style', newStyle);
                }
              }
              
              // Helper to get element path
              function getElementPath(element: Element, root: Element): string {
                const path = [];
                let current = element;
                while (current && current !== root && current.parentElement) {
                  const siblings = Array.from(current.parentElement.children);
                  const index = siblings.indexOf(current);
                  path.unshift(`${current.tagName.toLowerCase()}:nth-child(${index + 1})`);
                  current = current.parentElement;
                }
                return path.join(' > ');
              }
              
              // Helper to find original element
              function findOriginalElement(path: string, root: Node): Element | null {
                try {
                  return (root as Element).querySelector(path);
                } catch {
                  return null;
                }
              }
              
              // Helper to find original text node
              function findOriginalTextNode(text: string, range: Range): Text | null {
                const walker = document.createTreeWalker(
                  range.commonAncestorContainer,
                  NodeFilter.SHOW_TEXT,
                  {
                    acceptNode: (node: Node) => {
                      return range.intersectsNode(node) && node.textContent?.includes(text) 
                        ? NodeFilter.FILTER_ACCEPT 
                        : NodeFilter.FILTER_SKIP;
                    }
                  }
                );
                
                return walker.nextNode() as Text;
              }
              
              // Try methods in order
              let result = tryNativeHTMLCapture();
              if (!result || result.trim() === '') {
                result = tryAggressiveCapture();
              }
              
              return result;
            }
            
            // Fallback to simpler method if the above fails
            function simpleCaptureHTML() {
              if (!selection || selection.rangeCount === 0) return '';
              
              const container = document.createElement('div');
              for (let i = 0; i < selection.rangeCount; i++) {
                container.appendChild(selection.getRangeAt(i).cloneContents());
              }
              return container.innerHTML;
            }
            
            let html = '';
            try {
              html = captureStyledHTML();
            } catch (error) {
              console.warn('Enhanced HTML capture failed, falling back to simple capture:', error);
              html = simpleCaptureHTML();
            }
            
            return { 
              html: html,
              plainText: selection.toString()
            };
          }
        });
        
        const selectionData = results[0]?.result;
        if (selectionData) {
          console.log('[Clippy] Successfully captured selection data:', {
            plainText: selectionData.plainText?.substring(0, 100) + '...',
            htmlLength: selectionData.html?.length || 0
          });
          await chrome.storage.local.set({ 
            pendingSnippetText: selectionData.plainText,
            pendingSnippetHtml: selectionData.html
          });
        } else {
          console.log('[Clippy] No selection data from script, using fallback text');
          // Fallback to plain text if script execution fails
          await chrome.storage.local.set({ pendingSnippetText: info.selectionText });
        }
      } catch (error) {
        console.warn('[Clippy] Failed to get HTML selection, falling back to plain text:', error);
        await chrome.storage.local.set({ pendingSnippetText: info.selectionText });
      }
      
      console.log('[Clippy] Attempting to open popup with pending text...');
      try {
        await chrome.action.openPopup();
        console.log('[Clippy] Popup opened successfully via chrome.action.openPopup()');
      } catch (e: unknown) {
        console.warn("[Clippy] chrome.action.openPopup() failed, attempting to open popup.html in a new tab.", e);
        chrome.tabs.create({ url: chrome.runtime.getURL('src/popup/index.html') });
      }
    }
  } else if (typeof info.menuItemId === 'string' && info.menuItemId.startsWith('paste-snippet-')) {
    const snippetIdToPaste = info.menuItemId.replace('paste-snippet-', '');
    console.log('[Clippy] Context menu paste - Looking for snippet ID:', snippetIdToPaste);
    
    chrome.storage.local.get({ snippets: [] }, (result) => {
      const snippets: Snippet[] = result.snippets as Snippet[];
      const snippet = snippets.find((s) => s.id === snippetIdToPaste);
      console.log('[Clippy] Context menu paste - Found snippet:', snippet?.title || snippet?.text?.substring(0, 50));
      
      if (snippet && tab?.id) {
        console.log('[Clippy] Context menu paste - Executing script on tab:', tab.id);
        const version = getCurrentVersion(snippet);
        chrome.scripting.executeScript({
          target: { tabId: tab.id, allFrames: true },
          func: pasteContentInActiveElementWithDebug,
          args: [version.text, version.html ?? ''],
        }).then((results) => {
          console.log('[Clippy] Context menu paste - Script executed successfully:', results);
          
          // Check if any frame actually had an active element and attempted pasting
          const activeFrames = results.filter(result => result.result !== undefined);
          const successfulFrames = results.filter(result => result.result === true);
          
          console.log('[Clippy] Context menu paste - Frames with active elements:', activeFrames.length);
          console.log('[Clippy] Context menu paste - Successful paste attempts:', successfulFrames.length);
          
          // Priority: main frame (frameId 0) success is most important
          const mainFrame = results.find(result => result.frameId === 0);
          const mainFrameSuccess = mainFrame?.result === true;
          
          console.log('[Clippy] Context menu paste - Main frame success:', mainFrameSuccess);
          
          if (successfulFrames.length === 0 && activeFrames.length === 0) {
            console.warn('[Clippy] Context menu paste - No frames had active elements to paste into');
          } else if (!mainFrameSuccess && successfulFrames.length > 0) {
            console.warn('[Clippy] Context menu paste - Success in sub-frames but not main frame. User may not see pasted content.');
          }
        }).catch(err => {
          console.error('[Clippy] Context menu paste - Error executing script:', err);
        });
      } else {
        console.error('[Clippy] Context menu paste - No snippet found or no tab ID');
      }
    });
  } else if (info.menuItemId === 'open-clippy-to-see-all') {
    try {
      await chrome.action.openPopup();
    } catch (e: unknown) {
      console.warn("chrome.action.openPopup() failed, attempting to open popup.html in a new tab.", e);
      chrome.tabs.create({ url: chrome.runtime.getURL('src/popup/index.html') });
    }
  } else if (typeof info.menuItemId === 'string' && info.menuItemId.startsWith('folder-more-')) {
    // Handle "More..." click for specific folder
    const folderId = info.menuItemId.replace('folder-more-', '');
    console.log('[Clippy] Opening popup for folder:', folderId);
    
    // Store the folder filter in local storage so the popup can read it
    await chrome.storage.local.set({ 
      pendingFolderFilter: folderId,
      pendingFolderFilterTimestamp: Date.now()
    });
    
    try {
      await chrome.action.openPopup();
    } catch (e: unknown) {
      console.warn("chrome.action.openPopup() failed, attempting to open popup.html in a new tab.", e);
      chrome.tabs.create({ url: chrome.runtime.getURL('src/popup/index.html') });
    }
  } else if (info.menuItemId === 'uncategorized-more') {
    // Handle "More..." click for uncategorized snippets
    console.log('[Clippy] Opening popup for uncategorized snippets');
    
    // Store the uncategorized filter in local storage
    await chrome.storage.local.set({ 
      pendingFolderFilter: 'uncategorized',
      pendingFolderFilterTimestamp: Date.now()
    });
    
    try {
      await chrome.action.openPopup();
    } catch (e: unknown) {
      console.warn("chrome.action.openPopup() failed, attempting to open popup.html in a new tab.", e);
      chrome.tabs.create({ url: chrome.runtime.getURL('src/popup/index.html') });
    }
  }
});

// Enhanced version with smart element detection and detailed debugging
function pasteContentInActiveElementWithDebug(textToPaste: string, _htmlToPaste?: string) {
  console.log('[Clippy] Frame starting paste attempt for text:', textToPaste?.substring(0, 50) + '...');
  
  // Smart element detection - find the best target element
  function findBestTarget(): HTMLElement | null {
    const candidates: HTMLElement[] = [];
    
    // Start with the active element
    if (document.activeElement && document.activeElement !== document.body && document.activeElement !== document.documentElement) {
      candidates.push(document.activeElement as HTMLElement);
    }
    
    // Add all visible, editable elements
    const editableElements = document.querySelectorAll(`
      input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([disabled]), 
      textarea:not([disabled]), 
      [contenteditable="true"], 
      [role="textbox"]
    `);
    
    editableElements.forEach(el => {
      const htmlEl = el as HTMLElement;
      const rect = htmlEl.getBoundingClientRect();
      
      // Only consider visible elements
      if (rect.width > 0 && rect.height > 0 && 
          rect.top >= 0 && rect.left >= 0 &&
          rect.bottom <= window.innerHeight && rect.right <= window.innerWidth) {
        candidates.push(htmlEl);
      }
    });
    
    // Score each candidate
    let bestScore = -1;
    let bestElement: HTMLElement | null = null;
    
    for (const element of candidates) {
      let score = 0;
      const rect = element.getBoundingClientRect();
      
      // Skip our own notification elements
      if (element.style?.position === 'fixed' && element.style?.zIndex === '999999') {
        continue;
      }
      
      // Active element gets huge bonus
      if (element === document.activeElement) {
        score += 1000;
      }
      
      // Visible elements get points
      if (rect.width > 0 && rect.height > 0) {
        score += 100;
      }
      
      // Elements with focus indicators (cursor visible) get bonus
      if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
        if (typeof element.selectionStart === 'number') {
          score += 50;
        }
      }
      
      // Larger elements get slight preference (likely main content areas)
      score += Math.min(20, (rect.width * rect.height) / 1000);
      
      // Prefer text inputs and textareas
      if (element instanceof HTMLTextAreaElement) score += 30;
      if (element instanceof HTMLInputElement && element.type === 'text') score += 25;
      if (element.isContentEditable) score += 20;
      
      console.log('[Clippy] Element candidate:', {
        tagName: element.tagName,
        type: (element as HTMLInputElement).type || 'n/a',
        id: element.id || 'no-id',
        className: element.className || 'no-class',
        placeholder: (element as HTMLInputElement).placeholder || 'no-placeholder',
        isActive: element === document.activeElement,
        visible: rect.width > 0 && rect.height > 0,
        score: score,
        rect: { width: rect.width, height: rect.height, top: rect.top, left: rect.left }
      });
      
      if (score > bestScore) {
        bestScore = score;
        bestElement = element;
      }
    }
    
    return bestElement;
  }
  
  const activeElement = findBestTarget();
  
  if (!activeElement) {
    console.log('[Clippy] Frame has no suitable paste target, skipping');
    return false;
  }
  
  console.log('[Clippy] Frame selected target element:', {
    tagName: activeElement.tagName,
    type: (activeElement as HTMLInputElement).type || 'n/a',
    id: activeElement.id || 'no-id',
    className: activeElement.className || 'no-class',
    placeholder: (activeElement as HTMLInputElement).placeholder || 'no-placeholder',
    currentValue: (activeElement as HTMLInputElement).value?.substring(0, 50) + '...' || 'no-value',
    isVisible: activeElement.offsetWidth > 0 && activeElement.offsetHeight > 0,
    isFocused: activeElement === document.activeElement
  });
  
  // Enhanced ultra simple method with proper cursor positioning
  function trySmartPaste(): boolean {
    if (!activeElement) return false;
    
    try {
      // For input/textarea elements
      if ('value' in activeElement && typeof (activeElement as HTMLInputElement).value === 'string') {
        const input = activeElement as HTMLInputElement | HTMLTextAreaElement;
        
        // Get cursor position
        const start = typeof input.selectionStart === 'number' ? input.selectionStart : input.value.length;
        const end = typeof input.selectionEnd === 'number' ? input.selectionEnd : input.value.length;
        
        console.log('[Clippy] Input element paste - cursor at:', start, 'to', end);
        
        // Insert at cursor position
        const beforeCursor = input.value.substring(0, start);
        const afterCursor = input.value.substring(end);
        input.value = beforeCursor + textToPaste + afterCursor;
        
        // Position cursor after inserted text
        const newPos = start + textToPaste.length;
        input.selectionStart = newPos;
        input.selectionEnd = newPos;
        
        // Trigger events
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        
        console.log('[Clippy] Successfully pasted into input at cursor position');
        return true;
      }
      
      // For contentEditable elements
      if (activeElement.isContentEditable || activeElement.getAttribute('contenteditable') === 'true') {
        activeElement.focus();
        
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          range.deleteContents();
          range.insertNode(document.createTextNode(textToPaste));
          range.collapse(false);
          
          console.log('[Clippy] Successfully pasted into contentEditable at cursor');
          return true;
        } else {
          // Fallback: append to end
          activeElement.textContent = (activeElement.textContent || '') + textToPaste;
          console.log('[Clippy] Pasted to end of contentEditable (no selection)');
          return true;
        }
      }
      
      console.log('[Clippy] Element type not supported for pasting');
      return false;
      
    } catch (error) {
      console.error('[Clippy] Smart paste method failed:', error);
      return false;
    }
  }
  
  const success = trySmartPaste();
  console.log('[Clippy] Frame paste result:', success);
  return success;
}

// Keep the original function for backward compatibility  
function pasteContentInActiveElement(textToPaste: string, htmlToPaste?: string) {
  const activeElement = document.activeElement as HTMLInputElement | HTMLTextAreaElement | HTMLElement;
  
  if (!activeElement) return;
  
  // Method 1: Try execCommand first (works best with rich text editors)
  function tryExecCommand(): boolean {
    if (!htmlToPaste || !htmlToPaste.trim()) return false;
    
    try {
      // Focus the element first
      activeElement.focus();
      
      // Try insertHTML command (works in many rich text editors)
      if (document.queryCommandSupported && document.queryCommandSupported('insertHTML')) {
        const success = document.execCommand('insertHTML', false, htmlToPaste);
        if (success) return true;
      }
      
      // Try insertText as fallback
      if (document.queryCommandSupported && document.queryCommandSupported('insertText')) {
        return document.execCommand('insertText', false, textToPaste);
      }
    } catch (error) {
      console.warn('execCommand failed:', error);
    }
    return false;
  }
  
  // Method 2: Clipboard API approach (modern browsers)
  function tryClipboardAPI(): boolean {
    if (!htmlToPaste || !htmlToPaste.trim()) return false;
    
    try {
      activeElement.focus();
      
      // Enhance HTML for better compatibility
      const enhancedHtml = enhanceHtmlForCompatibility(htmlToPaste);
      
      // Create clipboard data with both HTML and plain text
      const clipboardData = new DataTransfer();
      clipboardData.items.add(enhancedHtml, 'text/html');
      clipboardData.items.add(textToPaste, 'text/plain');
      
      // Also add RTF format for better Office compatibility
      try {
        const rtfContent = convertHtmlToRtf(enhancedHtml, textToPaste);
        clipboardData.items.add(rtfContent, 'text/rtf');
      } catch (rtfError) {
        console.warn('RTF generation failed:', rtfError);
      }
      
      // Create and dispatch paste event
      const pasteEvent = new ClipboardEvent('paste', {
        clipboardData: clipboardData,
        bubbles: true,
        cancelable: true
      });
      
      return activeElement.dispatchEvent(pasteEvent);
    } catch (error) {
      console.warn('Clipboard API failed:', error);
    }
    return false;
  }
  
  // Helper function to enhance HTML for better compatibility
  function enhanceHtmlForCompatibility(html: string): string {
    let enhanced = html;
    
    // Replace semantic tags with inline styles for better compatibility
    enhanced = enhanced.replace(/<strong[^>]*>(.*?)<\/strong>/gi, '<span style="font-weight: bold;">$1</span>');
    enhanced = enhanced.replace(/<b[^>]*>(.*?)<\/b>/gi, '<span style="font-weight: bold;">$1</span>');
    enhanced = enhanced.replace(/<em[^>]*>(.*?)<\/em>/gi, '<span style="font-style: italic;">$1</span>');
    enhanced = enhanced.replace(/<i[^>]*>(.*?)<\/i>/gi, '<span style="font-style: italic;">$1</span>');
    enhanced = enhanced.replace(/<u[^>]*>(.*?)<\/u>/gi, '<span style="text-decoration: underline;">$1</span>');
    
    // Ensure proper paragraph wrapping
    if (!enhanced.includes('<p') && !enhanced.includes('<div') && !enhanced.includes('<ul') && !enhanced.includes('<ol')) {
      enhanced = `<p>${enhanced}</p>`;
    }
    
    return enhanced;
  }
  
  // Helper function to convert HTML to RTF (simplified)
  function convertHtmlToRtf(html: string, _plainText: string): string {
    try {
      let rtf = '{\\rtf1\\ansi\\deff0 {\\fonttbl {\\f0 Times New Roman;}}\\f0\\fs24 ';
      
      // Simple HTML to RTF conversion
      let content = html;
      
      // Bold formatting
      content = content.replace(/<(?:strong|b)[^>]*>(.*?)<\/(?:strong|b)>/gi, '{\\b $1}');
      content = content.replace(/<span[^>]*font-weight:\s*bold[^>]*>(.*?)<\/span>/gi, '{\\b $1}');
      
      // Italic formatting  
      content = content.replace(/<(?:em|i)[^>]*>(.*?)<\/(?:em|i)>/gi, '{\\i $1}');
      content = content.replace(/<span[^>]*font-style:\s*italic[^>]*>(.*?)<\/span>/gi, '{\\i $1}');
      
      // Underline formatting
      content = content.replace(/<u[^>]*>(.*?)<\/u>/gi, '{\\ul $1}');
      content = content.replace(/<span[^>]*text-decoration:\s*underline[^>]*>(.*?)<\/span>/gi, '{\\ul $1}');
      
      // Remove other HTML tags
      content = content.replace(/<[^>]+>/g, '');
      
      // Add line breaks
      content = content.replace(/\n/g, '\\par ');
      
      rtf += content + '}';
      
      return rtf;
    } catch (error) {
      console.warn('RTF conversion failed:', error);
      return '';
    }
  }
  
  // Method 3: Selection/Range API approach
  function trySelectionAPI(): boolean {
    if (!activeElement.isContentEditable) return false;
    
    try {
      activeElement.focus();
      const selection = window.getSelection();
      
      if (!selection || selection.rangeCount === 0) {
        // Create a range at the end of the element
        const range = document.createRange();
        range.selectNodeContents(activeElement);
        range.collapse(false);
        selection?.removeAllRanges();
        selection?.addRange(range);
      }
      
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        
        if (htmlToPaste && htmlToPaste.trim()) {
          // Create a temporary container
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = htmlToPaste;
          
          // Create document fragment
          const fragment = document.createDocumentFragment();
          while (tempDiv.firstChild) {
            fragment.appendChild(tempDiv.firstChild);
          }
          
          range.insertNode(fragment);
          
          // Position cursor after inserted content
          range.collapse(false);
          selection.removeAllRanges();
          selection.addRange(range);
          
          return true;
        }
      }
    } catch (error) {
      console.warn('Selection API failed:', error);
    }
    return false;
  }
  
  // Method 4: Input event simulation
  function tryInputEvent(): boolean {
    try {
      activeElement.focus();
      
      if (htmlToPaste && htmlToPaste.trim() && activeElement.isContentEditable) {
        // Direct innerHTML manipulation for some editors
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = htmlToPaste;
          
          range.deleteContents();
          
          // Insert nodes one by one
          const nodes = Array.from(tempDiv.childNodes);
          for (const node of nodes) {
            range.insertNode(node.cloneNode(true));
            range.collapse(false);
          }
          
          // Trigger input event to notify the editor
          activeElement.dispatchEvent(new InputEvent('input', {
            bubbles: true,
            cancelable: true,
            inputType: 'insertText',
            data: textToPaste
          }));
          
          return true;
        }
      }
    } catch (error) {
      console.warn('Input event simulation failed:', error);
    }
    return false;
  }
  
  // Method 5: Platform-specific approaches
  function tryPlatformSpecific(): boolean {
    const url = window.location.href;
    
    // LinkedIn specific handling
    if (url.includes('linkedin.com')) {
      try {
        activeElement.focus();
        
        // For LinkedIn newsletter editor
        if (url.includes('/newsletter/') || activeElement.closest('[data-editor-type]')) {
          // Try setting innerHTML directly for LinkedIn's editor
          if (htmlToPaste && activeElement.isContentEditable) {
            const selection = window.getSelection();
            if (selection && selection.rangeCount > 0) {
              const range = selection.getRangeAt(0);
              range.deleteContents();
              
              // Create a wrapper span with formatting
              const wrapper = document.createElement('span');
              wrapper.innerHTML = htmlToPaste;
              range.insertNode(wrapper);
              
              // Move cursor to end
              range.setStartAfter(wrapper);
              range.collapse(true);
              selection.removeAllRanges();
              selection.addRange(range);
              
              return true;
            }
          }
        }
      } catch (error) {
        console.warn('LinkedIn specific method failed:', error);
      }
    }
    
    // Google Docs specific
    if (url.includes('docs.google.com')) {
      try {
        activeElement.focus();
        
        // Google Docs requires very specific HTML formatting
        if (htmlToPaste && htmlToPaste.trim()) {
          // Create Google Docs optimized HTML
          let googleHtml = htmlToPaste;
          
          // Convert to Google Docs preferred format
          googleHtml = googleHtml.replace(/<strong[^>]*>(.*?)<\/strong>/gi, '<b>$1</b>');
          googleHtml = googleHtml.replace(/<em[^>]*>(.*?)<\/em>/gi, '<i>$1</i>');
          googleHtml = googleHtml.replace(/<span[^>]*font-weight:\s*bold[^>]*>(.*?)<\/span>/gi, '<b>$1</b>');
          googleHtml = googleHtml.replace(/<span[^>]*font-style:\s*italic[^>]*>(.*?)<\/span>/gi, '<i>$1</i>');
          googleHtml = googleHtml.replace(/<span[^>]*text-decoration:\s*underline[^>]*>(.*?)<\/span>/gi, '<u>$1</u>');
          
          // Wrap in a proper document structure for Google Docs
          const fullHtml = `<meta charset="utf-8"><div>${googleHtml}</div>`;
          
          // Try multiple approaches for Google Docs
          const clipboardData = new DataTransfer();
          clipboardData.items.add(fullHtml, 'text/html');
          clipboardData.items.add(textToPaste, 'text/plain');
          
          // Add specific MIME types that Google Docs recognizes
          try {
            clipboardData.items.add(fullHtml, 'application/x-vnd.google-docs-document-slice-clip+wrapped');
          } catch (mimeError) {
            console.warn('Google Docs MIME type failed:', mimeError);
          }
          
          const pasteEvent = new ClipboardEvent('paste', {
            clipboardData: clipboardData,
            bubbles: true,
            cancelable: true
          });
          
          // Dispatch to the specific Google Docs editor element
          const googleEditor = document.querySelector('[role="textbox"], .kix-canvas-tile-content, .docs-texteventtarget-iframe') || activeElement;
          if (googleEditor) {
            if (googleEditor instanceof HTMLElement) {
              googleEditor.focus();
            }
            const success = googleEditor.dispatchEvent(pasteEvent);
            if (success) return true;
          }
          
          // Fallback to execCommand for Google Docs
          if (document.queryCommandSupported && document.queryCommandSupported('insertHTML')) {
            return document.execCommand('insertHTML', false, googleHtml);
          }
        }
        
        // Final fallback for Google Docs
        return tryClipboardAPI();
      } catch (error) {
        console.warn('Google Docs specific method failed:', error);
      }
    }
    
    return false;
  }
  
  // Method 6: Fallback to input/textarea
  function fallbackToPlainText(): boolean {
    if ('value' in activeElement && typeof activeElement.value === 'string') {
      const el = activeElement as HTMLInputElement | HTMLTextAreaElement;
      const start = typeof el.selectionStart === 'number' ? el.selectionStart : el.value.length;
      const end = typeof el.selectionEnd === 'number' ? el.selectionEnd : el.value.length;
      el.value = el.value.substring(0, start) + textToPaste + el.value.substring(end);
      const newCursorPosition = start + textToPaste.length;
      el.selectionStart = newCursorPosition;
      el.selectionEnd = newCursorPosition;
      return true;
    }
    return false;
  }
  
  // Try methods in order of preference
  const methods = [
    tryExecCommand,
    tryClipboardAPI,
    tryPlatformSpecific,
    trySelectionAPI,
    tryInputEvent,
    fallbackToPlainText
  ];
  
  for (const method of methods) {
    try {
      if (method()) {
        console.log(`Paste successful with method: ${method.name}`);
        return true;
      }
    } catch (error) {
      console.warn(`Method ${method.name} failed:`, error);
    }
  }
  
  console.warn('All paste methods failed, content may not have been inserted correctly');
  return false;
}

// Legacy function for backward compatibility (currently unused)
// function pasteTextInActiveElement(textToPaste: string) {
//   return pasteContentInActiveElement(textToPaste);
// }

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
  chrome.storage.local.get({ 
    snippets: [], 
    folders: [], 
    contextMenuMode: 'hybrid' 
  }, (result) => {
    const snippets: Snippet[] = result.snippets as Snippet[];
    const folders = result.folders || [];
    const contextMenuMode = result.contextMenuMode || 'hybrid';
    
    if (snippets.length === 0) {
      chrome.contextMenus.create({
        id: 'noSnippetsToPaste',
        parentId: 'pasteSnippetParent',
        title: '(No snippets saved yet)',
        contexts: ['editable'],
        enabled: false,
      });
      return;
    }

    switch (contextMenuMode) {
      case 'pinned':
        populatePinnedOnlyMenu(snippets);
        break;
      case 'folders':
        populateFoldersOnlyMenu(snippets, folders);
        break;
      case 'hybrid':
      default:
        populateHybridMenu(snippets, folders);
        break;
    }
  });
}

// Show only pinned snippets
function populatePinnedOnlyMenu(snippets: Snippet[]) {
  const pinnedSnippets = snippets.filter(s => s.isPinned).slice(0, 6);
  
  if (pinnedSnippets.length === 0) {
    chrome.contextMenus.create({
      id: 'noPinnedSnippets',
      parentId: 'pasteSnippetParent',
      title: '(No pinned snippets)',
      contexts: ['editable'],
      enabled: false,
    });
    return;
  }

  pinnedSnippets.forEach((snippet) => {
    chrome.contextMenus.create({
      id: `paste-snippet-${snippet.id}`,
      parentId: 'pasteSnippetParent',
      title: truncateTitle(snippet),
      contexts: ['editable'],
    });
  });
}

// Show only folder submenus
function populateFoldersOnlyMenu(snippets: Snippet[], folders: Folder[]) {
  if (folders.length === 0) {
    // Show uncategorized snippets if no folders exist
    const uncategorizedSnippets = snippets.filter(s => !s.folderId).slice(0, 6);
    uncategorizedSnippets.forEach((snippet) => {
      chrome.contextMenus.create({
        id: `paste-snippet-${snippet.id}`,
        parentId: 'pasteSnippetParent',
        title: truncateTitle(snippet),
        contexts: ['editable'],
      });
    });
    return;
  }

  folders.forEach((folder) => {
    createFolderSubmenu(folder, snippets);
  });

  // Add uncategorized snippets if any exist
  const uncategorizedSnippets = snippets.filter(s => !s.folderId);
  if (uncategorizedSnippets.length > 0) {
    createUncategorizedSubmenu(uncategorizedSnippets);
  }
}

// Show pinned snippets first, then folder submenus (hybrid mode)
function populateHybridMenu(snippets: Snippet[], folders: Folder[]) {
  const pinnedSnippets = snippets.filter(s => s.isPinned).slice(0, 2);
  
  // Add pinned snippets at top
  pinnedSnippets.forEach((snippet) => {
    chrome.contextMenus.create({
      id: `paste-snippet-${snippet.id}`,
      parentId: 'pasteSnippetParent',
      title: `⭐ ${truncateTitle(snippet)}`,
      contexts: ['editable'],
    });
  });

  // Add separator if we have both pinned snippets and folders
  if (pinnedSnippets.length > 0 && (folders.length > 0 || snippets.some(s => !s.folderId))) {
    chrome.contextMenus.create({
      id: 'pinned-separator',
      parentId: 'pasteSnippetParent',
      type: 'separator',
      contexts: ['editable'],
    });
  }

  // Add folder submenus
  folders.forEach((folder) => {
    createFolderSubmenu(folder, snippets);
  });

  // Add uncategorized snippets if any exist
  const uncategorizedSnippets = snippets.filter(s => !s.folderId && !s.isPinned);
  if (uncategorizedSnippets.length > 0) {
    createUncategorizedSubmenu(uncategorizedSnippets);
  }

  // If no pinned snippets and no folders, fall back to recent snippets
  if (pinnedSnippets.length === 0 && folders.length === 0) {
    const recentSnippets = snippets.slice(0, 6);
    recentSnippets.forEach((snippet) => {
      chrome.contextMenus.create({
        id: `paste-snippet-${snippet.id}`,
        parentId: 'pasteSnippetParent',
        title: truncateTitle(snippet),
        contexts: ['editable'],
      });
    });

    if (snippets.length > 6) {
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
  }
}

// Helper function to create folder submenu
function createFolderSubmenu(folder: Folder, snippets: Snippet[]) {
  const folderSnippets = snippets.filter(s => s.folderId === folder.id);
  
  if (folderSnippets.length === 0) return;

  // Create folder submenu
  chrome.contextMenus.create({
    id: `folder-${folder.id}`,
    parentId: 'pasteSnippetParent',
    title: `${folder.emoji} ${folder.name}`,
    contexts: ['editable'],
  });

  // Sort folder snippets: pinned first, then by lastUsed or alphabetical
  const sortedSnippets = folderSnippets.sort((a, b) => {
    // Pinned snippets first
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    
    // Then by lastUsed (most recent first)
    if (a.lastUsed && b.lastUsed) {
      return new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime();
    }
    if (a.lastUsed && !b.lastUsed) return -1;
    if (!a.lastUsed && b.lastUsed) return 1;
    
    // Finally alphabetical by title/text
    const aTitle = a.title || a.text;
    const bTitle = b.title || b.text;
    return aTitle.localeCompare(bTitle);
  });

  // Add up to 6 snippets
  const displaySnippets = sortedSnippets.slice(0, 6);
  displaySnippets.forEach((snippet) => {
    chrome.contextMenus.create({
      id: `paste-snippet-${snippet.id}`,
      parentId: `folder-${folder.id}`,
      title: snippet.isPinned ? `⭐ ${truncateTitle(snippet)}` : truncateTitle(snippet),
      contexts: ['editable'],
    });
  });

  // Add "More..." if folder has more than 6 snippets
  if (sortedSnippets.length > 6) {
    chrome.contextMenus.create({
      id: `folder-separator-${folder.id}`,
      parentId: `folder-${folder.id}`,
      type: 'separator',
      contexts: ['editable'],
    });
    chrome.contextMenus.create({
      id: `folder-more-${folder.id}`,
      parentId: `folder-${folder.id}`,
      title: `More... (${sortedSnippets.length - 6} more)`,
      contexts: ['editable'],
    });
  }
}

// Helper function to create uncategorized submenu
function createUncategorizedSubmenu(uncategorizedSnippets: Snippet[]) {
  if (uncategorizedSnippets.length === 0) return;

  chrome.contextMenus.create({
    id: 'uncategorized-folder',
    parentId: 'pasteSnippetParent',
    title: '📄 Uncategorized',
    contexts: ['editable'],
  });

  const displaySnippets = uncategorizedSnippets.slice(0, 6);
  displaySnippets.forEach((snippet) => {
    chrome.contextMenus.create({
      id: `paste-snippet-${snippet.id}`,
      parentId: 'uncategorized-folder',
      title: truncateTitle(snippet),
      contexts: ['editable'],
    });
  });

  if (uncategorizedSnippets.length > 6) {
    chrome.contextMenus.create({
      id: 'uncategorized-separator',
      parentId: 'uncategorized-folder',
      type: 'separator',
      contexts: ['editable'],
    });
    chrome.contextMenus.create({
      id: 'uncategorized-more',
      parentId: 'uncategorized-folder',
      title: `More... (${uncategorizedSnippets.length - 6} more)`,
      contexts: ['editable'],
    });
  }
}

// Helper function to truncate snippet titles
function truncateTitle(snippet: Snippet): string {
  const title = snippet.title || snippet.text;
  return title.length > 30 ? title.substring(0, 27) + "..." : title;
}

chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  if (request.action === 'getPackRegistry') {
    // Immediately respond with current data if available
    chrome.storage.local.get(['packRegistry', 'packRegistryFetchedAt'], (result) => {
      const { packRegistry, packRegistryFetchedAt } = result as { 
        packRegistry?: unknown; 
        packRegistryFetchedAt?: number 
      };
      
      // If data is stale or missing, refresh in background
      if (!packRegistry || !packRegistryFetchedAt || Date.now() - packRegistryFetchedAt > SIX_HOURS_MS) {
        fetchPackRegistry().catch(console.error);
      }
      
      // Send current data (might be undefined if first load)
      sendResponse({ 
        packRegistry: packRegistry || { packs: [] },
        success: true 
      });
    });
    
    return true; // Keep the message channel open for async response
  }
  if (request.action === 'updateContextMenu') {
    // Update context menu when settings change
    console.log('[Clippy] Updating context menu from settings change');
    updatePasteContextMenu();
    sendResponse({ success: true });
  } else if (request.action === 'toggleOverlayNow') {
    try {
      console.log('[Clippy] Received toggleOverlayNow from content', { originX: request.originX, originY: request.originY });
      // Prevent injection on special pages
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (activeTab?.url?.startsWith('chrome://') || activeTab?.url?.startsWith('chrome-extension://') || activeTab?.url?.startsWith('chrome.google.com/webstore')) {
        chrome.notifications.create({
          type: 'basic',
          iconUrl: chrome.runtime.getURL('icons/icon48.png'),
          title: 'Clippy Action',
          message: 'Clippy cannot be used on this page.'
        });
        sendResponse?.({ success: false, error: 'Restricted page' });
        return true;
      }
      const tabId = sender.tab?.id;
      if (!tabId) {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab?.id) {
          sendResponse?.({ success: false, error: 'No active tab' });
          return true;
        }
        await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: toggleOverlay, args: [request.originX, request.originY] });
      } else {
        await chrome.scripting.executeScript({ target: { tabId }, func: toggleOverlay, args: [request.originX, request.originY] });
      }
      sendResponse?.({ success: true });
    } catch (err) {
      console.error('Failed to toggle overlay from message:', err);
      chrome.notifications.create({
        type: 'basic',
        iconUrl: chrome.runtime.getURL('icons/icon48.png'),
        title: 'Clippy Overlay',
        message: 'Could not open overlay on this page. Check extension permissions in chrome://extensions and try reloading the page.'
      });
      sendResponse?.({ success: false, error: String(err) });
    }
    return true; // async response
  } else if (request.type === 'PASTE_SNIPPET') {
    // Accept paste requests from content/overlay context
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

async function handlePasteRequest(snippet: Snippet, isHotkey = false) {
  const version = getCurrentVersion(snippet);
  let textToUse = version.text;
  let htmlToUse = version.html ?? '';
  
  // For hotkey pasting, strip HTML to prevent false success in legacy paste function
  if (isHotkey) {
    htmlToUse = '';
    console.log('[Clippy] Hotkey paste: HTML stripped, using plain text only');
  }
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;

  const defs = parseVariables(version.text, version.html);
  if (defs.length > 0) {
    const domain = (() => {
      try {
        const u = tab.url ? new URL(tab.url) : null;
        if (!u) return null;
        const parts = u.hostname.split('.');
        return parts.length <= 2 ? u.hostname : parts.slice(-2).join('.');
      } catch { return null; }
    })();

    const store = await chrome.storage.local.get('variableDefaults');
    const defaultsByDomain = store.variableDefaults || {};
    const domainDefaults = (domain && defaultsByDomain[domain] && defaultsByDomain[domain][snippet.id]) || {};
    const initialValues: Record<string,string> = {};
    for (const d of defs) initialValues[d.name] = domainDefaults[d.name] ?? (d.defaultValue ?? '');
    const needsPrompt = defs.some(d => (initialValues[d.name] || '').trim() === '');

    if (needsPrompt) {
      const response = await chrome.tabs.sendMessage(tab.id, { type: 'OPEN_VARIABLE_POPOVER', vars: defs, values: initialValues });
      if (!response || response.cancelled) return;
      const values = response.values as Record<string,string>;
      if (response.remember && domain) {
        const nextStore = (await chrome.storage.local.get('variableDefaults')).variableDefaults || {};
        nextStore[domain] = nextStore[domain] || {};
        nextStore[domain][snippet.id] = { ...(nextStore[domain][snippet.id] || {}), ...values };
        await chrome.storage.local.set({ variableDefaults: nextStore });
      }
      const resolved = resolveVariables({ text: version.text, html: version.html }, values);
      textToUse = resolved.text ?? '';
      htmlToUse = resolved.html ?? '';
    } else {
      const resolved = resolveVariables({ text: version.text, html: version.html }, initialValues);
      textToUse = resolved.text ?? '';
      htmlToUse = resolved.html ?? '';
    }
    
    // Strip HTML again after variable resolution for hotkey calls
    if (isHotkey) {
      htmlToUse = '';
      console.log('[Clippy] Hotkey paste: HTML stripped again after variable resolution');
    }
  }

  const sanitizedText = textToUse;
  const sanitizedHtml = htmlToUse;
  const injectionResults = await chrome.scripting.executeScript({
    target: { tabId: tab.id, allFrames: true },
    func: pasteContentInActiveElementWithDebug,
    args: [sanitizedText, sanitizedHtml],
  });

  console.log('[Clippy] Debug paste results per frame:', injectionResults);
  console.log('[Clippy] Detailed paste results:', injectionResults.map(r => ({ frameId: r.frameId, result: r.result })));
  let success = injectionResults.some((r: chrome.scripting.InjectionResult) => r.result === true);
  console.log('[Clippy] Initial paste success evaluation:', success);
  
  if (!success) {
    console.log('[Clippy] Debug paste unsuccessful in all frames. Trying legacy paste method...');
    const legacyResults = await chrome.scripting.executeScript({
      target: { tabId: tab.id, allFrames: true },
      func: pasteContentInActiveElement,
      args: [sanitizedText, sanitizedHtml],
    });
    console.log('[Clippy] Legacy paste results per frame:', legacyResults);
    console.log('[Clippy] Detailed legacy results:', legacyResults.map(r => ({ frameId: r.frameId, result: r.result })));
    success = legacyResults.some((r: chrome.scripting.InjectionResult) => r.result === true);
    console.log('[Clippy] Legacy paste success evaluation:', success);
  }
  
  console.log('[Clippy] Final paste success status:', success);

  if (!success) {
    console.log('[Clippy] Attempting clipboard fallback for text:', sanitizedText.substring(0, 50) + '...');
    try {
      await copyToClipboardAndNotify(sanitizedText, 'Copied to clipboard! Paste with Ctrl+V');
      console.log('[Clippy] Successfully copied to clipboard as fallback');
    } catch (clipboardError) {
      console.error('[Clippy] Both paste and clipboard fallback failed:', clipboardError);
      console.error('[Clippy] Clipboard error details:', clipboardError instanceof Error ? clipboardError.message : String(clipboardError));
      
      // Show error notification instead of navigating to URLs
      if (chrome.notifications && chrome.notifications.create) {
        chrome.notifications.create({
          type: 'basic',
          iconUrl: chrome.runtime.getURL('icons/icon48.png'),
          title: 'Clippy - Paste Failed',
          message: 'Unable to paste or copy snippet. Please try again or paste manually.',
        });
      }
      
      console.error('[Clippy] All paste and clipboard methods failed for text:', sanitizedText.substring(0, 50) + '...');
      
      // REMOVED: Automatic URL navigation - this was causing the unwanted redirects
      // The extension should never automatically navigate to URLs without explicit user intent
    }
  }
}

async function copyToClipboardAndNotify(text: string, message: string) {
  console.log('[Clippy] copyToClipboardAndNotify called with text:', text.substring(0, 50) + '...');
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tabs[0]?.id) {
    console.error('[Clippy] No active tab found for clipboard copy');
    throw new Error('No active tab found');
  }

  console.log('[Clippy] Active tab found, attempting clipboard copy to tab:', tabs[0].id);
  try {
    // Try multiple clipboard methods for better compatibility
    const results = await chrome.scripting.executeScript({
      target: { tabId: tabs[0].id },
      func: (textToCopy) => {
        console.log('[Clippy Content] Starting clipboard copy for:', textToCopy.substring(0, 50) + '...');
        
        // Simpler, more reliable approach
        try {
          // Method 1: Try modern clipboard API first
          if (navigator.clipboard && navigator.clipboard.writeText) {
            console.log('[Clippy Content] Trying modern clipboard API');
            return navigator.clipboard.writeText(textToCopy)
              .then(() => {
                console.log('[Clippy Content] Modern clipboard API success');
                return 'clipboard-api-success';
              })
              .catch(error => {
                console.warn('[Clippy Content] Modern clipboard API failed:', error);
                // Method 2: Fallback to execCommand
                console.log('[Clippy Content] Trying execCommand fallback');
                try {
                  const textArea = document.createElement('textarea');
                  textArea.value = textToCopy;
                  textArea.style.position = 'fixed';
                  textArea.style.left = '-999999px';
                  textArea.style.top = '-999999px';
                  document.body.appendChild(textArea);
                  textArea.focus();
                  textArea.select();
                  
                  const successful = document.execCommand('copy');
                  document.body.removeChild(textArea);
                  
                  if (successful) {
                    console.log('[Clippy Content] execCommand success');
                    return 'execCommand-success';
                  } else {
                    console.error('[Clippy Content] execCommand failed');
                    throw new Error('execCommand failed');
                  }
                } catch (execError) {
                  console.error('[Clippy Content] execCommand error:', execError);
                  throw new Error('All clipboard methods failed: ' + (execError instanceof Error ? execError.message : String(execError)));
                }
              });
          } else {
            // No modern clipboard API, try execCommand directly
            console.log('[Clippy Content] No modern clipboard API, using execCommand only');
            try {
              const textArea = document.createElement('textarea');
              textArea.value = textToCopy;
              textArea.style.position = 'fixed';
              textArea.style.left = '-999999px';
              textArea.style.top = '-999999px';
              document.body.appendChild(textArea);
              textArea.focus();
              textArea.select();
              
              const successful = document.execCommand('copy');
              document.body.removeChild(textArea);
              
              if (successful) {
                console.log('[Clippy Content] execCommand-only success');
                return Promise.resolve('execCommand-only-success');
              } else {
                console.error('[Clippy Content] execCommand-only failed');
                return Promise.reject(new Error('execCommand failed - no clipboard API available'));
              }
            } catch (execError) {
              console.error('[Clippy Content] execCommand-only error:', execError);
              return Promise.reject(new Error('No clipboard support available: ' + (execError instanceof Error ? execError.message : String(execError))));
            }
          }
        } catch (error) {
          console.error('[Clippy Content] Clipboard copy failed with error:', error);
          return Promise.reject(error);
        }
      },
      args: [text],
    }).catch(scriptError => {
      console.error('[Clippy] Script execution failed:', scriptError);
      throw new Error('Failed to execute clipboard script: ' + scriptError.message);
    });

    console.log('[Clippy] Clipboard script execution results:', results);
    console.log('[Clippy] Successfully copied to clipboard');

    // Show notification
    if (chrome.notifications && chrome.notifications.create) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: chrome.runtime.getURL('icons/icon48.png'),
        title: 'Clippy',
        message: message,
      });
    } else {
      console.log('[Clippy]', message);
    }
  } catch (err) {
    console.error('Failed to copy to clipboard with all methods:', err);
    
    // Final fallback: Try to use offscreen document for clipboard access
    try {
      console.log('[Clippy] Trying offscreen document clipboard fallback');
      await chrome.action.setBadgeText({ text: '📋' });
      await chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' });
      
      // Show a different notification indicating manual paste required
      if (chrome.notifications && chrome.notifications.create) {
        chrome.notifications.create({
          type: 'basic',
          iconUrl: chrome.runtime.getURL('icons/icon48.png'),
          title: 'Clippy - Manual Paste Required',
          message: `Text ready: "${text.substring(0, 30)}..." - Copy from popup and paste manually.`,
        });
      }
      
      // Clear badge after 3 seconds
      setTimeout(() => {
        chrome.action.setBadgeText({ text: '' });
      }, 3000);
      
      // Don't throw - this is a partial success state
      console.log('[Clippy] Fallback notification shown, text available for manual copy');
      return;
    } catch (fallbackError) {
      console.error('[Clippy] Even fallback notification failed:', fallbackError);
      throw err; // Re-throw original error
    }
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
        iconUrl: chrome.runtime.getURL('icons/icon48.png'),
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
  if (/^hotkey-\d+$/.test(command)) {
    const slot = command; // e.g., 'hotkey-1'
    console.log(`[Clippy] Hotkey command received: ${command} (slot: ${slot}) on tab ${tab?.id}`);
    const result = await chrome.storage.local.get(['hotkeyMappings', 'snippets']);
    const hotkeyMappings = result.hotkeyMappings || [];
    const snippets: Snippet[] = result.snippets || [];
    const mapping = hotkeyMappings.find((m: { slot: string; snippetId: string }) => m.slot === slot);
    if (!mapping || !mapping.snippetId) {
      console.warn(`[Clippy] No snippet mapped for slot ${slot}`);
      chrome.notifications.create({
        type: 'basic',
        iconUrl: chrome.runtime.getURL('icons/icon48.png'),
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
        iconUrl: chrome.runtime.getURL('icons/icon48.png'),
        title: 'Clippy',
        message: `Snippet not found.`,
      });
      return;
    }
    // Paste the snippet
    console.log(`[Clippy] Pasting snippet for slot ${slot}:`, snippet);
    handlePasteRequest(snippet, true); // isHotkey = true to strip HTML
  }
});

/**
 * Overlay toggle with iframe-first (React UI) and timed fallback to DOM modal
 */
function toggleOverlay(originX?: number, originY?: number, forceDomFallback?: boolean) {
  const CONTAINER_ID = 'clippy-search-overlay-container';

  // If the overlay exists, remove it
  const existingContainer = document.getElementById(CONTAINER_ID);
  if (existingContainer) {
    existingContainer.remove();
    return;
  }

  // Remember currently focused element to restore on close
  const previouslyFocused = document.activeElement as (HTMLElement | null);

  // Create the host container
  const host = document.createElement('div');
  host.id = CONTAINER_ID;
  Object.assign(host.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    width: '100vw',
    height: '100vh',
    zIndex: '2147483647',
    background: 'transparent',
    pointerEvents: 'auto',
    transformOrigin: (originX != null && originY != null) ? `${originX}px ${originY}px` : '50% 20%',
    transform: 'scale(0.3)',
    transition: 'transform 200ms ease-out'
  });

  // If not forcing DOM fallback, try to load the React overlay via iframe first
  if (!forceDomFallback) {
    const backdrop = document.createElement('div');
    Object.assign(backdrop.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'flex-start',
      paddingTop: '80px',
      background: 'transparent'
    });

    // Close handler
    const closeOverlay = () => {
      window.removeEventListener('message', onMessage);
      document.removeEventListener('keydown', keypressHandler);
      host.remove();
      try { previouslyFocused?.focus(); } catch { /* no-op */ }
    };

    // Listen for READY/CLOSE messages from the React overlay
    let reactReady = false;
    const onMessage = (event: MessageEvent) => {
      const data: any = event?.data;
      if (!data || typeof data !== 'object') return;
      if (data.type === 'CLIPPY_OVERLAY_READY') {
        reactReady = true;
      } else if (data.type === 'CLOSE_CLIPPY_OVERLAY') {
        closeOverlay();
      }
    };
    window.addEventListener('message', onMessage);

    // Esc to close
    const keypressHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeOverlay();
      }
    };
    document.addEventListener('keydown', keypressHandler);

    // Click outside (on backdrop) closes
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) closeOverlay();
    });

    // Build iframe pointing to the built overlay page
    const iframe = document.createElement('iframe');
    const hostName = location.hostname || '';
    iframe.src = chrome.runtime.getURL('overlay/index.html') + `#host=${encodeURIComponent(hostName)}`;
    Object.assign(iframe.style, {
      width: '100%',
      height: '100%',
      border: '0',
      background: 'transparent'
    });
    iframe.setAttribute('allow', 'clipboard-read; clipboard-write');

    backdrop.appendChild(iframe);
    host.appendChild(backdrop);
    document.body.appendChild(host);

    // Animate scale-in
    requestAnimationFrame(() => {
      host.style.transform = 'scale(1)';
    });

    // Timed fallback if React overlay cannot load due to CSP/frame restrictions
    const FALLBACK_MS = 900; // keep snappy
    const fallbackTimer = window.setTimeout(() => {
      if (!reactReady) {
        // Clean up iframe attempt and fall back to DOM modal
        window.removeEventListener('message', onMessage);
        document.removeEventListener('keydown', keypressHandler);
        try { host.remove(); } catch { /* no-op */ }
        // Invoke DOM modal path
        toggleOverlay(originX, originY, true);
      }
    }, FALLBACK_MS);

    // If the iframe loads and signals ready later, clear the timer
    // Note: The READY signal is captured in onMessage handler above.
    // We keep the timer to naturally expire only if not ready.

    return; // Do not proceed to DOM path when trying iframe first
  }

  // DOM modal fallback path (used when iframe is blocked)
  // Create modal container
  const modalContainer = document.createElement('div');
  Object.assign(modalContainer.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    width: '100%',
    height: '100%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingTop: '80px',
    background: 'transparent'
  });

  // Create the modal box with dark animated theme
  const modal = document.createElement('div');
  Object.assign(modal.style, {
    background: 'linear-gradient(135deg, #0f0f0f 0%, #000000 50%, #1a1a1a 100%)',
    borderRadius: '16px',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    padding: '16px',
    width: '100%',
    maxWidth: '36rem',
    margin: '0 16px',
    position: 'relative',
    overflow: 'hidden'
  });

  // Get hostname for domain chip
  const hostName = location.hostname || '';
  
  // Create modal content with dark theme
  modal.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
      <div style="display: flex; align-items: center; gap: 8px;">
        ${hostName ? `<span style="font-size: 0.75rem; background: rgba(255, 255, 255, 0.1); color: white; padding: 4px 8px; border-radius: 9999px;">${hostName}</span>` : ''}
      </div>
      <button id="clippy-close-btn" style="background: none; border: none; color: rgba(255, 255, 255, 0.7); cursor: pointer; font-size: 18px; padding: 4px; transition: color 0.2s;">✕</button>
    </div>
    <input id="clippy-search-input" type="text" placeholder="Search snippets, or use / for folders, # for tags..." style="width: 100%; padding: 12px; border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 6px; outline: none; font-size: 14px; margin-bottom: 8px; background: rgba(0, 0, 0, 0.6); color: white; box-sizing: border-box;" placeholder-style="color: rgba(255, 255, 255, 0.4);">
    <div id="clippy-results" style="height: 288px; overflow-y: auto; margin-bottom: 8px;">
      <div style="text-align: center; color: rgba(255, 255, 255, 0.6); padding-top: 32px;">Loading snippets...</div>
    </div>
    <div style="text-align: right; font-size: 0.75rem; color: rgba(255, 255, 255, 0.6);">
      Use <kbd style="margin: 0 2px; padding: 2px 6px; font-weight: 600; color: white; background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 4px;">↑</kbd>
      <kbd style="margin: 0 2px; padding: 2px 6px; font-weight: 600; color: white; background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 4px;">↓</kbd> to navigate,
      <kbd style="margin: 0 2px; padding: 2px 6px; font-weight: 600; color: white; background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 4px;">Enter</kbd> to select, and
      <kbd style="margin: 0 2px; padding: 2px 6px; font-weight: 600; color: white; background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 4px;">Esc</kbd> to close.
    </div>
  `;

  modalContainer.appendChild(modal);
  host.appendChild(modalContainer);
  document.body.appendChild(host);

  // Event handlers
  const closeBtn = modal.querySelector('#clippy-close-btn') as HTMLButtonElement;
  const searchInput = modal.querySelector('#clippy-search-input') as HTMLInputElement;
  const resultsDiv = modal.querySelector('#clippy-results') as HTMLDivElement;
  
  let snippets: any[] = [];
  let selectedIndex = 0;

  // Close handlers
  const closeOverlay = () => {
    if (keypressHandler) document.removeEventListener('keydown', keypressHandler);
    host.remove();
    try { previouslyFocused?.focus(); } catch { /* no-op */ }
  };
  closeBtn?.addEventListener('click', closeOverlay);
  modalContainer.addEventListener('click', (e) => {
    if (e.target === modalContainer) closeOverlay();
  });

  // Load snippets
  chrome.storage.local.get(['snippets'], (result) => {
    snippets = result.snippets || [];
    renderResults(snippets);
  });

  // Search functionality
  const renderResults = (results: any[]) => {
    if (results.length === 0) {
      resultsDiv.innerHTML = '<div style="text-align: center; color: rgba(255, 255, 255, 0.6); padding-top: 32px;">No results found.</div>';
      return;
    }
    
    resultsDiv.innerHTML = results.map((snippet, index) => `
      <div class="clippy-result" data-index="${index}" style="padding: 12px; border-radius: 6px; cursor: pointer; display: flex; align-items: center; gap: 12px; transition: background-color 0.2s; ${index === selectedIndex ? 'background: rgba(255, 255, 255, 0.1);' : ''}">
        <div style="flex-grow: 1; min-width: 0;">
          <div style="font-weight: bold; color: white; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${snippet.title || snippet.text.substring(0, 60)}</div>
          <div style="font-size: 0.875rem; color: rgba(255, 255, 255, 0.7); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${snippet.text}</div>
        </div>
      </div>
    `).join('');

    // Add event handlers (click + hover) without inline attributes (CSP-safe)
    resultsDiv.querySelectorAll('.clippy-result').forEach((el, index) => {
      const baseSelected = index === selectedIndex;
      el.addEventListener('click', () => selectSnippet(results[index]));
      el.addEventListener('mouseenter', () => {
        (el as HTMLElement).style.background = 'rgba(255, 255, 255, 0.05)';
      });
      el.addEventListener('mouseleave', () => {
        (el as HTMLElement).style.background = baseSelected ? 'rgba(255, 255, 255, 0.1)' : 'transparent';
      });
    });
  };

  const selectSnippet = (snippet: any) => {
    // Close first to restore focus to the previously active input/contenteditable
    closeOverlay();
    // Defer paste slightly to allow focus restoration to take effect
    setTimeout(() => {
      chrome.runtime.sendMessage({ type: 'PASTE_SNIPPET', snippet });
    }, 50);
  };

  const filterResults = () => {
    const query = searchInput.value.toLowerCase();
    const filtered = snippets.filter(s => 
      s.title?.toLowerCase().includes(query) || 
      s.text.toLowerCase().includes(query)
    );
    selectedIndex = 0;
    renderResults(filtered);
  };

  // Keyboard navigation
  const keypressHandler = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      closeOverlay();
      return;
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      selectedIndex = Math.min(selectedIndex + 1, snippets.length - 1);
      renderResults(snippets.filter(s => 
        s.title?.toLowerCase().includes(searchInput.value.toLowerCase()) || 
        s.text.toLowerCase().includes(searchInput.value.toLowerCase())
      ));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      selectedIndex = Math.max(selectedIndex - 1, 0);
      renderResults(snippets.filter(s => 
        s.title?.toLowerCase().includes(searchInput.value.toLowerCase()) || 
        s.text.toLowerCase().includes(searchInput.value.toLowerCase())
      ));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const filtered = snippets.filter(s => 
        s.title?.toLowerCase().includes(searchInput.value.toLowerCase()) || 
        s.text.toLowerCase().includes(searchInput.value.toLowerCase())
      );
      if (filtered[selectedIndex]) {
        selectSnippet(filtered[selectedIndex]);
      }
    }
  };
  document.addEventListener('keydown', keypressHandler);

  searchInput?.addEventListener('input', filterResults);
  searchInput?.focus();

  // Animation
  requestAnimationFrame(() => {
    host.style.transform = 'scale(1)';
  });
}

console.log('Background script loaded. Context menus initialized.');
