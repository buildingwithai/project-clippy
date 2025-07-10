/**
 * Content script for Project Clippy.
 * This script runs in the context of web pages.
 * It's primarily used here as a target for chrome.scripting.executeScript
 * to interact with the DOM (e.g., paste text).
 */

console.log('Project Clippy content script loaded and active.');

function getSelectionHtml() {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return '';
  
  const container = document.createElement('div');
  for (let i = 0; i < selection.rangeCount; i++) {
    container.appendChild(selection.getRangeAt(i).cloneContents());
  }
  return container.innerHTML;
}

// We can keep a listener here if we need direct communication from popup/background
// that isn't covered by executeScript, but for pasting, executeScript is preferred.
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.action === 'ping') {
    console.log('Content script received ping:', request.data);
    sendResponse({ success: true, message: 'pong' });
    return true;
  }
  
  if (request.action === 'getSelectionHtml') {
    const html = getSelectionHtml();
    const plainText = window.getSelection()?.toString() || '';
    sendResponse({ html, plainText });
    return true;
  }
  
  // Add other message handlers if needed
});
