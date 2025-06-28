import React, { useState, useEffect, useCallback } from 'react';
import type { Snippet } from '../utils/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const Options: React.FC = () => {
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [hotkeys, setHotkeys] = useState<Record<string, string>>({}); // {[snippetId]: hotkey}
  const [recordingSnippetId, setRecordingSnippetId] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      const result = await chrome.storage.local.get(['snippets', 'hotkeys']);
      setSnippets(result.snippets || []);
      setHotkeys(result.hotkeys || {});
    };
    loadData();
  }, []);

  const handleKeyDown = useCallback(async (event: KeyboardEvent) => {
    if (!recordingSnippetId) return;

    event.preventDefault();
    event.stopPropagation();

    const key = event.key.toLowerCase();
    if (['control', 'alt', 'shift', 'meta'].includes(key)) return;

    let hotkeyString = '';
    if (event.ctrlKey) hotkeyString += 'Ctrl+';
    if (event.altKey) hotkeyString += 'Alt+';
    if (event.shiftKey) hotkeyString += 'Shift+';
    // For Mac, event.metaKey is the Command key.
    if (event.metaKey) hotkeyString += 'Command+';

    hotkeyString += event.code.replace('Key', '').replace('Digit', '');

    const updatedHotkeys = { ...hotkeys, [recordingSnippetId]: hotkeyString };
    setHotkeys(updatedHotkeys);
    await chrome.storage.local.set({ hotkeys: updatedHotkeys });

    setRecordingSnippetId(null);
  }, [recordingSnippetId, hotkeys]);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (recordingSnippetId) {
        handleKeyDown(e);
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      document.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [recordingSnippetId, handleKeyDown]);

  const handleSetHotkey = (snippetId: string) => {
    setRecordingSnippetId(snippetId === recordingSnippetId ? null : snippetId);
  };

  const handleClearHotkey = async (snippetId: string) => {
    const updatedHotkeys = { ...hotkeys };
    delete updatedHotkeys[snippetId];
    setHotkeys(updatedHotkeys);
    await chrome.storage.local.set({ hotkeys: updatedHotkeys });
  };
  const handleCustomizeShortcut = () => {
    chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-sky-400 mb-6">Clippy Settings</h1>
        <Tabs defaultValue="hotkeys" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-slate-800">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="hotkeys">Hotkeys</TabsTrigger>
          </TabsList>
          <TabsContent value="general">
            <div className="bg-slate-800 p-6 rounded-b-lg rounded-tr-lg">
              <h2 className="text-xl font-semibold text-slate-200">General Settings</h2>
              <p className="text-slate-400 mt-2">General settings will be available here in a future update.</p>
            </div>
          </TabsContent>
          <TabsContent value="hotkeys">
            <div className="bg-slate-800 p-6 rounded-b-lg rounded-tr-lg">
              <h2 className="text-xl font-semibold text-slate-200 mb-4">Global Hotkeys</h2>
              <div>
                                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-300">Overlay Hotkey</h3>
                  <p className="text-gray-400 mt-1">
                    Customize the shortcut to open the Clippy search overlay from anywhere in Chrome.
                  </p>
                  <button
                    onClick={handleCustomizeShortcut}
                    className="mt-3 px-4 py-2 bg-sky-600 text-white font-semibold rounded-md hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 transition-colors"
                  >
                    Customize Overlay Shortcut
                  </button>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-300">Snippet Hotkeys</h3>
                  <p className="text-gray-400 mt-1">
                    Assign a global hotkey to quickly paste a specific snippet.
                  </p>
                  <div className="mt-4 space-y-3">
                    {snippets.map(snippet => (
                      <div key={snippet.id} className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                        <span className="truncate pr-4 font-medium text-slate-300">{snippet.title || snippet.text}</span>
                        <div className="flex items-center space-x-2">
                          <span className="text-sky-400 font-mono text-sm w-32 text-right">{hotkeys[snippet.id] || 'Not set'}</span>
                          <button
                            onClick={() => handleSetHotkey(snippet.id)}
                            className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${recordingSnippetId === snippet.id ? 'bg-yellow-500 text-black' : 'bg-slate-600 hover:bg-slate-500'}`}>
                            {recordingSnippetId === snippet.id ? 'Recording...' : 'Set'}
                          </button>
                          {hotkeys[snippet.id] && (
                            <button 
                              onClick={() => handleClearHotkey(snippet.id)}
                              className="px-3 py-1 text-sm font-semibold bg-red-800 hover:bg-red-700 rounded-md transition-colors">
                              Clear
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Options;
