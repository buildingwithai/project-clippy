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
        <main className="flex-1 p-4 overflow-auto flex flex-col pt-2"> {/* Added pt-2 for spacing below tabs */}
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-sky-400">{currentDisplayTitle}</h2>
            <GlowingButton onClick={handleOpenNewSnippetModal}>
              + Add Snippet
            </GlowingButton>
          </div>

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
              {pinnedSnippets.length > 0 && (
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
        />
      )}
    </>
  );
};

export default App;