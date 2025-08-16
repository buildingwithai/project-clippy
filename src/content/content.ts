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
  if (request.type === 'OPEN_VARIABLE_POPOVER') {
    // Expect shape: { vars: { name: string; defaultValue?: string }[], values: Record<string,string> }
    const { vars, values } = request as { vars: Array<{ name: string; defaultValue?: string }>; values: Record<string, string> };

    // Build and show a lightweight popover near the current selection/caret
    // We return true to indicate we'll respond asynchronously
    showVariablesPopover(vars, values, ({ submitted, vals, remember }) => {
      if (!submitted) {
        try { sendResponse({ cancelled: true }); } catch {}
      } else {
        try { sendResponse({ cancelled: false, values: vals, remember: !!remember }); } catch {}
      }
    });
    return true;
  }
});

// ------------------ Variables Popover UI (Content Script) ------------------

let activePopoverHost: HTMLElement | null = null;

function getCaretRect(): DOMRect {
  const sel = window.getSelection();
  if (sel && sel.rangeCount > 0) {
    const range = sel.getRangeAt(0).cloneRange();
    // If the range is collapsed, insert a temporary span to get a rect
    if (range.collapsed) {
      const span = document.createElement('span');
      // Zero-width non-joiner to create measurable rect
      span.textContent = '\u200C';
      range.insertNode(span);
      const rect = span.getBoundingClientRect();
      span.parentNode?.removeChild(span);
      return rect;
    }
    const rect = range.getBoundingClientRect();
    if (rect) return rect;
  }
  // Fallback: center of viewport
  return new DOMRect(window.innerWidth / 2, window.innerHeight / 2, 1, 1);
}

function showVariablesPopover(
  vars: Array<{ name: string; defaultValue?: string }>,
  initialValues: Record<string, string>,
  done: (r: { submitted: boolean; vals?: Record<string, string>; remember?: boolean }) => void,
) {
  if (activePopoverHost) {
    activePopoverHost.remove();
    activePopoverHost = null;
  }

  const host = document.createElement('div');
  host.style.position = 'fixed';
  host.style.zIndex = '2147483647';
  host.style.inset = '0';
  host.setAttribute('role', 'dialog');
  host.setAttribute('aria-modal', 'true');
  host.setAttribute('aria-label', 'Fill variables');

  // Backdrop for outside click to close
  const backdrop = document.createElement('div');
  backdrop.style.position = 'absolute';
  backdrop.style.inset = '0';
  backdrop.style.background = 'transparent';
  backdrop.addEventListener('mousedown', (e) => {
    if (e.target === backdrop) close(false);
  });

  // Shadow root to isolate styles
  const panelHost = document.createElement('div');
  panelHost.style.position = 'absolute';
  const shadow = panelHost.attachShadow({ mode: 'open' });

  const style = document.createElement('style');
  style.textContent = `
    :host { all: initial; }
    .panel { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, sans-serif; }
    .panel { background: white; color: #0f172a; box-shadow: 0 10px 15px rgba(0,0,0,0.1), 0 4px 6px rgba(0,0,0,0.05); border-radius: 10px; width: max(260px, min(360px, 40vw)); max-width: 90vw; border: 1px solid #e5e7eb; }
    .header { display:flex; align-items:center; justify-content:space-between; padding: 10px 12px; border-bottom:1px solid #e5e7eb; }
    .title { font-weight: 600; font-size: 14px; }
    .close { background: transparent; border: none; color: #64748b; cursor: pointer; padding: 4px; border-radius: 6px; }
    .close:hover { background: #f1f5f9; }
    .body { padding: 10px 12px; max-height: 50vh; overflow: auto; }
    .row { display:grid; grid-template-columns: 1fr; gap: 6px; margin-bottom: 10px; }
    .label { font-size: 12px; color:#475569; }
    .input { width:100%; padding: 8px 10px; border:1px solid #cbd5e1; border-radius:8px; outline:none; font-size: 14px; }
    .input:focus { border-color:#2563eb; box-shadow: 0 0 0 3px rgba(37,99,235,0.15); }
    .footer { display:flex; align-items:center; justify-content:space-between; padding: 10px 12px; border-top:1px solid #e5e7eb; gap: 8px; }
    .checkbox { display:flex; align-items:center; gap: 8px; color:#475569; font-size: 12px; }
    .btns { display:flex; gap: 8px; }
    .btn { padding: 8px 10px; border-radius:8px; border:1px solid #cbd5e1; background:#f8fafc; color:#0f172a; cursor:pointer; font-weight:600; font-size: 13px; }
    .btn.primary { background:#2563eb; color:white; border-color:#2563eb; }
    .btn:hover { filter: brightness(0.97); }
  `;

  const panel = document.createElement('div');
  panel.className = 'panel';
  panel.setAttribute('role', 'group');
  panel.innerHTML = `
    <div class="header">
      <div class="title">Fill variables</div>
      <button class="close" aria-label="Close">✕</button>
    </div>
    <div class="body"></div>
    <div class="footer">
      <label class="checkbox"><input id="remember" type="checkbox"/> Remember for this domain</label>
      <div class="btns">
        <button class="btn" id="cancelBtn">Cancel</button>
        <button class="btn primary" id="submitBtn">Fill & Paste</button>
      </div>
    </div>
  `;

  shadow.appendChild(style);
  shadow.appendChild(panel);

  const body = panel.querySelector('.body') as HTMLElement;
  const inputs: Record<string, HTMLInputElement> = {};
  vars.forEach(v => {
    const row = document.createElement('div');
    row.className = 'row';
    const label = document.createElement('label');
    label.className = 'label';
    label.textContent = v.name;
    label.setAttribute('for', `var_${v.name}`);
    const input = document.createElement('input');
    input.className = 'input';
    input.id = `var_${v.name}`;
    input.name = v.name;
    input.value = initialValues[v.name] ?? v.defaultValue ?? '';
    input.setAttribute('aria-label', v.name);
    row.appendChild(label);
    row.appendChild(input);
    body.appendChild(row);
    inputs[v.name] = input;
  });

  const submitBtn = panel.querySelector('#submitBtn') as HTMLButtonElement;
  const cancelBtn = panel.querySelector('#cancelBtn') as HTMLButtonElement;
  const closeBtn = panel.querySelector('.close') as HTMLButtonElement;
  const rememberEl = panel.querySelector('#remember') as HTMLInputElement;

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') { e.preventDefault(); close(false); }
    if (e.key === 'Enter' && (e.target as HTMLElement)?.tagName === 'INPUT' && !e.shiftKey) {
      e.preventDefault(); submit();
    }
  };

  submitBtn.addEventListener('click', submit);
  cancelBtn.addEventListener('click', () => close(false));
  closeBtn.addEventListener('click', () => close(false));

  document.addEventListener('keydown', onKeyDown, true);

  function submit() {
    const vals: Record<string, string> = {};
    for (const k of Object.keys(inputs)) vals[k] = inputs[k].value;
    cleanup();
    done({ submitted: true, vals, remember: rememberEl.checked });
  }

  function close(submitted: boolean) {
    cleanup();
    done({ submitted });
  }

  function cleanup() {
    document.removeEventListener('keydown', onKeyDown, true);
    if (host.parentNode) host.parentNode.removeChild(host);
    activePopoverHost = null;
  }

  // Position near caret
  const rect = getCaretRect();
  const top = Math.min(Math.max(8, rect.bottom + 8), window.innerHeight - 16);
  const left = Math.min(Math.max(8, rect.left), window.innerWidth - 16);
  panelHost.style.top = `${top}px`;
  panelHost.style.left = `${left}px`;

  // Mount
  host.appendChild(backdrop);
  host.appendChild(panelHost);
  document.documentElement.appendChild(host);
  activePopoverHost = host;

  // Focus first input
  const firstInput = body.querySelector('input');
  if (firstInput) (firstInput as HTMLInputElement).focus();
}

// ------------------ Floating Bubble (selection-aware) ------------------

let bubbleEl: HTMLDivElement | null = null;
let isDragging = false;
let dragOffsetX = 0;
let dragOffsetY = 0;
let pinnedPosition: { x: number; y: number } | null = null; // session-persist while page open

// ------------------ Input-focused Bubble (Grammarly-style) ------------------

let inputBubbleEl: HTMLDivElement | null = null;
let currentFocusedInput: HTMLElement | null = null;
let inputBubbleDragging = false;
let inputBubblePinnedPosition: { x: number; y: number } | null = null;

function ensureBubble() {
  if (bubbleEl) return bubbleEl;
  const el = document.createElement('div');
  el.setAttribute('aria-label', 'Clippy actions');
  el.setAttribute('role', 'button');
  el.tabIndex = 0;
  Object.assign(el.style, {
    position: 'fixed',
    width: '32px',
    height: '32px',
    borderRadius: '16px',
    background: '#2563eb',
    color: '#fff',
    display: 'none',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 10px 15px rgba(0,0,0,0.1), 0 4px 6px rgba(0,0,0,0.05)',
    zIndex: '2147483647',
    cursor: 'pointer',
    userSelect: 'none',
    outline: 'none',
  } as CSSStyleDeclaration);
  el.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9 12h6M5 7h14M7 17h10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  el.addEventListener('click', () => openTray());
  el.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openTray();
    }
  });

  el.addEventListener('pointerdown', (e) => {
    isDragging = true;
    el.setPointerCapture(e.pointerId);
    const rect = el.getBoundingClientRect();
    dragOffsetX = e.clientX - rect.left;
    dragOffsetY = e.clientY - rect.top;
  });
  el.addEventListener('pointermove', (e) => {
    if (!isDragging) return;
    const x = Math.min(Math.max(0, e.clientX - dragOffsetX), window.innerWidth - 32);
    const y = Math.min(Math.max(0, e.clientY - dragOffsetY), window.innerHeight - 32);
    setBubblePosition(x, y);
    pinnedPosition = { x, y };
  });
  el.addEventListener('pointerup', (e) => {
    isDragging = false;
    try { el.releasePointerCapture(e.pointerId); } catch {}
  });

  document.documentElement.appendChild(el);
  bubbleEl = el;
  return el;
}

function setBubblePosition(x: number, y: number) {
  if (!bubbleEl) return;
  bubbleEl.style.left = `${x}px`;
  bubbleEl.style.top = `${y}px`;
}

function positionBubbleNearSelection() {
  const el = ensureBubble();
  const sel = window.getSelection();
  const hasText = !!sel && sel.toString().trim().length > 0;
  if (!hasText) {
    el.style.display = 'none';
    return;
  }

  el.style.display = 'flex';

  if (pinnedPosition) {
    setBubblePosition(pinnedPosition.x, pinnedPosition.y);
    return;
  }

  // Position by selection rect
  const rect = getCaretRect();
  const x = Math.min(Math.max(8, rect.right + 8), window.innerWidth - 40);
  const y = Math.min(Math.max(8, rect.top - 40), window.innerHeight - 40);
  setBubblePosition(x, y);
}

function openTray() {
  // Compute bubble center as origin for animation
  let originX: number | undefined;
  let originY: number | undefined;
  if (bubbleEl) {
    const rect = bubbleEl.getBoundingClientRect();
    originX = Math.round(rect.left + rect.width / 2);
    originY = Math.round(rect.top + rect.height / 2);
  }
  console.log('[Clippy Content] Attempting to open tray', { originX, originY });
  chrome.runtime.sendMessage({ action: 'toggleOverlayNow', originX, originY }).then((response) => {
    console.log('[Clippy Content] toggleOverlayNow response:', response);
  }).catch((err) => {
    console.error('[Clippy Content] Failed to send toggleOverlayNow message:', err);
  });
}

// Show bubble on selection changes
document.addEventListener('selectionchange', () => {
  try { positionBubbleNearSelection(); } catch {}
});

// Reposition on scroll/resize if visible
window.addEventListener('scroll', () => {
  if (bubbleEl && bubbleEl.style.display !== 'none' && !isDragging && !pinnedPosition) {
    positionBubbleNearSelection();
  }
}, { passive: true });

window.addEventListener('resize', () => {
  if (bubbleEl && bubbleEl.style.display !== 'none' && !isDragging && pinnedPosition) {
    // Clamp pinned position within viewport
    pinnedPosition.x = Math.min(Math.max(0, pinnedPosition.x), window.innerWidth - 32);
    pinnedPosition.y = Math.min(Math.max(0, pinnedPosition.y), window.innerHeight - 32);
    setBubblePosition(pinnedPosition.x, pinnedPosition.y);
  } else if (bubbleEl && bubbleEl.style.display !== 'none' && !isDragging) {
    positionBubbleNearSelection();
  }
});

console.log('[Clippy Content] Content script loaded and running');

// Keyboard shortcut: Ctrl/Cmd + Shift + Space to open tray (content-level fallback)
document.addEventListener('keydown', (e) => {
  const isCmdOrCtrl = e.metaKey || e.ctrlKey;
  if (isCmdOrCtrl && e.shiftKey && e.code === 'Space') {
    console.log('[Clippy Content] Keyboard shortcut triggered - Cmd+Shift+Space');
    e.preventDefault();
    e.stopPropagation();
    openTray();
  }
  // Debug all keydowns with modifiers
  if (isCmdOrCtrl && e.shiftKey) {
    console.log(`[Clippy Content] Key pressed: ${e.code} (looking for Space)`);
  }
}, true);

function ensureInputBubble() {
  if (inputBubbleEl) return inputBubbleEl;
  const el = document.createElement('div');
  el.setAttribute('aria-label', 'Clippy - Open snippet tray');
  el.setAttribute('role', 'button');
  el.tabIndex = 0;
  Object.assign(el.style, {
    position: 'absolute',
    width: '24px',
    height: '24px',
    borderRadius: '12px',
    background: '#2563eb',
    color: '#fff',
    display: 'none',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
    zIndex: '2147483646',
    cursor: 'pointer',
    userSelect: 'none',
    outline: 'none',
    fontSize: '12px',
    fontWeight: 'bold',
  } as CSSStyleDeclaration);
  // Create SVG icon instead of broken image
  el.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M19.14,12.94c0,0.3-0.12,0.58-0.33,0.79l-6.84,6.84c-0.21,0.21-0.49,0.33-0.79,0.33s-0.58-0.12-0.79-0.33L4.55,14.73c-0.21-0.21-0.33-0.49-0.33-0.79V8.5c0-0.61,0.49-1.1,1.1-1.1h5.44c0.3,0,0.58,0.12,0.79,0.33l5.84,5.84C19.02,13.2,19.14,13.58,19.14,12.94z M8.7,9.6c-0.61,0-1.1,0.49-1.1,1.1s0.49,1.1,1.1,1.1s1.1-0.49,1.1-1.1S9.31,9.6,8.7,9.6z"/>
    </svg>
  `;
  el.style.color = '#ffffff';

  el.addEventListener('click', (e) => {
    console.log('[Clippy Content] Input bubble clicked');
    e.preventDefault();
    e.stopPropagation();
    openTray();
  });
  
  el.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openTray();
    }
  });

  el.addEventListener('pointerdown', (e) => {
    inputBubbleDragging = true;
    el.setPointerCapture(e.pointerId);
    const rect = el.getBoundingClientRect();
    dragOffsetX = e.clientX - rect.left;
    dragOffsetY = e.clientY - rect.top;
    e.preventDefault();
    e.stopPropagation();
  });
  
  el.addEventListener('pointermove', (e) => {
    if (!inputBubbleDragging) return;
    const x = Math.min(Math.max(0, e.clientX - dragOffsetX), window.innerWidth - 24);
    const y = Math.min(Math.max(0, e.clientY - dragOffsetY), window.innerHeight - 24);
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.style.position = 'fixed';
    inputBubblePinnedPosition = { x, y };
  });
  
  el.addEventListener('pointerup', (e) => {
    inputBubbleDragging = false;
    try { el.releasePointerCapture(e.pointerId); } catch {}
  });

  document.documentElement.appendChild(el);
  inputBubbleEl = el;
  return el;
}

function isValidInputElement(el: HTMLElement): boolean {
  if (!el) return false;
  
  // Exclude password fields
  if (el.tagName === 'INPUT' && (el as HTMLInputElement).type === 'password') return false;
  
  // Include text inputs, textareas, contenteditable
  if (el.tagName === 'INPUT' && ['text', 'email', 'search', 'url', 'tel'].includes((el as HTMLInputElement).type)) return true;
  if (el.tagName === 'TEXTAREA') return true;
  if (el.contentEditable === 'true') return true;
  
  return false;
}

function positionInputBubbleInInput(inputEl: HTMLElement) {
  const bubble = ensureInputBubble();
  if (inputBubblePinnedPosition) {
    bubble.style.position = 'fixed';
    bubble.style.left = `${inputBubblePinnedPosition.x}px`;
    bubble.style.top = `${inputBubblePinnedPosition.y}px`;
    bubble.style.display = 'flex';
    return;
  }

  const rect = inputEl.getBoundingClientRect();
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
  const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
  
  // Position inside right padding area
  const x = rect.right - 30; // 24px bubble + 6px margin from edge
  const y = rect.top + (rect.height - 24) / 2; // Center vertically
  
  bubble.style.position = 'absolute';
  bubble.style.left = `${x + scrollLeft}px`;
  bubble.style.top = `${y + scrollTop}px`;
  bubble.style.display = 'flex';
}

function hideInputBubble() {
  if (inputBubbleEl) {
    inputBubbleEl.style.display = 'none';
  }
  currentFocusedInput = null;
  inputBubblePinnedPosition = null;
}

// Input focus/blur handlers
document.addEventListener('focusin', (e) => {
  const target = e.target as HTMLElement;
  if (isValidInputElement(target)) {
    currentFocusedInput = target;
    positionInputBubbleInInput(target);
  }
}, true);

document.addEventListener('focusout', (e) => {
  // Small delay to handle focus changes within the same form
  setTimeout(() => {
    const activeEl = document.activeElement as HTMLElement;
    if (!activeEl || !isValidInputElement(activeEl)) {
      hideInputBubble();
    }
  }, 100);
}, true);

// Reposition input bubble on scroll/resize
window.addEventListener('scroll', () => {
  if (currentFocusedInput && inputBubbleEl && inputBubbleEl.style.display !== 'none' && !inputBubbleDragging && !inputBubblePinnedPosition) {
    positionInputBubbleInInput(currentFocusedInput);
  }
}, { passive: true });

window.addEventListener('resize', () => {
  if (currentFocusedInput && inputBubbleEl && inputBubbleEl.style.display !== 'none' && !inputBubbleDragging) {
    if (inputBubblePinnedPosition) {
      // Clamp pinned position
      inputBubblePinnedPosition.x = Math.min(Math.max(0, inputBubblePinnedPosition.x), window.innerWidth - 24);
      inputBubblePinnedPosition.y = Math.min(Math.max(0, inputBubblePinnedPosition.y), window.innerHeight - 24);
      inputBubbleEl.style.left = `${inputBubblePinnedPosition.x}px`;
      inputBubbleEl.style.top = `${inputBubblePinnedPosition.y}px`;
    } else {
      positionInputBubbleInInput(currentFocusedInput);
    }
  }
});
