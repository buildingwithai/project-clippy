let hotkeys: Record<string, string> = {};

const loadHotkeys = async () => {
  const result = await chrome.storage.local.get('hotkeys');
  hotkeys = result.hotkeys || {};
};

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.hotkeys) {
    hotkeys = changes.hotkeys.newValue || {};
  }
});

const handleKeyDown = (event: KeyboardEvent) => {
  let hotkeyString = '';
  if (event.ctrlKey) hotkeyString += 'Ctrl+';
  if (event.altKey) hotkeyString += 'Alt+';
  if (event.shiftKey) hotkeyString += 'Shift+';
  if (event.metaKey) hotkeyString += 'Command+';

  const key = event.key.toLowerCase();
  if (!['control', 'alt', 'shift', 'meta'].includes(key)) {
    hotkeyString += event.code.replace('Key', '').replace('Digit', '');
  }

  for (const snippetId in hotkeys) {
    if (hotkeys[snippetId] === hotkeyString) {
      event.preventDefault();
      event.stopPropagation();
      chrome.runtime.sendMessage({ type: 'PASTE_SNIPPET_BY_ID', snippetId });
      break;
    }
  }
};

document.addEventListener('keydown', handleKeyDown, true);

loadHotkeys();
