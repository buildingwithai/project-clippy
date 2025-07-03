import { describe, it, expect } from 'vitest';

// Same normalization as in Options.tsx
function normalizeHotkey(str: string): string {
  if (!str) return '';
  let s = str.replace(/\s+/g, '').toLowerCase();
  const mods = ['ctrl', 'alt', 'shift', 'command'];
  const parts = s.split('+').filter(Boolean);
  const foundMods = mods.filter(mod => parts.includes(mod));
  const key = parts.find(p => !mods.includes(p)) || '';
  return [...foundMods, key].filter(Boolean).join('+');
}

describe('chrome.commands.getAll shortcut normalization', () => {
  it('matches Chrome Mac shortcut for Command', () => {
    // Chrome may return 'Command+Shift+1' or 'Shift+Command+1' on Mac
    const result = normalizeHotkey('Command+Shift+1');
    expect(['command+shift+1', 'shift+command+1']).toContain(result);
    expect(['command+shift+1', 'shift+command+1']).toContain(normalizeHotkey('command+shift+1'));
    expect(['command+shift+1', 'shift+command+1']).toContain(normalizeHotkey('shift+command+1'));
  });
  it('matches Chrome Windows shortcut for Ctrl', () => {
    // Chrome returns 'Ctrl+Shift+1' on Windows
    expect(normalizeHotkey('Ctrl+Shift+1')).toBe('ctrl+shift+1');
    expect(normalizeHotkey('ctrl+shift+1')).toBe('ctrl+shift+1');
  });
  it('ignores whitespace and order', () => {
    expect(normalizeHotkey(' Shift + Ctrl + 1 ')).toBe('ctrl+shift+1');
  });
  it('handles Chrome shortcut with no modifiers', () => {
    expect(normalizeHotkey('A')).toBe('a');
  });
});
