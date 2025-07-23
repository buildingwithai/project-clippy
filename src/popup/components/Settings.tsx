import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Keyboard, Package, User, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Snippet } from '../../utils/types';
import { BankView, RemotePackMeta } from './BankView';

interface SettingsProps {
  onBack: () => void;
  packs: RemotePackMeta[];
  onImportPack: (packId: string) => Promise<void>;
  importedPackIds: string[];
}

type SettingsSection = 'general' | 'collections' | 'account' | 'privacy';

type HotkeyMapping = {
  slot: string;
  snippetId: string;
};

type ContextMenuMode = 'pinned' | 'folders' | 'hybrid';

const HOTKEY_SLOTS = [
  { slot: 'hotkey-1', label: 'Hotkey 1' },
  { slot: 'hotkey-2', label: 'Hotkey 2' },
  { slot: 'hotkey-3', label: 'Hotkey 3' },
  { slot: 'hotkey-4', label: 'Hotkey 4' },
];

export const Settings: React.FC<SettingsProps> = ({
  onBack,
  packs,
  onImportPack,
  importedPackIds
}) => {
  const [activeSection, setActiveSection] = useState<SettingsSection>('general');
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [hotkeyMappings, setHotkeyMappings] = useState<HotkeyMapping[]>([]);
  const [chromeHotkeys, setChromeHotkeys] = useState<Record<string, string>>({});
  const [contextMenuMode, setContextMenuMode] = useState<ContextMenuMode>('hybrid');
  const [contextMenuSaving, setContextMenuSaving] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Load data for hotkeys and context menu
  const loadData = useCallback(async () => {
    const result = await chrome.storage.local.get(['snippets', 'hotkeyMappings', 'contextMenuMode']);
    setSnippets(result.snippets || []);
    setContextMenuMode(result.contextMenuMode || 'hybrid');
    
    const storedMappings: HotkeyMapping[] = result.hotkeyMappings || [];
    const mappings: HotkeyMapping[] = HOTKEY_SLOTS.map(({ slot }) => {
      const found = storedMappings.find(m => m.slot === slot);
      return { slot, snippetId: found?.snippetId || '' };
    });
    setHotkeyMappings(mappings);

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

  useEffect(() => {
    chrome.storage.local.set({ hotkeyMappings });
  }, [hotkeyMappings]);

  const handleMappingChange = (idx: number, snippetId: string) => {
    setHotkeyMappings(mappings => {
      const updated = [...mappings];
      updated[idx] = { ...updated[idx], snippetId };
      return updated;
    });
  };

  const handleCustomizeShortcut = () => {
    chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
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

  const sections = [
    { id: 'general' as const, label: 'General', icon: Keyboard },
    { id: 'collections' as const, label: 'Collections', icon: Package },
    { id: 'account' as const, label: 'Account', icon: User },
    { id: 'privacy' as const, label: 'Privacy', icon: Shield },
  ];

  const renderGeneralSettings = () => (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-slate-200 mb-2">Global Hotkeys</h3>
        <p className="text-xs text-slate-400 mb-3">
          Set up keyboard shortcuts to paste snippets from anywhere.
        </p>
        
        <div className="bg-slate-800/50 rounded-md p-3 mb-3">
          <h4 className="text-xs font-medium text-slate-300 mb-1">How it works:</h4>
          <ol className="text-xs text-slate-400 space-y-1 ml-3 list-decimal">
            <li>Click "Chrome Settings" below</li>
            <li>Assign shortcuts to each hotkey slot</li>
            <li>Return here and assign snippets</li>
          </ol>
        </div>

        <div className="space-y-2">
          {HOTKEY_SLOTS.map(({ slot, label }, idx) => (
            <div key={slot} className="bg-slate-800/30 rounded-md p-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-slate-300">{label}</span>
                {chromeHotkeys[slot] ? (
                  <span className="text-xs font-mono text-sky-300 bg-sky-900/30 px-1.5 py-0.5 rounded">
                    {chromeHotkeys[slot]}
                  </span>
                ) : (
                  <span className="text-xs text-yellow-400">Not assigned</span>
                )}
              </div>
              <select
                className="w-full bg-slate-800 text-slate-200 text-xs rounded px-2 py-1.5 border border-slate-600 focus:border-sky-500 focus:outline-none"
                value={hotkeyMappings[idx]?.snippetId || ''}
                onChange={e => handleMappingChange(idx, e.target.value)}
              >
                <option value="">-- Select Snippet --</option>
                {snippets.map(snippet => (
                  <option key={snippet.id} value={snippet.id}>
                    {snippet.title || snippet.text.slice(0, 25)}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-2 mt-3">
          <Button
            onClick={handleCustomizeShortcut}
            size="sm"
            className="bg-sky-700 hover:bg-sky-600 text-sky-100 text-xs"
          >
            Chrome Settings
          </Button>
          <Button
            onClick={loadData}
            variant="outline"
            size="sm"
            className="text-slate-300 border-slate-600 hover:bg-slate-700 text-xs"
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Context Menu Layout Section */}
      <div className="mt-6">
        <h3 className="text-sm font-semibold text-slate-200 mb-2">Context Menu Layout</h3>
        <p className="text-xs text-slate-400 mb-3">
          Choose how Project Clippy appears when you right-click on web pages.
        </p>
        
        <div className="grid grid-cols-1 gap-2">
          {/* Pinned Only Mode */}
          <div 
            className={`border rounded-lg p-3 cursor-pointer transition-all ${
              contextMenuMode === 'pinned' 
                ? 'border-sky-500 bg-sky-500/10' 
                : 'border-slate-600 hover:border-slate-500 bg-slate-800/30'
            }`}
            onClick={() => handleContextMenuModeChange('pinned')}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center">
                <input
                  type="radio"
                  name="contextMenuMode"
                  value="pinned"
                  checked={contextMenuMode === 'pinned'}
                  onChange={() => handleContextMenuModeChange('pinned')}
                  className="mr-2 text-sky-500 text-xs"
                />
                <span className="font-medium text-slate-200 text-xs">Pinned Only</span>
              </div>
            </div>
            <p className="text-xs text-slate-400 mb-2">Show only starred snippets</p>
            
            {/* Mini Visual Preview */}
            <div className="bg-slate-900 rounded border border-slate-600 p-2 text-xs">
              <div className="text-slate-300 font-semibold mb-1 text-xs">Project Clippy</div>
              <div className="text-slate-400 pl-1 text-xs">⭐ Important</div>
              <div className="text-slate-400 pl-1 text-xs">⭐ Quick reply</div>
            </div>
          </div>

          {/* Folders Only Mode */}
          <div 
            className={`border rounded-lg p-3 cursor-pointer transition-all ${
              contextMenuMode === 'folders' 
                ? 'border-sky-500 bg-sky-500/10' 
                : 'border-slate-600 hover:border-slate-500 bg-slate-800/30'
            }`}
            onClick={() => handleContextMenuModeChange('folders')}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center">
                <input
                  type="radio"
                  name="contextMenuMode"
                  value="folders"
                  checked={contextMenuMode === 'folders'}
                  onChange={() => handleContextMenuModeChange('folders')}
                  className="mr-2 text-sky-500 text-xs"
                />
                <span className="font-medium text-slate-200 text-xs">Folders Only</span>
              </div>
            </div>
            <p className="text-xs text-slate-400 mb-2">Show folders with submenus</p>
            
            {/* Mini Visual Preview */}
            <div className="bg-slate-900 rounded border border-slate-600 p-2 text-xs">
              <div className="text-slate-300 font-semibold mb-1 text-xs">Project Clippy</div>
              <div className="text-slate-400 pl-1 text-xs">📁 Work ▶</div>
              <div className="text-slate-400 pl-1 text-xs">🎨 Design ▶</div>
            </div>
          </div>

          {/* Hybrid Mode */}
          <div 
            className={`border rounded-lg p-3 cursor-pointer transition-all ${
              contextMenuMode === 'hybrid' 
                ? 'border-sky-500 bg-sky-500/10' 
                : 'border-slate-600 hover:border-slate-500 bg-slate-800/30'
            }`}
            onClick={() => handleContextMenuModeChange('hybrid')}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center">
                <input
                  type="radio"
                  name="contextMenuMode"
                  value="hybrid"
                  checked={contextMenuMode === 'hybrid'}
                  onChange={() => handleContextMenuModeChange('hybrid')}
                  className="mr-2 text-sky-500 text-xs"
                />
                <span className="font-medium text-slate-200 text-xs">Pinned + Folders</span>
                <span className="ml-2 text-xs bg-sky-600 text-white px-1.5 py-0.5 rounded">Default</span>
              </div>
            </div>
            <p className="text-xs text-slate-400 mb-2">Show starred snippets first, then folders</p>
            
            {/* Mini Visual Preview */}
            <div className="bg-slate-900 rounded border border-slate-600 p-2 text-xs">
              <div className="text-slate-300 font-semibold mb-1 text-xs">Project Clippy</div>
              <div className="text-slate-400 pl-1 text-xs">⭐ Important</div>
              <div className="border-t border-slate-600 my-1"></div>
              <div className="text-slate-400 pl-1 text-xs">📁 Work ▶</div>
            </div>
          </div>
        </div>

        {/* Status/Feedback */}
        {contextMenuSaving && (
          <div className="mt-3 flex items-center justify-center text-xs text-green-400 bg-green-400/10 border border-green-400/20 rounded-lg p-2">
            <span className="animate-spin mr-2">⟳</span>
            Updating context menu...
          </div>
        )}
      </div>
    </div>
  );

  const renderCollectionsSettings = () => (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-slate-200 mb-2">Snippet Collections</h3>
        <p className="text-xs text-slate-400 mb-3">
          Discover and install curated snippet collections from the community.
        </p>
      </div>
      <BankView packs={packs} onImportPack={onImportPack} importedPackIds={new Set(importedPackIds)} />
    </div>
  );

  const renderAccountSettings = () => (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-slate-200 mb-2">Account Settings</h3>
        <p className="text-xs text-slate-400 mb-3">
          Account features and sync settings will be available in a future update.
        </p>
      </div>
      <div className="bg-slate-800/30 rounded-md p-4 text-center">
        <User className="w-6 h-6 text-slate-500 mx-auto mb-2" />
        <p className="text-xs text-slate-500">Coming soon</p>
      </div>
    </div>
  );

  const renderPrivacySettings = () => (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-slate-200 mb-2">Privacy Settings</h3>
        <p className="text-xs text-slate-400 mb-3">
          Control how your data is stored and used.
        </p>
      </div>
      <div className="bg-slate-800/30 rounded-md p-4 text-center">
        <Shield className="w-6 h-6 text-slate-500 mx-auto mb-2" />
        <p className="text-xs text-slate-500">Coming soon</p>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeSection) {
      case 'general':
        return renderGeneralSettings();
      case 'collections':
        return renderCollectionsSettings();
      case 'account':
        return renderAccountSettings();
      case 'privacy':
        return renderPrivacySettings();
      default:
        return renderGeneralSettings();
    }
  };

  return (
    <div className="flex h-full bg-slate-900">
      {/* Sidebar */}
      <div className={cn(
        "bg-slate-800/50 border-r border-slate-700 transition-all duration-300 flex-shrink-0",
        isCollapsed ? "w-12" : "w-28"
      )}>
        {/* Header with back button and collapse toggle */}
        <div className="p-1 border-b border-slate-700">
          {!isCollapsed ? (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Button
                  onClick={onBack}
                  variant="ghost"
                  size="sm"
                  className="p-1 text-slate-400 hover:text-slate-200"
                >
                  <ChevronLeft className="w-3 h-3" />
                </Button>
                <Button
                  onClick={() => setIsCollapsed(true)}
                  variant="ghost"
                  size="sm"
                  className="p-1 text-slate-400 hover:text-slate-200"
                  title="Collapse sidebar"
                >
                  <ChevronsLeft className="w-3 h-3" />
                </Button>
              </div>
              <h2 className="text-xs font-semibold text-slate-200 px-1">Settings</h2>
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-1">
              <Button
                onClick={onBack}
                variant="ghost"
                size="sm"
                className="p-1 text-slate-400 hover:text-slate-200"
                title="Back"
              >
                <ChevronLeft className="w-3 h-3" />
              </Button>
              <Button
                onClick={() => setIsCollapsed(false)}
                variant="ghost"
                size="sm"
                className="p-1 text-slate-400 hover:text-slate-200"
                title="Expand sidebar"
              >
                <ChevronsRight className="w-3 h-3" />
              </Button>
            </div>
          )}
        </div>
        
        {/* Navigation */}
        <nav className="px-1 py-2">
          {sections.map(({ id, label, icon: Icon }) => (
            <Button
              key={id}
              onClick={() => setActiveSection(id)}
              variant="ghost"
              title={isCollapsed ? label : undefined}
              className={cn(
                "w-full mb-1 h-8",
                isCollapsed ? "justify-center px-0" : "justify-start text-xs",
                activeSection === id
                  ? "bg-slate-700 text-slate-100"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-700/50"
              )}
            >
              <Icon className={cn("w-3 h-3", !isCollapsed && "mr-2")} />
              {!isCollapsed && <span>{label}</span>}
            </Button>
          ))}
        </nav>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto">
        <div className="p-3">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};