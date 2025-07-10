/**
 * Background service worker for Project Clippy.
 * Handles context menu creation and other background tasks.
 */
import type { Snippet } from '@/utils/types';

import { runMigrations } from './migration';

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
      console.log('Selected text to save via context menu:', info.selectionText);
      
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
          await chrome.storage.local.set({ 
            pendingSnippetText: selectionData.plainText,
            pendingSnippetHtml: selectionData.html
          });
        } else {
          // Fallback to plain text if script execution fails
          await chrome.storage.local.set({ pendingSnippetText: info.selectionText });
        }
      } catch (error) {
        console.warn('Failed to get HTML selection, falling back to plain text:', error);
        await chrome.storage.local.set({ pendingSnippetText: info.selectionText });
      }
      
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
          func: pasteContentInActiveElement,
          args: [snippet.text, snippet.html],
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
  function convertHtmlToRtf(html: string, plainText: string): string {
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
        return;
      }
    } catch (error) {
      console.warn(`Method ${method.name} failed:`, error);
    }
  }
  
  console.warn('All paste methods failed, content may not have been inserted correctly');
}

// Legacy function for backward compatibility
function pasteTextInActiveElement(textToPaste: string) {
  return pasteContentInActiveElement(textToPaste);
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
  const sanitizedHtml = snippet.html; // HTML is already captured, no need to sanitize further for basic formatting
  console.log('Pasting snippet:', { text: sanitizedText, html: sanitizedHtml }); // Debug log
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
      func: pasteContentInActiveElement,
      args: [sanitizedText, sanitizedHtml],
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
