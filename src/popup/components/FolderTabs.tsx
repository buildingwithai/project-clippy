import React, { useCallback, useRef, useState, useEffect } from 'react';
import { LayoutGroup, motion, AnimatePresence } from 'framer-motion';
import type { Folder } from '../../utils/types';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { List, FolderPlus, Settings } from 'lucide-react';
import { CustomTooltip } from '@/components/ui/custom-tooltip';
import { FolderTab } from './FolderTab';

interface FolderTabsProps {
  folders: Folder[];
  activeFilterFolderId: string | null;
  setActiveFilterFolderId: (id: string | null) => void;
  onDeleteFolder: (folderId: string) => Promise<void>;
  onRenameFolder: (folderId: string, newName: string) => Promise<void>;
  onEmojiChange: (folderId: string, emoji: string) => Promise<void>;
  onAddNewFolder: () => void; // For initiating new folder creation
  isEditingOrCreatingFolder: boolean; // To disable add button during edits
  editingFolderId: string | null; // ID of the folder being edited/created
  onCancelRename: (folderId: string | null) => void; // Handler for cancelling edit/creation
}

export const FolderTabs: React.FC<FolderTabsProps> = ({
  folders,
  activeFilterFolderId,
  setActiveFilterFolderId,
  onDeleteFolder,
  onRenameFolder,
  onEmojiChange,
  onAddNewFolder,
  isEditingOrCreatingFolder,
  editingFolderId,
  onCancelRename,
}) => {
  const [showSettingsTooltip, setShowSettingsTooltip] = useState(false);

  useEffect(() => {
    const checkFirstRun = async () => {
      const { hasSeenSettingsTooltip } = await chrome.storage.local.get('hasSeenSettingsTooltip');
      if (!hasSeenSettingsTooltip) {
        setShowSettingsTooltip(true);
      }
    };
    checkFirstRun();
  }, []);

  const handleSettingsInteraction = () => {
    if (showSettingsTooltip) {
      setShowSettingsTooltip(false);
      chrome.storage.local.set({ hasSeenSettingsTooltip: true });
    }
    chrome.runtime.openOptionsPage();
  };

  const handleDeleteFolder = useCallback(async (folderId: string) => {
    await onDeleteFolder(folderId);
    // If the deleted folder was active, reset to show all snippets
    if (activeFilterFolderId === folderId) {
      setActiveFilterFolderId(null);
    }
  }, [activeFilterFolderId, onDeleteFolder, setActiveFilterFolderId]);

  // Removed dock effect hook to eliminate upward motion

  return (
    <div 
      className="relative flex items-center h-12 min-h-[3rem] px-2 py-1 bg-slate-800 border-b border-slate-700/70 overflow-hidden"
    >
      {/* Scrollable container for tabs */}
      <div 
        className="flex-grow flex items-center space-x-0.5 overflow-x-auto pr-10"
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: '#4B5563 #1F2937', // slate-600 / slate-800
          maskImage: 'linear-gradient(to right, black calc(100% - 40px), transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to right, black calc(100% - 40px), transparent 100%)',
        }}
      >
        {/* Custom scrollbar styles for WebKit browsers */}
        <style dangerouslySetInnerHTML={{
          __html: `
            .folder-tabs-scroll::-webkit-scrollbar {
              height: 3px;
            }
            .folder-tabs-scroll::-webkit-scrollbar-track {
              background: #1F2937; /* slate-800 */
            }
            .folder-tabs-scroll::-webkit-scrollbar-thumb {
              background-color: #4B5563; /* slate-600 */
              border-radius: 3px;
            }
          `
        }} />
        <CustomTooltip content="Show all snippets" side="bottom">
  <Button
    variant="ghost"
    size="sm"
    className={cn(
      'p-1.5 h-7 w-7 flex items-center justify-center rounded-md',
      activeFilterFolderId === null
        ? 'bg-sky-700 text-sky-100 hover:bg-sky-600'
        : 'text-slate-300 hover:bg-slate-700 hover:text-slate-100'
    )}
    onClick={() => setActiveFilterFolderId(null)}
  >
    <List size={14} className="shrink-0" />
  </Button>
</CustomTooltip>

        <LayoutGroup>
          {folders.map((folder) => (
            <motion.div
              key={folder.id}
              className="folder-tab flex items-center mx-0 p-0.5"
            >
              <FolderTab
                folder={folder}
                isActive={activeFilterFolderId === folder.id}
                onSelect={() => setActiveFilterFolderId(folder.id)}
                onDelete={handleDeleteFolder}
                onRename={onRenameFolder}
                onEmojiChange={onEmojiChange}
                isInitiallyEditing={folder.id === editingFolderId}
                onCancelRename={() => onCancelRename(editingFolderId)}
              />
            </motion.div>
          ))}

          {/* New Folder Icon - Inline with folders */}
          <motion.div
            className="folder-tab flex items-center mx-0 p-0.5"
            initial={{ opacity: 0.6, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2 }}
          >
            <CustomTooltip content={folders.length === 0 ? "📁+ Create first folder" : "New folder"} side="bottom">
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  'p-1.5 h-7 w-auto px-2 flex items-center justify-center rounded-md transition-all duration-200',
                  'text-slate-400 hover:text-slate-100 hover:bg-slate-700',
                  'border border-slate-600/30 hover:border-slate-500/50',
                  'opacity-60 hover:opacity-100'
                )}
                onClick={onAddNewFolder}
                disabled={isEditingOrCreatingFolder}
              >
                {folders.length === 0 ? (
                  <span className="flex items-center space-x-1 text-xs">
                    <span>📁</span>
                    <span>+</span>
                  </span>
                ) : (
                  <FolderPlus size={14} />
                )}
              </Button>
            </CustomTooltip>
          </motion.div>
        </LayoutGroup>
      </div>
      {/* Settings button - only system action remains in corner */}
      <div className="absolute right-2 top-1/2 -translate-y-1/2 z-10">
        <CustomTooltip content={showSettingsTooltip ? "Manage hotkeys and settings here!" : "Settings"} side="bottom">
          <button onClick={handleSettingsInteraction} className="p-1.5 text-slate-400 hover:text-white transition-colors rounded-md hover:bg-slate-700/50">
            <Settings size={16} />
          </button>
        </CustomTooltip>
      </div>
    </div>
  );
};
