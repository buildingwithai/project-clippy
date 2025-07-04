import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Edit3, Copy, Check, Plus, Trash2, Pencil } from 'lucide-react';
// import { FolderPane } from './components/FolderPane'; // No longer used directly here
import { FolderTabs } from './components/FolderTabs'; // Import FolderTabs
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CustomTooltip } from '@/components/ui/custom-tooltip';
import { GlowingButton } from '@/components/ui/glowing-button';
import type { Snippet, Folder } from '../utils/types';
import { SnippetFormModal } from './components/SnippetFormModal';
import { SnippetItem } from './components/SnippetItem';
import type { TopTab } from './components/TopTabs';
import { BankToggle } from './components/BankToggle';
import { BankView, RemotePackMeta } from './components/BankView';

const App: React.FC = () => {
  // State for snippets and folders
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState(''); // For snippet search
  // Tabs: 'all' or 'bank'
  const [activeTab, setActiveTab] = useState<TopTab>('all');
  const [activeFilterFolderId, setActiveFilterFolderId] = useState<string | null>(null);
  

  // Snippet modal state
  const [isSnippetModalOpen, setIsSnippetModalOpen] = useState(false);
  const [editingSnippet, setEditingSnippet] = useState<Snippet | null>(null);
  const [copiedSnippetId, setCopiedSnippetId] = useState<string | null>(null);

  // Top-level tab state (Pinned / Bank / All)
  

  // Folder editing state
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState('');
  const [contextMenuFolder, setContextMenuFolder] = useState<Folder | null>(null);

  // UI state
  const [isFoldersCollapsed, setIsFoldersCollapsed] = useState(false);
  // Remote snippet packs
  const [packs, setPacks] = useState<RemotePackMeta[]>([]);
  const [importedPackIds, setImportedPackIds] = useState<Set<string>>(new Set());

  const PACKS_ORIGIN = 'https://buildingwithai.github.io/project-clippy';

  // Generate mock snippets for testing when real pack data is not available
  const generateMockSnippets = (packId: string, packName: string, count: number): Snippet[] => {
    const mockData: Record<string, Array<{title: string, text: string}>> = {
      'basic-dev-snippets': [
        { title: 'Console Log', text: 'console.log();' },
        { title: 'Function Declaration', text: 'function functionName() {\n  // code here\n}' },
        { title: 'Arrow Function', text: 'const functionName = () => {\n  // code here\n};' },
        { title: 'Try Catch', text: 'try {\n  // code here\n} catch (error) {\n  console.error(error);\n}' },
        { title: 'For Loop', text: 'for (let i = 0; i < array.length; i++) {\n  // code here\n}' },
        { title: 'If Statement', text: 'if (condition) {\n  // code here\n}' },
        { title: 'Async Function', text: 'async function functionName() {\n  // code here\n}' },
        { title: 'Promise', text: 'const promise = new Promise((resolve, reject) => {\n  // code here\n});' },
        { title: 'Import Statement', text: "import { item } from 'module';" },
        { title: 'Export Default', text: 'export default componentName;' },
        { title: 'Class Declaration', text: 'class ClassName {\n  constructor() {\n    // code here\n  }\n}' },
        { title: 'Destructuring', text: 'const { property } = object;' }
      ],
      'ui-components': [
        { title: 'React Component', text: 'const ComponentName = () => {\n  return (\n    <div>\n      {/* content */}\n    </div>\n  );\n};' },
        { title: 'Button Component', text: '<button className="btn-primary" onClick={handleClick}>\n  Click me\n</button>' },
        { title: 'Input Field', text: '<input\n  type="text"\n  placeholder="Enter text"\n  value={value}\n  onChange={handleChange}\n/>' },
        { title: 'Card Layout', text: '<div className="card">\n  <div className="card-header">\n    <h3>Title</h3>\n  </div>\n  <div className="card-body">\n    Content\n  </div>\n</div>' },
        { title: 'Modal Dialog', text: '<div className="modal">\n  <div className="modal-content">\n    <h2>Modal Title</h2>\n    <p>Modal content goes here</p>\n  </div>\n</div>' },
        { title: 'Navigation Bar', text: '<nav className="navbar">\n  <div className="nav-brand">Brand</div>\n  <ul className="nav-links">\n    <li><a href="#">Home</a></li>\n    <li><a href="#">About</a></li>\n  </ul>\n</nav>' },
        { title: 'Grid Layout', text: '<div className="grid">\n  <div className="grid-item">Item 1</div>\n  <div className="grid-item">Item 2</div>\n  <div className="grid-item">Item 3</div>\n</div>' },
        { title: 'Loading Spinner', text: '<div className="spinner">\n  <div className="spinner-circle"></div>\n</div>' }
      ],
      'productivity-templates': [
        { title: 'Meeting Notes', text: '# Meeting Notes - [Date]\n\n## Attendees\n- \n\n## Agenda\n1. \n\n## Action Items\n- [ ] \n\n## Next Steps\n' },
        { title: 'Email Template', text: 'Subject: \n\nHi [Name],\n\nI hope this email finds you well.\n\n[Content]\n\nBest regards,\n[Your Name]' },
        { title: 'Daily Standup', text: '## Daily Standup - [Date]\n\n### Yesterday\n- \n\n### Today\n- \n\n### Blockers\n- None' },
        { title: 'Project Status', text: '## Project Status Update\n\n**Project:** \n**Date:** \n**Status:** On Track / At Risk / Delayed\n\n### Completed\n- \n\n### In Progress\n- \n\n### Next Week\n- \n\n### Risks/Issues\n- ' },
        { title: 'Bug Report', text: '## Bug Report\n\n**Summary:** \n**Steps to Reproduce:**\n1. \n2. \n3. \n\n**Expected Result:** \n**Actual Result:** \n**Browser/OS:** \n**Priority:** High/Medium/Low' },
        { title: 'Code Review', text: '## Code Review Checklist\n\n- [ ] Code follows style guidelines\n- [ ] Functions are well-documented\n- [ ] Tests are included\n- [ ] No console.log statements\n- [ ] Error handling is adequate\n- [ ] Performance considerations addressed' },
        { title: 'Sprint Planning', text: '## Sprint Planning - Sprint [Number]\n\n**Sprint Goal:** \n**Duration:** [Start Date] - [End Date]\n\n### Stories for Sprint\n- [ ] \n\n### Team Capacity\n- \n\n### Definition of Done\n- [ ] Code reviewed\n- [ ] Tests pass\n- [ ] Documentation updated' },
        { title: 'Retrospective', text: '## Sprint Retrospective\n\n### What went well?\n- \n\n### What could be improved?\n- \n\n### Action items for next sprint\n- [ ] \n\n### Team sentiment: 😊 😐 😞' }
      ]
    };

    const templates = mockData[packId] || [];
    const selectedTemplates = templates.slice(0, count);
    
    return selectedTemplates.map((template, index) => ({
      id: `${packId}-snippet-${index + 1}`,
      title: template.title,
      text: template.text,
      createdAt: new Date().toISOString(),
      frequency: 0,
      folderId: undefined
    }));
  };

  // Load registry & imported ids on mount
  useEffect(() => {
    const loadPacks = async () => {
      try {
        // First try to load from cache
        const cacheResult = await chrome.storage.local.get(['packRegistry', 'importedPackIds']);
        
        if (cacheResult.packRegistry?.packs) {
          setPacks(cacheResult.packRegistry.packs);
          console.log('Loaded packs from cache:', cacheResult.packRegistry.packs);
        }
        
        if (cacheResult.importedPackIds) {
          setImportedPackIds(new Set(cacheResult.importedPackIds));
        }
        
        // Then refresh from network
        const resp = await new Promise<any>(resolve => {
          chrome.runtime.sendMessage({ action: 'getPackRegistry' }, resolve);
        });
        
        if (resp?.packRegistry?.packs) {
          console.log('Received updated packs from background:', resp.packRegistry.packs);
          setPacks(resp.packRegistry.packs);
        } else if (resp?.packRegistry) {
          console.log('Received packs in root of packRegistry:', resp.packRegistry);
          // Handle case where packs are directly in packRegistry
          setPacks(Array.isArray(resp.packRegistry) ? resp.packRegistry : []);
        } else {
          console.warn('No packs found in response:', resp);
        }
      } catch (error) {
        console.error('Error loading packs:', error);
      }
    };
    
    loadPacks();
  }, []);

  const handleImportPack = async (packId: string) => {
    const packMeta = packs.find((p) => p.id === packId);
    if (!packMeta) return;
    try {
      if (!packMeta.url) {
        alert('Pack missing URL.');
        return;
      }

      // Check if we're using mock data
      const storageResult = await chrome.storage.local.get('usingMockData');
      const usingMockData = storageResult.usingMockData || false;

      if (usingMockData) {
        // Generate mock snippets for testing
        const mockSnippets = generateMockSnippets(packId, packMeta.name, packMeta.snippetCount || 5);
        
        // Deduplicate against existing snippets (by id)
        const existingResult = await chrome.storage.local.get('snippets');
        const existingSnippets: Snippet[] = existingResult.snippets || [];
        const newSnippets: Snippet[] = [];
        for (const sn of mockSnippets) {
          if (!existingSnippets.some((s) => s.id === sn.id)) {
            newSnippets.push({
              ...sn,
              createdAt: new Date().toISOString(),
              frequency: 0,
            });
          }
        }
        if (newSnippets.length) {
          const combined = [...existingSnippets, ...newSnippets];
          await chrome.storage.local.set({ snippets: combined });
          setSnippets(combined);
        }
        
        // Mark as imported
        const nextSet = new Set([...importedPackIds, packId]);
        setImportedPackIds(nextSet);
        chrome.storage.local.set({ importedPackIds: Array.from(nextSet) });
        console.log(`[Clippy] Mock pack "${packMeta.name}" imported with ${newSnippets.length} new snippets`);
        return;
      }

      // Original implementation for real pack registry
      const url = packMeta.url.startsWith('http') ? packMeta.url : `${PACKS_ORIGIN}${packMeta.url}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const packJson = await res.json();
      if (!Array.isArray(packJson.snippets)) throw new Error('Invalid pack format');

      // Deduplicate against existing snippets (by id)
      const existingResult = await chrome.storage.local.get('snippets');
      const existingSnippets: Snippet[] = existingResult.snippets || [];
      const newSnippets: Snippet[] = [];
      for (const sn of packJson.snippets) {
        if (!existingSnippets.some((s) => s.id === sn.id)) {
          const text = (sn as any).text ?? (sn as any).content ?? '';
          newSnippets.push({
            ...sn,
            text, // ensure internal field is populated
            createdAt: new Date().toISOString(),
            frequency: 0,
          });
        }
      }
      if (newSnippets.length) {
        const combined = [...existingSnippets, ...newSnippets];
        await chrome.storage.local.set({ snippets: combined });
        setSnippets(combined);
      }
      // Mark as imported
      const nextSet = new Set([...importedPackIds, packId]);
      setImportedPackIds(nextSet);
      chrome.storage.local.set({ importedPackIds: Array.from(nextSet) });
    } catch (err) {
      console.error('Failed to import pack', err);
      alert('Failed to import pack. Check console for details.');
    }
  };

  // Text coming from context menu selection to pre-populate new snippet
  const [initialSnippetText, setInitialSnippetText] = useState<string | null>(null);
  const [folderError, setFolderError] = useState<string | null>(null); // For folder-specific errors

  // Refs
  const newFolderInputRef = useRef<HTMLInputElement>(null);


  // Load snippets and folders from storage
  const loadSnippetsAndFolders = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await chrome.storage.local.get(['snippets', 'folders', 'pendingSnippetText']);
      const loadedSnippets: Snippet[] = result.snippets || [];
      const loadedFolders: Folder[] = result.folders || [];

      setSnippets(loadedSnippets.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      setFolders(loadedFolders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));

      if (result.pendingSnippetText) {
        console.log('Pending snippet text found, opening new snippet modal:', result.pendingSnippetText);
        handleOpenNewSnippetModalWithText(result.pendingSnippetText); 
        await chrome.storage.local.remove('pendingSnippetText');
      }
      setError(null);
    } catch (e) {
      console.error('Error loading data:', e);
      setError('Failed to load data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSnippetsAndFolders();
    const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
      if (areaName === 'local' && (changes.snippets || changes.folders)) {
        loadSnippetsAndFolders();
      }
    };
    chrome.storage.onChanged.addListener(handleStorageChange);
    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, [loadSnippetsAndFolders]);

  // Handle folder renaming
  const handleFolderRename = async (folderId: string, newName: string) => {
    const trimmedName = newName.trim();
    if (!trimmedName) {
      setFolderError('Folder name cannot be empty.');
      return;
    }
    if (trimmedName.length > 50) {
      setFolderError('Folder name is too long (max 50 chars).');
      return;
    }
    setFolderError(null);
    try {
      let updatedFolders;
      
      // If this is a new folder (has a temporary ID), create a permanent ID
      if (folderId.startsWith('temp-')) {
        const newFolder = {
          id: `folder-${Date.now()}`,
          name: trimmedName,
          emoji: folders.find(f => f.id === folderId)?.emoji || '📁',
          createdAt: new Date().toISOString(),
        };
        // Remove the temp folder and add the new one
        updatedFolders = [
          newFolder,
          ...folders.filter(f => f.id !== folderId)
        ];
        // Update active filter ID if it was set to the temp ID
        if (activeFilterFolderId === folderId) {
          setActiveFilterFolderId(newFolder.id);
        }
      } else {
        // Just update the name of an existing folder
        updatedFolders = folders.map(f =>
          f.id === folderId ? { ...f, name: trimmedName } : f
        );
      }
      
      setFolders(updatedFolders);
      await chrome.storage.local.set({ folders: updatedFolders });
      
      // Reset editing state after successful save
      setEditingFolderId(null);
      setEditingFolderName('');
    } catch (error) {
      console.error('Failed to save folder:', error);
      setError('Failed to save folder. Please try again.');
    }
  };

  // Handle folder deletion
  const handleDeleteFolder = useCallback(async (folderId: string) => {
    try {
      const updatedSnippets = snippets.map(snippet =>
        snippet.folderId === folderId
          ? { ...snippet, folderId: undefined }
          : snippet
      );
      const updatedFolders = folders.filter(folder => folder.id !== folderId);

      await Promise.all([
        chrome.storage.local.set({ snippets: updatedSnippets }),
        chrome.storage.local.set({ folders: updatedFolders })
      ]);

      setSnippets(updatedSnippets);
      setFolders(updatedFolders);

      if (activeFilterFolderId === folderId) {
        setActiveFilterFolderId(null);
      }
      setContextMenuFolder(null);
    } catch (error) {
      console.error('Failed to delete folder:', error);
      setError('Failed to delete folder. Please try again.');
    }
  }, [snippets, folders, activeFilterFolderId]);

  // Handle emoji change for a folder
  const handleEmojiChange = async (folderId: string, newEmoji: string) => {
    try {
      const updatedFolders = folders.map(folder =>
        folder.id === folderId ? { ...folder, emoji: newEmoji } : folder
      );
      setFolders(updatedFolders);
      await chrome.storage.local.set({ folders: updatedFolders });
    } catch (error) {
      console.error('Failed to change folder emoji:', error);
      setError('Failed to change folder emoji. Please try again.');
    }
  };

  // Handle canceling folder creation/editing
  const handleCancelFolderEdit = useCallback((folderId: string | null) => {
    // If it's a new folder that was being created (has a temporary ID)
    if (folderId && folderId.startsWith('temp-')) {
      // Remove the temporary folder from the list
      const updatedFolders = folders.filter(f => f.id !== folderId);
      setFolders(updatedFolders);
      // Reset the active filter if it was set to this folder
      if (activeFilterFolderId === folderId) {
        setActiveFilterFolderId(null);
      }
    }
    // Reset editing state
    setEditingFolderId(null);
    setEditingFolderName('');
  }, [folders, activeFilterFolderId]);

  // Handle creation of a new folder
  const handleCreateNewFolder = useCallback(async () => {
    // Generate a temporary ID for the new folder
    const tempId = `temp-folder-${Date.now()}`;
    const newFolder: Folder = {
      id: tempId,
      name: '', // Start with empty name (user will type it)
      emoji: '📁', // Default emoji
      createdAt: new Date().toISOString(),
    };
    
    // Add the new folder to the list and set it as active
    const updatedFolders = [newFolder, ...folders];
    setFolders(updatedFolders);
    setActiveFilterFolderId(tempId);
    setEditingFolderId(tempId); // Start editing the new folder's name
    setEditingFolderName('');
  }, [folders]);

  // Get folder by ID helper function
  const getFolderById = (folderId?: string) => {
    if (!folderId) return null;
    return folders.find(folder => folder.id === folderId) || null;
  };

  // Calculate filtered snippets based on search term and active folder
  const { pinnedSnippets, otherSnippets } = React.useMemo(() => {
    const filtered = snippets.filter(snippet => {
      const matchesSearch = searchTerm === '' ||
        snippet.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        snippet.text.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFolder = activeFilterFolderId === null || snippet.folderId === activeFilterFolderId;
      return matchesSearch && matchesFolder;
    });

    const pinned = filtered
      .filter(s => s.isPinned)
      .sort((a, b) => new Date(b.pinnedAt!).getTime() - new Date(a.pinnedAt!).getTime());

    const others = filtered
      .filter(s => !s.isPinned)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return { pinnedSnippets: pinned, otherSnippets: others };
  }, [snippets, searchTerm, activeFilterFolderId]);

  
  
  // Handle copying snippet text to clipboard
  const handleCopyToClipboard = async (text: string, snippetId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSnippetId(snippetId);
      setTimeout(() => setCopiedSnippetId(null), 2000); // Reset after 2 seconds

      // Update usage stats
      const updatedSnippets = snippets.map(s => 
        s.id === snippetId 
          ? { ...s, lastUsed: new Date().toISOString(), frequency: (s.frequency || 0) + 1 }
          : s
      );
      setSnippets(updatedSnippets); // Optimistically update UI
      await chrome.storage.local.set({ snippets: updatedSnippets });

    } catch (err) {
      console.error('Failed to copy text: ', err);
      setError('Failed to copy snippet.');
    }
  };

  // Helper to open new snippet modal with pre-filled text (used from context menu)
  const handleOpenNewSnippetModalWithText = (text: string) => {
    setInitialSnippetText(text);
    setEditingSnippet(null);
    setIsSnippetModalOpen(true);
  };

  // Handler to open the snippet modal for a new snippet
  const handleOpenNewSnippetModal = () => {
    setEditingSnippet(null);
    setIsSnippetModalOpen(true);
  };

  // Handler to open the snippet modal for editing an existing snippet
  const handleOpenEditSnippetModal = (snippet: Snippet) => {
    setEditingSnippet(snippet);
    setIsSnippetModalOpen(true);
  };

  // Handler to close the snippet modal
  const handleCloseSnippetModal = () => {
    setIsSnippetModalOpen(false);
    setEditingSnippet(null);
    setInitialSnippetText(null);
  };

  // Handle saving snippet from modal (create or update)
  const handleSaveFromModal = async (snippetData: { title: string; text: string; folderId: string | null; id?: string }) => {
    let updatedSnippets;
    const finalFolderId = (snippetData.folderId === '' || snippetData.folderId === null) ? undefined : snippetData.folderId;

    if (snippetData.id) { // Editing existing snippet
      updatedSnippets = snippets.map(s =>
        s.id === snippetData.id
          ? { ...s, title: snippetData.title.trim(), text: snippetData.text.trim(), folderId: finalFolderId, createdAt: s.createdAt } // Preserve original createdAt
          : s
      );
    } else { // New snippet
      const newSnippet: Snippet = {
        id: `snippet-${Date.now()}`,
        title: snippetData.title.trim(),
        text: snippetData.text.trim(),
        folderId: finalFolderId,
        createdAt: new Date().toISOString(),
        frequency: 0,
      };
      updatedSnippets = [newSnippet, ...snippets];
    }
    
    const sortedSnippets = updatedSnippets.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    setSnippets(sortedSnippets);
    await chrome.storage.local.set({ snippets: sortedSnippets });
    handleCloseSnippetModal();
  };
  
  // Handle snippet deletion
  const handleDeleteSnippet = async (snippetId: string) => {
    if (!confirm('Are you sure you want to delete this snippet?')) {
      return;
    }
    const updatedSnippets = snippets.filter(s => s.id !== snippetId);
    setSnippets(updatedSnippets);
    await chrome.storage.local.set({ snippets: updatedSnippets });
  };

  // Handle pinning a snippet
  const handlePinSnippet = async (snippetId: string) => {
    try {
      const updatedSnippets = snippets.map(s =>
        s.id === snippetId
          ? { ...s, isPinned: !s.isPinned, pinnedAt: !s.isPinned ? new Date().toISOString() : undefined }
          : s
      );
      setSnippets(updatedSnippets); // Optimistic update
      await chrome.storage.local.set({ snippets: updatedSnippets });
    } catch (error) {
      console.error('Failed to pin snippet:', error);
      setError('Failed to update pin status. Please try again.');
      // Optional: Revert optimistic update on error
      loadSnippetsAndFolders();
    }
  };

  // Loading and error states
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background text-slate-100">
        Loading...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-background text-red-400 p-4">
        <p className="mb-4">{error}</p>
        <Button onClick={loadSnippetsAndFolders}>Try Again</Button>
      </div>
    );
  }

  return (
    <>
      <div className="h-screen bg-background text-slate-100 flex flex-col">
                <FolderTabs
          folders={folders}
          activeFilterFolderId={activeFilterFolderId}
          setActiveFilterFolderId={setActiveFilterFolderId}
          onDeleteFolder={handleDeleteFolder}
          onRenameFolder={handleFolderRename}
          onEmojiChange={handleEmojiChange}
          onAddNewFolder={handleCreateNewFolder}
          isEditingOrCreatingFolder={!!editingFolderId}
          editingFolderId={editingFolderId}
          onCancelRename={handleCancelFolderEdit}
        />
        <main className="flex-1 p-4 overflow-auto flex flex-col pt-2">
        
          <div className="flex justify-between items-center mb-4">
            <BankToggle activeTab={activeTab} setActiveTab={setActiveTab} />
            
            <GlowingButton onClick={handleOpenNewSnippetModal}>
              + Add Snippet
            </GlowingButton>
          </div>

          {activeTab !== 'bank' && (
            <div className="mb-4">
            <CustomTooltip content="Search through your snippets" side="bottom">
              <Input
                type="search"
                placeholder="Search snippets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-800 border-slate-700 placeholder-slate-500 text-slate-100"
              />
            </CustomTooltip>
           </div>
          )}

          {pinnedSnippets.length === 0 && otherSnippets.length === 0 && !isLoading && (
            <div className="text-center text-slate-400 py-8 flex-grow flex flex-col items-center justify-center">
              <p className="text-lg">No snippets found.</p>
              {activeFilterFolderId && folders.find(f => f.id === activeFilterFolderId) && (
                <p className="text-sm">No snippets in &quot;{folders.find(f => f.id === activeFilterFolderId)?.name}&quot;.</p>
              )}
              {searchTerm && (
                <p className="text-sm">Try a different search term.</p>
              )}
              {!activeFilterFolderId && !searchTerm && (
                 <Button onClick={handleOpenNewSnippetModal} className="mt-4">
                  Create your first snippet
                </Button>
              )}
            </div>
          )}

          <ScrollArea className="flex-grow">
            <div className="space-y-4">
              {/* Pinned Section */}
              {activeTab !== 'bank' && pinnedSnippets.length > 0 && (
                <section>
                  <h3 className="text-sm font-semibold text-yellow-400 uppercase tracking-wider mb-2">Pinned</h3>
                  <div className="space-y-3">
                    {pinnedSnippets.map((snippet) => (
                      <SnippetItem
                        key={snippet.id}
                        snippet={snippet}
                        copiedSnippetId={copiedSnippetId}
                        onCopyToClipboard={handleCopyToClipboard}
                        onOpenEditModal={handleOpenEditSnippetModal}
                        onPinSnippet={handlePinSnippet}
                        onDeleteSnippet={handleDeleteSnippet}
                        getFolderById={getFolderById}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* Bank view */}
          {activeTab === 'bank' && (
            <BankView packs={packs} onImportPack={handleImportPack} importedPackIds={importedPackIds} />
          )}

          {/* Other Snippets Section */}
              {otherSnippets.length > 0 && (
                <section>
                  {pinnedSnippets.length > 0 && <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2 pt-2">All Snippets</h3>}
                  <div className="space-y-3">
                    {otherSnippets.map((snippet) => (
                      <SnippetItem
                        key={snippet.id}
                        snippet={snippet}
                        copiedSnippetId={copiedSnippetId}
                        onCopyToClipboard={handleCopyToClipboard}
                        onOpenEditModal={handleOpenEditSnippetModal}
                        onPinSnippet={handlePinSnippet}
                        onDeleteSnippet={handleDeleteSnippet}
                        getFolderById={getFolderById}
                      />
                    ))}
                  </div>
                </section>
              )}
            </div>
          </ScrollArea>
        </main>
      </div>

      {isSnippetModalOpen && (
        <SnippetFormModal
          isOpen={isSnippetModalOpen}
          onClose={handleCloseSnippetModal}
          onSave={handleSaveFromModal}
          folders={folders}
          snippetToEdit={editingSnippet}
          initialText={!editingSnippet ? initialSnippetText ?? undefined : undefined}
        />
      )}
    </>
  );
};

export default App;