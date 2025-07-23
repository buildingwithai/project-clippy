import React, { useState, useEffect, useCallback } from 'react';
import type { Snippet } from '../utils/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type HotkeyMapping = {
  slot: string; // e.g. 'hotkey-1'
  snippetId: string;
};

type ContextMenuMode = 'pinned' | 'folders' | 'hybrid';

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
  const [contextMenuMode, setContextMenuMode] = useState<ContextMenuMode>('hybrid');
  const [contextMenuSaving, setContextMenuSaving] = useState(false);

  // Load snippets, hotkeyRows, and Chrome's assigned shortcuts
  // Make loadData accessible for Refresh button
  const loadData = useCallback(async () => {
    const result = await chrome.storage.local.get(['snippets', 'hotkeyMappings', 'contextMenuMode']);
    setSnippets(result.snippets || []);
    setContextMenuMode(result.contextMenuMode || 'hybrid');
    
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

  // Handler: change context menu mode 
  const handleContextMenuModeChange = async (mode: ContextMenuMode) => {
    setContextMenuSaving(true);
    setContextMenuMode(mode);
    
    // Save to storage immediately
    await chrome.storage.local.set({ contextMenuMode: mode });
    
    // Send message to background script to update context menu
    try {
      await chrome.runtime.sendMessage({ action: 'updateContextMenu' });
    } catch (error) {
      console.warn('Failed to notify background script of context menu update:', error);
    }

    // Brief delay to show saving state
    setTimeout(() => {
      setContextMenuSaving(false);
    }, 500);
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
        
        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-slate-800">
            <TabsTrigger value="general" className="text-slate-200 data-[state=active]:bg-slate-700 data-[state=active]:text-sky-400">
              General
            </TabsTrigger>
            <TabsTrigger value="hotkeys" className="text-slate-200 data-[state=active]:bg-slate-700 data-[state=active]:text-sky-400">
              Global Hotkeys
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="general" className="mt-0">
            <div className="bg-slate-800 p-6 rounded-b-lg rounded-tr-lg">
            <h2 className="text-xl font-semibold text-slate-200 mb-6">General Settings</h2>
            
            {/* Context Menu Layout Section */}
            <div className="mb-8 bg-slate-700/30 rounded-lg p-6 border border-slate-600">
              <h3 className="text-xl font-semibold text-sky-300 mb-2 flex items-center">
                <span className="mr-2">🖱️</span>
                Context Menu Layout
              </h3>
              <p className="text-slate-400 mb-6">Choose how Project Clippy appears when you right-click on web pages</p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Pinned Only Mode */}
                <div 
                  className={`border-2 rounded-xl p-5 cursor-pointer transition-all shadow-lg hover:shadow-xl ${
                    contextMenuMode === 'pinned' 
                      ? 'border-sky-500 bg-sky-500/10 shadow-sky-500/20' 
                      : 'border-slate-600 hover:border-slate-500 bg-slate-800/50'
                  }`}
                  onClick={() => handleContextMenuModeChange('pinned')}
                >
                  <div className="flex items-center mb-2">
                    <input
                      type="radio"
                      name="contextMenuMode"
                      value="pinned"
                      checked={contextMenuMode === 'pinned'}
                      onChange={() => handleContextMenuModeChange('pinned')}
                      className="mr-2 text-sky-500"
                    />
                    <span className="font-semibold text-slate-200">Pinned Only</span>
                  </div>
                  <p className="text-sm text-slate-400 mb-3">Show only starred snippets</p>
                  
                  {/* Visual Preview */}
                  <div className="bg-slate-900 rounded-lg border border-slate-600 p-3 text-xs shadow-inner">
                    <div className="text-slate-300 font-semibold mb-2 border-b border-slate-700 pb-1">Project Clippy</div>
                    <div className="text-slate-400 pl-2 py-0.5 hover:bg-slate-800 rounded">⭐ Important snippet</div>
                    <div className="text-slate-400 pl-2 py-0.5 hover:bg-slate-800 rounded">⭐ Quick reply</div>
                    <div className="text-slate-400 pl-2 py-0.5 hover:bg-slate-800 rounded">⭐ Template</div>
                  </div>
                </div>

                {/* Folders Only Mode */}
                <div 
                  className={`border-2 rounded-xl p-5 cursor-pointer transition-all shadow-lg hover:shadow-xl ${
                    contextMenuMode === 'folders' 
                      ? 'border-sky-500 bg-sky-500/10 shadow-sky-500/20' 
                      : 'border-slate-600 hover:border-slate-500 bg-slate-800/50'
                  }`}
                  onClick={() => handleContextMenuModeChange('folders')}
                >
                  <div className="flex items-center mb-2">
                    <input
                      type="radio"
                      name="contextMenuMode"
                      value="folders"
                      checked={contextMenuMode === 'folders'}
                      onChange={() => handleContextMenuModeChange('folders')}
                      className="mr-2 text-sky-500"
                    />
                    <span className="font-semibold text-slate-200">Folders Only</span>
                  </div>
                  <p className="text-sm text-slate-400 mb-3">Show folders with submenus</p>
                  
                  {/* Visual Preview */}
                  <div className="bg-slate-900 rounded-lg border border-slate-600 p-3 text-xs shadow-inner">
                    <div className="text-slate-300 font-semibold mb-2 border-b border-slate-700 pb-1">Project Clippy</div>
                    <div className="text-slate-400 pl-2 py-0.5 hover:bg-slate-800 rounded">📁 Work ▶</div>
                    <div className="text-slate-400 pl-2 py-0.5 hover:bg-slate-800 rounded">🎨 Design ▶</div>
                    <div className="text-slate-400 pl-2 py-0.5 hover:bg-slate-800 rounded">📄 Uncategorized ▶</div>
                  </div>
                </div>

                {/* Hybrid Mode */}
                <div 
                  className={`border-2 rounded-xl p-5 cursor-pointer transition-all shadow-lg hover:shadow-xl ${
                    contextMenuMode === 'hybrid' 
                      ? 'border-sky-500 bg-sky-500/10 shadow-sky-500/20' 
                      : 'border-slate-600 hover:border-slate-500 bg-slate-800/50'
                  }`}
                  onClick={() => handleContextMenuModeChange('hybrid')}
                >
                  <div className="flex items-center mb-2">
                    <input
                      type="radio"
                      name="contextMenuMode"
                      value="hybrid"
                      checked={contextMenuMode === 'hybrid'}
                      onChange={() => handleContextMenuModeChange('hybrid')}
                      className="mr-2 text-sky-500"
                    />
                    <span className="font-semibold text-slate-200">Pinned + Folders</span>
                    <span className="ml-2 text-xs bg-sky-600 text-white px-2 py-0.5 rounded">Default</span>
                  </div>
                  <p className="text-sm text-slate-400 mb-3">Show starred snippets first, then folders</p>
                  
                  {/* Visual Preview */}
                  <div className="bg-slate-900 rounded-lg border border-slate-600 p-3 text-xs shadow-inner">
                    <div className="text-slate-300 font-semibold mb-2 border-b border-slate-700 pb-1">Project Clippy</div>
                    <div className="text-slate-400 pl-2 py-0.5 hover:bg-slate-800 rounded">⭐ Important snippet</div>
                    <div className="text-slate-400 pl-2 py-0.5 hover:bg-slate-800 rounded">⭐ Quick reply</div>
                    <div className="border-t border-slate-600 my-2"></div>
                    <div className="text-slate-400 pl-2 py-0.5 hover:bg-slate-800 rounded">📁 Work ▶</div>
                    <div className="text-slate-400 pl-2 py-0.5 hover:bg-slate-800 rounded">🎨 Design ▶</div>
                  </div>
                </div>
              </div>

              {/* Status/Feedback */}
              {contextMenuSaving && (
                <div className="mt-6 flex items-center justify-center text-sm text-green-400 bg-green-400/10 border border-green-400/20 rounded-lg p-3">
                  <span className="animate-spin mr-2">⟳</span>
                  Updating context menu...
                </div>
              )}
            </div>

            <div className="mt-8 text-center">
              <p className="text-slate-500 text-sm">Additional general settings will be available here in a future update.</p>
            </div>
            </div>
          </TabsContent>
          
          <TabsContent value="hotkeys" className="mt-0">
            <div className="bg-slate-800 p-6 rounded-b-lg rounded-tr-lg">
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
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default Options;
