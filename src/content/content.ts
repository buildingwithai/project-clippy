/**
 * Content script for Project Clippy.
 * This script runs in the context of web pages.
 * It's primarily used here as a target for chrome.scripting.executeScript
 * to interact with the DOM (e.g., paste text).
 */

console.log('Project Clippy content script loaded and active.');

// The actual pasting logic is now primarily handled by the function injected
// by chrome.scripting.executeScript from the background script.
// This content script remains very light.

// We can keep a listener here if we need direct communication from popup/background
// that isn't covered by executeScript, but for pasting, executeScript is preferred.
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'ping') {
    console.log('Content script received ping:', request.data);
    sendResponse({ success: true, message: 'pong' });
    return true;
  }
  // Add other message handlers if needed
});
