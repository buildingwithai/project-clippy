import React, { useCallback, useRef } from 'react';
import { LayoutGroup, motion, AnimatePresence } from 'framer-motion';
import type { Folder } from '../../utils/types';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { List } from 'lucide-react';
import { CustomTooltip } from '@/components/ui/custom-tooltip';
import { FolderTab } from './FolderTab';
import { NewFolderButton } from './NewFolderButton';
import { useDockEffect } from '@/hooks/useDockEffect';

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
  const handleDeleteFolder = useCallback(async (folderId: string) => {
    await onDeleteFolder(folderId);
    // If the deleted folder was active, reset to show all snippets
    if (activeFilterFolderId === folderId) {
      setActiveFilterFolderId(null);
    }
  }, [activeFilterFolderId, onDeleteFolder, setActiveFilterFolderId]);

  // Use the dock effect hook
  const dockRef = useRef<HTMLDivElement>(null);
  const { scales, getItemRef } = useDockEffect({
    itemCount: folders.length,
    baseSize: 32, // Base size of the folder icons
    maxScale: 1.4, // Maximum scale on hover
    effectWidth: 200, // Width of the hover effect area
  });

  return (
    <div 
      ref={dockRef}
      className="relative flex items-center h-12 min-h-[3rem] px-2 py-1 bg-slate-800 border-b border-slate-700/70 overflow-hidden"
    >
      {/* Scrollable container for tabs */}
      <div 
        className="flex-grow flex items-center space-x-1 overflow-x-auto pr-10"
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: '#4B5563 #1F2937', // slate-600 / slate-800
          maskImage: 'linear-gradient(to right, black calc(100% - 40px), transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to right, black calc(100% - 40px), transparent 100%)',
          paddingBottom: '4px', // Add some padding at the bottom for the dock effect
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
        <CustomTooltip content="Show all snippets">
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
        {folders.map((folder, index) => (
          <motion.div
            key={folder.id}
            ref={getItemRef(index)}
            style={{
              scale: scales[index] || 1,
              transformOrigin: 'bottom center',
              transition: 'transform 0.2s ease-out',
              zIndex: activeFilterFolderId === folder.id ? 10 : 1,
            }}
            className="flex items-center"
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
      </LayoutGroup>
      </div>
      {/* Fixed container for the New Folder Button */}
      <div className="absolute right-2 top-1/2 -translate-y-1/2 z-10 flex-shrink-0">
        <NewFolderButton onClick={onAddNewFolder} disabled={isEditingOrCreatingFolder} />
      </div>
    </div>
  );
};
