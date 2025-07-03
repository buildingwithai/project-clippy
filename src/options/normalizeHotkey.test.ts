import { describe, it, expect } from 'vitest';

// Copied from Options.tsx
function normalizeHotkey(str: string): string {
  if (!str) return '';
  let s = str.replace(/\s+/g, '').toLowerCase();
  const mods = ['ctrl', 'alt', 'shift', 'command'];
  const parts = s.split('+').filter(Boolean);
  const foundMods = mods.filter(mod => parts.includes(mod));
  const key = parts.find(p => !mods.includes(p)) || '';
  return [...foundMods, key].filter(Boolean).join('+');
}

describe('normalizeHotkey', () => {
  it('handles empty string', () => {
    expect(normalizeHotkey('')).toBe('');
  });
  it('ignores whitespace and case', () => {
    expect(normalizeHotkey('Ctrl + Shift + 1')).toBe('ctrl+shift+1');
    expect(normalizeHotkey('  ctrl+shift+1  ')).toBe('ctrl+shift+1');
    expect(normalizeHotkey('CTRL+SHIFT+1')).toBe('ctrl+shift+1');
  });
  it('orders modifiers: ctrl,alt,shift,command', () => {
    expect(normalizeHotkey('Shift+Ctrl+1')).toBe('ctrl+shift+1');
    expect(normalizeHotkey('Alt+Ctrl+1')).toBe('ctrl+alt+1');
    expect(normalizeHotkey('Command+Alt+Ctrl+Z')).toBe('ctrl+alt+command+z');
  });
  it('handles missing modifiers', () => {
    expect(normalizeHotkey('1')).toBe('1');
    expect(normalizeHotkey('Shift+1')).toBe('shift+1');
  });
  it('ignores duplicate modifiers', () => {
    expect(normalizeHotkey('Ctrl+Ctrl+1')).toBe('ctrl+1');
  });
  it('handles synonyms (should NOT: meta vs command)', () => {
    expect(normalizeHotkey('Meta+1')).not.toBe('command+1');
  });
});
