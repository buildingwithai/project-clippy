import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Edit3, Copy, Check, Plus, Trash2, Pencil } from 'lucide-react';
// import { FolderPane } from './components/FolderPane'; // No longer used directly here
import { FolderTabs } from './components/FolderTabs'; // Import FolderTabs
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { Snippet, Folder } from '../utils/types';
import { SnippetFormModal } from './components/SnippetFormModal';

const App: React.FC = () => {
  // State for snippets and folders
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState(''); // For snippet search
  const [activeFilterFolderId, setActiveFilterFolderId] = useState<string | null>(null);

  // Folder editing state
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState('');
  const [contextMenuFolder, setContextMenuFolder] = useState<Folder | null>(null); // Corrected type

  // Snippet modal state
  const [isSnippetModalOpen, setIsSnippetModalOpen] = useState(false);
  const [editingSnippet, setEditingSnippet] = useState<Snippet | null>(null);
  const [copiedSnippetId, setCopiedSnippetId] = useState<string | null>(null);

  // UI state
  const [isFoldersCollapsed, setIsFoldersCollapsed] = useState(false);
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
        // TODO: Pass pendingSnippetText to the modal if it supports initial values
        handleOpenNewSnippetModal(); 
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
      setFolderError('Folder name cannot be empty.'); // Consider handling this error display within FolderTab
      // You might want to throw an error here for FolderTab to catch and display
      return;
    }
    if (trimmedName.length > 50) {
      setFolderError('Folder name is too long (max 50 chars).'); // Consider handling this error display within FolderTab
      // You might want to throw an error here for FolderTab to catch and display
      return;
    }
    setFolderError(null); // Clear app-level error if one was set by this flow
    try {
      const updatedFolders = folders.map(f =>
        f.id === folderId ? { ...f, name: trimmedName } : f
      );
      setFolders(updatedFolders);
      await chrome.storage.local.set({ folders: updatedFolders });
    } catch (error) {
      console.error('Failed to rename folder:', error);
      setError('Failed to rename folder. Please try again.'); // Set general error for App.tsx to display if needed
    }
  };

  // Handle folder deletion
  const handleDeleteFolder = useCallback(async (folderId: string) => {
    if (!confirm('Are you sure you want to delete this folder? Snippets in this folder will become uncategorized.')) {
      return;
    }
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

  // Handle creation of a new folder
  const handleCreateNewFolder = useCallback(async () => {
    // Basic validation for folder name length or uniqueness can be added here if needed
    const newFolder: Folder = {
      id: `folder-${Date.now()}`,
      name: `New Folder ${folders.length + 1}`, // Default name
      emoji: '📁', // Default emoji
      createdAt: new Date().toISOString(),
    };
    const updatedFolders = [newFolder, ...folders].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    setFolders(updatedFolders);
    await chrome.storage.local.set({ folders: updatedFolders });
    setActiveFilterFolderId(newFolder.id); // Set new folder as active
    setEditingFolderId(newFolder.id); // Optionally start editing the new folder's name
    setEditingFolderName(newFolder.name);
  }, [folders]);

  // Get folder by ID helper function
  const getFolderById = (folderId?: string) => {
    if (!folderId) return null;
    return folders.find(folder => folder.id === folderId) || null;
  };

  // Calculate filtered snippets based on search term and active folder
  const finalFilteredSnippets = React.useMemo(() => {
    return snippets.filter(snippet => {
      const matchesSearch = searchTerm === '' ||
        snippet.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        snippet.text.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFolder = activeFilterFolderId === null || snippet.folderId === activeFilterFolderId;
      return matchesSearch && matchesFolder;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [snippets, searchTerm, activeFilterFolderId]);

  // Get current display title for the snippet list
  const currentDisplayTitle = React.useMemo(() => {
    if (activeFilterFolderId === null) return 'All Snippets';
    const folder = getFolderById(activeFilterFolderId);
    return folder ? folder.name : 'Snippets';
  }, [activeFilterFolderId, folders]);
  
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
    <TooltipProvider>
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
          onCancelRename={() => setEditingFolderId(null)}
        />
        <main className="flex-1 p-4 overflow-auto flex flex-col pt-2"> {/* Added pt-2 for spacing below tabs */}
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-sky-400">{currentDisplayTitle}</h2>
            <Button onClick={handleOpenNewSnippetModal} size="sm">
              <Plus className="mr-2 h-4 w-4" /> New Snippet
            </Button>
          </div>

          <div className="mb-4">
            <Input
              type="search"
              placeholder="Search snippets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-800 border-slate-700 placeholder-slate-500 text-slate-100"
            />
          </div>

          {finalFilteredSnippets.length === 0 && !isLoading && (
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
            <div className="space-y-3">
              {finalFilteredSnippets.map((snippet) => (
                <div key={snippet.id} className="bg-slate-800 p-3 rounded-lg shadow hover:shadow-md hover:shadow-sky-600/30 transition-shadow">
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="text-md font-semibold text-sky-400">{snippet.title || 'Untitled Snippet'}</h3>
                    <div className="flex items-center space-x-1">
                       <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-sky-400" onClick={() => handleOpenEditSnippetModal(snippet)}>
                            <Edit3 size={14} />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent><p>Edit Snippet</p></TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                           <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-sky-400" onClick={() => handleCopyToClipboard(snippet.text, snippet.id)}>
                            {copiedSnippetId === snippet.id ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent><p>{copiedSnippetId === snippet.id ? 'Copied!' : 'Copy Snippet'}</p></TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-400" onClick={() => handleDeleteSnippet(snippet.id)}>
                            <Trash2 size={14} />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent><p>Delete Snippet</p></TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                  <div className="text-xs text-slate-500 mb-2 flex items-center space-x-2">
                    <span>Created: {new Date(snippet.createdAt).toLocaleDateString()}</span>
                    {snippet.folderId && getFolderById(snippet.folderId) && (
                      <span className="flex items-center">
                        | Folder: {getFolderById(snippet.folderId)?.emoji} {getFolderById(snippet.folderId)?.name}
                      </span>
                    )}
                    {snippet.frequency && snippet.frequency > 0 ? <span>| Used: {snippet.frequency} times</span> : ''}
                    {snippet.lastUsed ? <span>| Last Used: {new Date(snippet.lastUsed).toLocaleDateString()}</span> : ''}
                  </div>
                  <pre className="text-sm text-slate-300 bg-slate-900/50 p-2.5 rounded-md whitespace-pre-wrap break-all max-h-32 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-800">{snippet.text}</pre>
                </div>
              ))}
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
        />
      )}
    </TooltipProvider>
  );
};

export default App;