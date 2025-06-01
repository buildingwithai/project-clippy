import React, { useState, useEffect, useCallback, useRef } from 'react';

import { Edit3, Copy, Check, Plus, Folder as FolderIcon, ListFilter, Search, Trash2 } from 'lucide-react';
import { AnimatedTooltip } from '@/components/ui/animated-tooltip';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
// Textarea will be used in the modal (Phase 2)
// import { Textarea } from '@/components/ui/textarea'; 
import { ScrollArea } from '@/components/ui/scroll-area';
// Select will be used in the modal (Phase 2)
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'; 
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

import type { Snippet, Folder } from '../utils/types';
import { SnippetFormModal } from './components/SnippetFormModal';
// import './App.css'; // File not found, commented out for build

const App: React.FC = () => {
  // ...existing state...
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState('');

  // Inline rename handler
  const handleFolderRename = async (folderId: string) => {
    const trimmed = editingFolderName.trim();
    if (!trimmed) {
      setEditingFolderId(null);
      setEditingFolderName('');
      return;
    }
    const updatedFolders = folders.map(f =>
      f.id === folderId ? { ...f, name: trimmed } : f
    );
    setFolders(updatedFolders);
    await chrome.storage.local.set({ folders: updatedFolders });
    setEditingFolderId(null);
    setEditingFolderName('');
  };
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  // Collapsible folder pane state
  const [isFoldersCollapsed, setIsFoldersCollapsed] = useState(false);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // For Folder Management (in left pane)
  const [newFolderName, setNewFolderName] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const newFolderInputRef = useRef<HTMLInputElement>(null);

  // For Filtering & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilterFolderId, setActiveFilterFolderId] = useState<string | null>(null); 

  const [copiedSnippetId, setCopiedSnippetId] = useState<string | null>(null);

  // State for managing the Snippet Form Modal
  const [isSnippetModalOpen, setIsSnippetModalOpen] = useState(false);
  const [editingSnippet, setEditingSnippet] = useState<Snippet | null>(null);

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
        handleOpenNewSnippetModal(); // This will open a blank modal
        // TODO: Enhance modal to accept initial text for new snippets from pendingSnippetText
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

  useEffect(() => {
    if (isCreatingFolder && newFolderInputRef.current) {
      newFolderInputRef.current.focus();
    }
  }, [isCreatingFolder]);

  const handleSaveFromModal = async (snippetData: { title: string; text: string; folderId: string | null; id?: string }) => {
    console.log('Attempting to save snippet (logic to be updated in Phase 2):', snippetData);
    
    let updatedSnippets;
    const finalFolderId = snippetData.folderId === null ? undefined : snippetData.folderId;
    if (snippetData.id) { // Editing existing snippet
      updatedSnippets = snippets.map(s =>
        s.id === snippetData.id
          ? { ...s, title: snippetData.title.trim(), text: snippetData.text.trim(), folderId: finalFolderId, createdAt: new Date().toISOString() } 
          : s
      );
    } else { // New snippet
      const newSnippet: Snippet = {
        id: `snippet-${Date.now()}`,
        title: snippetData.title.trim(),
        text: snippetData.text.trim(),
        folderId: finalFolderId,
        createdAt: new Date().toISOString(),
        tags: [], // Default tags, can be expanded later
        lastUsed: new Date().toISOString(),
        frequency: 0,
      };
      updatedSnippets = [newSnippet, ...snippets];
    }
    
    updatedSnippets.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    setSnippets(updatedSnippets);
    await chrome.storage.local.set({ snippets: updatedSnippets });
    setError(null);
    // Modal closes itself via its onSave -> onClose callback
  };

  const handleOpenNewSnippetModal = () => {
    setEditingSnippet(null);
    setIsSnippetModalOpen(true);
  };

  const handleEditSnippet = (snippet: Snippet) => {
    setEditingSnippet(snippet);
    setIsSnippetModalOpen(true);
  };

  const handleDeleteSnippet = async (snippetId: string) => {
    const updatedSnippets = snippets.filter(s => s.id !== snippetId);
    setSnippets(updatedSnippets);
    await chrome.storage.local.set({ snippets: updatedSnippets });
  };

  const handleCopyToClipboard = async (snippet: Snippet) => {
    try {
      await navigator.clipboard.writeText(snippet.text);
      setCopiedSnippetId(snippet.id);
      setTimeout(() => setCopiedSnippetId(null), 2000);
      const updatedSnippets = snippets.map(s => 
        s.id === snippet.id 
          ? { ...s, lastUsed: new Date().toISOString(), frequency: (s.frequency || 0) + 1 }
          : s
      );
      // Optimistically update UI, then save to storage
      setSnippets(updatedSnippets.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      await chrome.storage.local.set({ snippets: updatedSnippets });
    } catch (err) {
      console.error('Failed to copy text: ', err);
      setError('Failed to copy snippet.');
    }
  };

  const handleCreateFolder = async () => {
    const trimmedName = newFolderName.trim();
    if (!trimmedName) {
      setIsCreatingFolder(false);
      setNewFolderName('');
      return;
    }
    const newFolderData: Folder = {
      id: `folder-${Date.now()}`,
      name: trimmedName,
      emoji: '📁',
      createdAt: new Date().toISOString(),
    };
    const updatedFolders = [newFolderData, ...folders].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    setFolders(updatedFolders);
    await chrome.storage.local.set({ folders: updatedFolders });
    setNewFolderName('');
    setIsCreatingFolder(false);
  };

  const handleNewFolderKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') handleCreateFolder();
    if (event.key === 'Escape') {
      setIsCreatingFolder(false);
      setNewFolderName('');
    }
  };
  const handleNewFolderBlur = () => {
    if (newFolderName.trim()) handleCreateFolder();
    else {
      setIsCreatingFolder(false);
      setNewFolderName('');
    }
  };

  const handleDeleteFolder = async (folderId: string) => {
    // Basic: Unassign snippets from this folder. More advanced logic (prompt user) can be added later.
    const updatedSnippets = snippets.map(s => s.folderId === folderId ? { ...s, folderId: undefined } : s);
    setSnippets(updatedSnippets);
    await chrome.storage.local.set({ snippets: updatedSnippets });

    const updatedFolders = folders.filter(f => f.id !== folderId);
    setFolders(updatedFolders);
    await chrome.storage.local.set({ folders: updatedFolders });

    if (activeFilterFolderId === folderId) setActiveFilterFolderId(null);
  };

  const finalFilteredSnippets = snippets.filter(snippet => {
    const matchesFolder = activeFilterFolderId ? snippet.folderId === activeFilterFolderId : true;
    const searchTermLower = searchTerm.toLowerCase();
    const matchesSearch = searchTerm
      ? (snippet.title?.toLowerCase().includes(searchTermLower) || 
         snippet.text.toLowerCase().includes(searchTermLower) ||
         (snippet.folderId && folders.find(f=>f.id === snippet.folderId)?.name.toLowerCase().includes(searchTermLower)))
      : true;
    return matchesFolder && matchesSearch;
  });

  const getFolderById = (folderId: string | undefined): Folder | undefined => folders.find(f => f.id === folderId);

  if (isLoading) return <div className="w-full h-full flex items-center justify-center"><p>Loading Clippy...</p></div>;
  if (error) return <div className="w-full h-full flex items-center justify-center"><p className="text-red-500">{error}</p></div>;
  
  const currentDisplayTitle = activeFilterFolderId 
    ? folders.find(f => f.id === activeFilterFolderId)?.name || 'Unknown Folder'
    : 'All Snippets';

  return (
    <TooltipProvider>
      <div className="w-full h-full flex flex-col p-4 bg-background text-foreground font-sans overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between gap-2 mb-3 px-2 py-1 bg-transparent">
          {/* Logo */}
          <div className="flex items-center gap-2 min-w-[80px]">
            <span className="text-xl font-bold text-sky-400">📎</span>
            <span className="text-lg font-semibold text-sky-400 tracking-tight">Clippy</span>
          </div>
          {/* Search Bar */}
          <div className="flex-1 flex justify-center">
            <Input
              type="search"
              placeholder="Search snippets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full max-w-[180px] h-8 text-sm bg-slate-800 text-slate-100 placeholder:text-slate-400 rounded-md shadow-none border border-slate-700 focus-visible:ring-2 focus-visible:ring-sky-500 transition-all mx-2"
              style={{ minWidth: 0 }}
            />
          </div>
          {/* New Snippet Button */}
          <Button onClick={handleOpenNewSnippetModal} size="icon" className="bg-sky-400 hover:bg-sky-500 text-white rounded-full shadow-sm ml-2" aria-label="New Snippet">
            <Plus className="w-5 h-5" />
          </Button>
        </header>

        {error && <p className="text-destructive text-center p-2">Error: {error}</p>}

        <SnippetFormModal
          isOpen={isSnippetModalOpen}
          onClose={() => setIsSnippetModalOpen(false)}
          onSave={handleSaveFromModal}
          snippetToEdit={editingSnippet}
          folders={folders}
        />

        {/* Main Content Area */}
        <div className="flex flex-1 min-h-0 overflow-hidden gap-2">
          {/* Left Pane (Folders) */}
          <aside className={`flex flex-col border-r border-slate-700 shrink-0 transition-all duration-200 ease-in-out bg-background ${isFoldersCollapsed ? 'w-[44px] items-center p-0' : 'w-[140px] space-y-1 pr-1'}`}>
            <div className={`flex items-center mb-1 ${isFoldersCollapsed ? 'justify-center' : 'justify-between'}`}>
              <h2 className={`text-base font-semibold tracking-tight ${isFoldersCollapsed ? 'sr-only' : ''}`}>Folders</h2>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={() => setIsFoldersCollapsed(v => !v)} className="h-7 w-7">
                    {isFoldersCollapsed ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent><p>{isFoldersCollapsed ? 'Expand Folders' : 'Collapse Folders'}</p></TooltipContent>
              </Tooltip>
            </div>
            <div className="flex-1 flex flex-col overflow-y-auto">
               <ScrollArea className="flex-grow pr-1">
                 <Button 
                   variant={activeFilterFolderId === null ? 'secondary' : 'ghost'}
                   onClick={() => setActiveFilterFolderId(null)}
                   className={`w-full justify-center ${isFoldersCollapsed ? 'h-10 my-1' : 'justify-start text-sm h-8 mb-0.5'}`}
                 >
                   {isFoldersCollapsed ? <span title="All Snippets">🔎</span> : (<>All Snippets</>)}
                 </Button>
                 <AnimatedTooltip
                   items={folders.map(folder => ({
                     id: folder.id,
                     name: folder.name,
                     emoji: folder.emoji || '📁',
                   }))}
                   className="flex flex-col gap-1"
                   activeId={activeFilterFolderId}
                   editingId={editingFolderId}
                   editingValue={editingFolderName}
                   onClick={item => setActiveFilterFolderId(item.id)}
                   onDoubleClick={item => {
                     setEditingFolderId(item.id);
                     setEditingFolderName(item.name);
                   }}
                   onContextMenu={(item, e) => {
                     e.preventDefault();
                     setEditingFolderId(item.id);
                     setEditingFolderName(item.name);
                   }}
                   onRenameChange={setEditingFolderName}
                   onRenameSubmit={item => handleFolderRename(item.id)}
                 />
                 {folders.length === 0 && !isCreatingFolder && (
                   <p className="text-xs text-muted-foreground p-2 text-center">No folders yet. Click '+' below to create.</p>
                 )}
               </ScrollArea>
             </div>
             <div className="flex flex-col items-center py-2">
               <Tooltip>
                 <TooltipTrigger asChild>
                   <Button variant="ghost" size="icon" onClick={() => {
                     const newFolder = {
                       id: `folder-${Date.now()}`,
                       name: `New Folder ${folders.length + 1}`,
                       emoji: '📁',
                       createdAt: new Date().toISOString(),
                     };
                     const updatedFolders = [newFolder, ...folders];
                     setFolders(updatedFolders);
                     chrome.storage.local.set({ folders: updatedFolders });
                   }} className="h-8 w-8 text-sky-400 hover:bg-slate-800 hover:text-sky-300">
                     <span className="text-xl">➕</span>
                   </Button>
                 </TooltipTrigger>
                 <TooltipContent><p>Create New Folder</p></TooltipContent>
               </Tooltip>
             </div>
          </aside>

          {/* Right Pane (Snippets) */}
          <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
            <div className="flex justify-between items-center mb-2 shrink-0">
                <h2 className="text-base font-semibold truncate pr-2" title={currentDisplayTitle}>
                    {currentDisplayTitle} ({finalFilteredSnippets.length})
                </h2>
                {/* Placeholder for future sort/filter options for snippets */}
                {/* <Button variant="outline" size="sm"><Settings2 className="h-4 w-4 mr-2"/>Display Options</Button> */}
            </div>

            {finalFilteredSnippets.length === 0 && (
              <div className="flex-grow flex flex-col items-center justify-center text-center text-muted-foreground p-4">
                <Search className="h-12 w-12 mb-4 opacity-50" />
                <p className="text-lg font-medium mb-1">No Snippets Found</p>
                {searchTerm && <p className="text-sm">Try adjusting your search or folder selection.</p>}
                {!searchTerm && activeFilterFolderId && <p className="text-sm">This folder is empty.</p>}
                {!searchTerm && !activeFilterFolderId && <p className="text-sm">Click &quot;New Snippet&quot; to add your first one!</p>}
              </div>
            )}
            {finalFilteredSnippets.length > 0 && (
                <ScrollArea className="flex-grow border rounded-lg p-0.5 bg-muted/10">
                <div className="flex flex-col gap-2 p-1">
                {finalFilteredSnippets.map((snippet) => {
                    const folder = getFolderById(snippet.folderId);
                    return (
                    <div key={snippet.id} className="rounded-lg px-3 py-2 bg-slate-900 border border-slate-700 flex flex-col cursor-pointer">
                        <div className="flex justify-between items-center gap-2 mb-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <h3 className="text-base font-semibold truncate pr-2 cursor-default flex-grow text-slate-100" title={snippet.title || 'Untitled Snippet'}>
                                {snippet.title || <span className="italic text-slate-400">Untitled Snippet</span>}
                            </h3>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" align="start" className="max-w-[300px] bg-white text-slate-800 p-2 rounded shadow text-xs whitespace-pre-wrap break-words z-50 border border-slate-200">
                            <p>{snippet.text}</p>
                          </TooltipContent>
                        </Tooltip>
                        <div className="flex space-x-1 shrink-0 ml-2">
                            <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" onClick={() => handleEditSnippet(snippet)} className="h-7 w-7">
                                <Edit3 className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>Edit Snippet</p></TooltipContent>
                            </Tooltip>
                            <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" onClick={() => handleCopyToClipboard(snippet)} className="h-7 w-7">
                                {copiedSnippetId === snippet.id ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>{copiedSnippetId === snippet.id ? 'Copied!' : 'Copy to Clipboard'}</p></TooltipContent>
                            </Tooltip>
                            <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" onClick={() => handleDeleteSnippet(snippet.id)} className="h-7 w-7">
                                <Trash2 className="h-4 w-4 text-destructive hover:text-destructive/80" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>Delete Snippet</p></TooltipContent>
                            </Tooltip>
                        </div>
                        </div>

                        {folder && (
                        <div className="mt-2 pt-2 border-t border-border/50">
                            <span className="text-xs text-muted-foreground inline-flex items-center cursor-default" title={`Folder: ${folder.name}`}>
                            <FolderIcon className="h-3.5 w-3.5 mr-1.5 opacity-70" /> {folder.name}
                            </span>
                        </div>
                        )}
                    </div>
                    );
                })}
                </div>
                </ScrollArea>
            )}
          </main>
        </div>
        
        {/* TODO: Phase 2 - SnippetFormModal will be rendered here conditionally */}
        {/* e.g., <SnippetFormModal isOpen={isSnippetModalOpen} onOpenChange={setIsSnippetModalOpen} snippetData={editingSnippet} onSave={handleSaveSnippet} folders={folders} /> */}

      </div>
    </TooltipProvider>
  );
};

export default App;