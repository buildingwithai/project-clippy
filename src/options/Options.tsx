import React, { useState, useEffect, useCallback } from 'react';
import type { Snippet } from '../utils/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type HotkeyMapping = {
  slot: string; // e.g. 'hotkey-1'
  snippetId: string;
};

const HOTKEY_SLOTS = [
  { slot: 'hotkey-1', label: 'Hotkey 1' },
  { slot: 'hotkey-2', label: 'Hotkey 2' },
  { slot: 'hotkey-3', label: 'Hotkey 3' },
  { slot: 'hotkey-4', label: 'Hotkey 4' },
];

// Local helper for normalization (fixes lint error)
function normalizeHotkey(str: string): string {
  if (!str) return '';
  let s = str.replace(/\s+/g, '').toLowerCase();
  const mods = ['ctrl', 'alt', 'shift', 'command'];
  const parts = s.split('+').filter(Boolean);
  const foundMods = mods.filter(mod => parts.includes(mod));
  const key = parts.find(p => !mods.includes(p)) || '';
  return [...foundMods, key].filter(Boolean).join('+');
}

const Options: React.FC = () => {
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [hotkeyMappings, setHotkeyMappings] = useState<HotkeyMapping[]>([]);
  const [chromeHotkeys, setChromeHotkeys] = useState<Record<string, string>>({}); // slot -> chrome shortcut

  // Load snippets, hotkeyRows, and Chrome's assigned shortcuts
  // Make loadData accessible for Refresh button
  const loadData = useCallback(async () => {
    const result = await chrome.storage.local.get(['snippets', 'hotkeyMappings']);
    setSnippets(result.snippets || []);
    // Ensure all slots are present
    const storedMappings: HotkeyMapping[] = result.hotkeyMappings || [];
    const mappings: HotkeyMapping[] = HOTKEY_SLOTS.map(({ slot }) => {
      const found = storedMappings.find(m => m.slot === slot);
      return { slot, snippetId: found?.snippetId || '' };
    });
    setHotkeyMappings(mappings);

    // Get actual assigned Chrome shortcuts
    if (chrome.commands && chrome.commands.getAll) {
      chrome.commands.getAll((commands) => {
        const mapping: Record<string, string> = {};
        commands.forEach(cmd => {
          if (cmd.name && cmd.shortcut) mapping[cmd.name] = cmd.shortcut;
        });
        setChromeHotkeys(mapping);
      });
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Persist hotkeyMappings to chrome.storage.local (not sync)
  useEffect(() => {
    chrome.storage.local.set({ hotkeyMappings });
  }, [hotkeyMappings]);

  // Handler: change snippet mapping for a slot
  const handleMappingChange = (idx: number, snippetId: string) => {
    setHotkeyMappings(mappings => {
      const updated = [...mappings];
      updated[idx] = { ...updated[idx], snippetId };
      return updated;
    });
  };


  // No add/remove row handlers needed with fixed slots

  // No add/remove row handlers needed with fixed slots

  // Handler: open Chrome shortcut settings
  const handleCustomizeShortcut = () => {
    chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
  };






  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-sky-400 mb-6">Clippy Settings</h1>
        <div className="w-full">
          <div className="flex bg-slate-800 rounded-t-lg">
            <div className="flex-1 px-6 py-3 text-xl font-semibold text-slate-200 cursor-default border-b-2 border-sky-500 select-none">
              General
            </div>
            <div className="flex-1 px-6 py-3 text-xl font-semibold text-slate-400 cursor-pointer hover:text-sky-300 border-b-2 border-transparent select-none" style={{pointerEvents:'none',opacity:0.6}}>
              Global Hotkeys
            </div>
          </div>
          <div className="bg-slate-800 p-6 rounded-b-lg rounded-tr-lg">
            <h2 className="text-xl font-semibold text-slate-200 mb-4">General Settings</h2>
            <p className="text-slate-400 mt-2">General settings will be available here in a future update.</p>
          </div>
          <div className="mt-8">
            <h2 className="text-xl font-semibold text-slate-200 mb-4">Global Hotkeys</h2>
            <div className="mb-4 text-slate-400">
  <b>How it works:</b> 
  <ol className="list-decimal ml-6 mt-2">
    <li>Open <span className="text-sky-300 font-mono">chrome://extensions/shortcuts</span> and assign your preferred shortcuts to each "Activate snippet hotkey" slot.</li>
    <li>Return here: your assigned shortcuts will appear below. For each slot, choose which snippet you want to trigger.</li>
    <li>If a slot is not assigned, click <b>Open Chrome Shortcut Settings</b> to set it.</li>
  </ol>
  <div className="mt-2 text-yellow-300 text-sm">
    <b>Note:</b> Not all key combinations are allowed by Chrome or your operating system. If you see "(Not assigned)", set the shortcut in Chrome's settings.
  </div>
  <div className="mt-2 text-xs text-slate-400">
    <b>Limitations:</b> Some combos (e.g., Shift+Option, Ctrl+Option, or three-modifier combos) are not supported on macOS. See <a href="https://developer.chrome.com/docs/extensions/reference/api/commands/#key-combinations" target="_blank" rel="noopener noreferrer" className="underline text-sky-300">official docs</a> for details.
  </div>
</div>
            <div className="overflow-x-auto">
              <table className="min-w-full bg-slate-800 rounded-lg">
  <thead>
    <tr>
      <th className="text-left px-4 py-2 text-slate-300">Hotkey Slot</th>
      <th className="text-left px-4 py-2 text-slate-300">Snippet</th>
      <th className="text-left px-4 py-2 text-slate-300">Assigned Shortcut</th>
      <th className="text-left px-4 py-2 text-slate-300">Status</th>
    </tr>
  </thead>
  <tbody>
    {HOTKEY_SLOTS.map(({ slot, label }, idx) => (
      <tr key={slot} className="bg-slate-700/50">
        <td className="px-4 py-2 font-semibold">{label}</td>
        <td className="px-4 py-2">
          <select
            className="bg-slate-900 text-slate-100 rounded-md px-3 py-2 focus:outline-none border border-slate-600 w-full"
            value={hotkeyMappings[idx]?.snippetId || ''}
            onChange={e => handleMappingChange(idx, e.target.value)}
          >
            <option value="">-- Select Snippet --</option>
            {snippets.map(snippet => (
              <option key={snippet.id} value={snippet.id}>{snippet.title || snippet.text.slice(0,30)}</option>
            ))}
          </select>
        </td>
        <td className="px-4 py-2 font-mono">
          {chromeHotkeys[slot] ? (
            <span className="text-sky-300">{chromeHotkeys[slot]}</span>
          ) : (
            <span className="text-yellow-400">(Not assigned)</span>
          )}
        </td>
        <td className="px-4 py-2">
          {chromeHotkeys[slot] ? (
            <span className="text-green-400 font-semibold">Ready</span>
          ) : (
            <span className="text-yellow-400 font-semibold">Set shortcut in Chrome</span>
          )}
        </td>
      </tr>
    ))}
  </tbody>
</table>
            </div>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-center">
  <div className="flex gap-2">
    <button
      onClick={loadData}
      className="px-4 py-2 bg-slate-700 text-sky-300 font-semibold rounded-md hover:bg-slate-800 border border-sky-600 transition-colors"
      title="Refresh assigned shortcuts from Chrome"
    >
      Refresh Shortcuts
    </button>
  </div>
  <button
    onClick={handleCustomizeShortcut}
    className="px-4 py-2 bg-slate-700 text-sky-300 font-semibold rounded-md hover:bg-slate-800 border border-sky-600 transition-colors"
  >
    Open Chrome Shortcut Settings
  </button>
</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Options;
