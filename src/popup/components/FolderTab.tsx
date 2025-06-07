import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Folder as FolderIcon, X, Pencil, Check, X as XIcon } from 'lucide-react';
import { CustomTooltip } from '@/components/ui/custom-tooltip';
import { cn } from '@/lib/utils';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { EmojiPicker } from '@/components/ui/emoji-picker';
import { Trash2 } from 'lucide-react'; // Ensure Trash2 is imported

interface FolderTabProps {
  folder: {
    id: string;
    name: string;
    emoji?: string;
  };
  isActive: boolean;
  onSelect: () => void;
  onDelete: (id: string) => Promise<void>;
  onRename: (id: string, newName: string) => Promise<void>;
  onEmojiChange: (id: string, emoji: string) => Promise<void>;
  isInitiallyEditing?: boolean;
  onCancelRename?: () => void;
}

export const FolderTab: React.FC<FolderTabProps> = ({
  folder,
  isActive,
  onSelect,
  onDelete,
  onRename,
  onEmojiChange,
  isInitiallyEditing = false,
  onCancelRename,
}) => {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isRenaming, setIsRenaming] = useState(isInitiallyEditing);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [folderName, setFolderName] = useState(folder.name);
  const [inputWidth, setInputWidth] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const clickCountRef = useRef(0);

  // Event Handlers wrapped with useCallback
  const handleCancelRenameInternal = useCallback(() => {
    if (onCancelRename) {
      onCancelRename();
    }
    setFolderName(folder.name);
    setIsRenaming(false);
  }, [onCancelRename, folder.name, setFolderName, setIsRenaming]);

  const handleRenameInternal = useCallback(async () => {
    if (folderName.trim() && folderName !== folder.name) {
      await onRename(folder.id, folderName.trim());
    } else {
      setFolderName(folder.name);
    }
    setIsRenaming(false);
  }, [folderName, folder.name, folder.id, onRename, setFolderName, setIsRenaming]);

  const handleDoubleClickInternal = useCallback(() => {
    setIsRenaming(true);
  }, [setIsRenaming]);

  const handleInputChangeInternal = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    setFolderName(newName);
    // Dynamic width calculation (can be further optimized if needed)
    if (inputRef.current) {
      const tempSpan = document.createElement('span');
      tempSpan.style.visibility = 'hidden';
      tempSpan.style.position = 'absolute';
      tempSpan.style.padding = '0 8px';
      tempSpan.style.fontSize = inputRef.current.style.fontSize || '0.875rem';
      tempSpan.style.fontFamily = inputRef.current.style.fontFamily || 'inherit';
      tempSpan.textContent = newName || 'New Folder';
      document.body.appendChild(tempSpan);
      const buttonsWidth = 60; // Approx. space for Check and X buttons
      setInputWidth(Math.max(80 + buttonsWidth, tempSpan.offsetWidth + buttonsWidth + 16));
      document.body.removeChild(tempSpan);
    }
  }, [setFolderName, setInputWidth]);

  const handleKeyDownInternal = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleRenameInternal();
    } else if (e.key === 'Escape') {
      handleCancelRenameInternal();
    }
  }, [handleRenameInternal, handleCancelRenameInternal]);

  const handleDeleteClickInternal = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteDialog(true);
  }, [setShowDeleteDialog]);

  const confirmDeleteInternal = useCallback(async () => {
    setIsDeleting(true);
    try {
      await onDelete(folder.id);
    } catch (error) {
      console.error('Failed to delete folder:', error);
      // Optionally set an error state here to inform the user
    }
    setShowDeleteDialog(false);
    setIsDeleting(false); // Ensure isDeleting is reset
  }, [onDelete, folder.id, setIsDeleting, setShowDeleteDialog]);

  const handleEmojiSelectInternal = useCallback(async (emoji: string) => {
    await onEmojiChange(folder.id, emoji);
    setShowEmojiPicker(false);
  }, [onEmojiChange, folder.id, setShowEmojiPicker]);

  const handleEmojiClickInternal = useCallback((e: React.MouseEvent) => {
    setShowEmojiPicker(prev => !prev);
  }, [setShowEmojiPicker]);

  // useEffect Hooks
  useEffect(() => {
    if (isInitiallyEditing) {
      setIsRenaming(true);
    }
  }, [isInitiallyEditing]);

  // Effect for input width calculation and focus/text selection
  useEffect(() => {
    if (isRenaming && inputRef.current) {
      // Calculate width
      const tempSpan = document.createElement('span');
      tempSpan.style.visibility = 'hidden';
      tempSpan.style.position = 'absolute';
      tempSpan.style.padding = '0 8px';
      tempSpan.style.fontSize = inputRef.current.style.fontSize || '0.875rem';
      tempSpan.style.fontFamily = inputRef.current.style.fontFamily || 'inherit';
      tempSpan.textContent = folderName || 'New Folder';
      document.body.appendChild(tempSpan);
      const buttonsWidth = 60; // Approx. space for Check and X buttons
      setInputWidth(Math.max(80 + buttonsWidth, tempSpan.offsetWidth + buttonsWidth + 16));
      document.body.removeChild(tempSpan);

      // Focus and position cursor at the end of the text
      requestAnimationFrame(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          // Always place cursor at the end of the text, don't select all
          const len = inputRef.current.value.length;
          inputRef.current.setSelectionRange(len, len);
        }
      });
    } else if (!isRenaming) {
      setInputWidth(0); // Reset width when not renaming
    }
  }, [isRenaming, folderName, isInitiallyEditing]); // folderName dependency ensures width recalculates on type

  // Effect for handling clicks outside the component
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        if (isRenaming) {
          // Use the USER's logic for handling temp-new-folder-id
          if (folder.id === 'temp-new-folder-id' && onCancelRename) {
            handleCancelRenameInternal();
          } else {
            handleRenameInternal();
          }
        } else if (showEmojiPicker) {
          setShowEmojiPicker(false);
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isRenaming, showEmojiPicker, folder.id, handleRenameInternal, handleCancelRenameInternal, onCancelRename]);

  // The main JSX for the component
  return (
    <motion.div
      layout
      ref={containerRef}
      className={cn(
        'group relative flex items-center h-8 rounded-md transition-colors duration-200',
        isActive ? 'bg-slate-700' : 'hover:bg-slate-700/50',
        isRenaming && 'z-10 bg-slate-700 shadow-lg'
      )}
    >
      <CustomTooltip content={isRenaming ? '' : folder.name}>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'h-8 w-8 p-0 flex items-center justify-center rounded-md flex-shrink-0',
            isRenaming ? 'bg-transparent hover:bg-transparent' : '',
            isActive && !isRenaming ? 'bg-slate-700' : '',
            !isRenaming ? 'hover:bg-slate-700/50' : '',
            isDeleting && 'opacity-50 cursor-not-allowed'
          )}
          onClick={() => {
            if (isRenaming) return;
            clickCountRef.current += 1;
            if (clickCountRef.current === 1) {
              clickTimeoutRef.current = setTimeout(() => {
                if (!isRenaming) onSelect();
                clickCountRef.current = 0;
              }, 250);
            } else if (clickCountRef.current === 2) {
              if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);
              handleDoubleClickInternal();
              clickCountRef.current = 0;
            }
          }}
          disabled={isDeleting}
        >
          <div className="relative w-8 h-8 flex items-center justify-center flex-shrink-0">
            <button
              type="button"
              onClick={handleEmojiClickInternal}
              className="text-sm hover:bg-slate-600/50 rounded-md p-0.5 transition-colors"
              aria-label="Change folder emoji"
            >
              {folder.emoji || '📁'}
            </button>
            {isActive && !isRenaming && (
              <CustomTooltip content="Delete folder">
                <Button
                  variant="ghost"
                  className="absolute top-0 -right-1 h-2 w-2 p-0 flex items-center justify-center text-red-500 hover:text-red-400 z-10"
                  onClick={(e) => { 
                    e.stopPropagation(); // Prevent main button click
                    handleDeleteClickInternal(e); 
                  }}
                  disabled={isDeleting}
                  aria-label="Delete folder"
                >
                  <Trash2 size={4} />
                </Button>
              </CustomTooltip>
            )}
            {showEmojiPicker && (
              <div className="fixed z-[100] -translate-x-1/2 left-1/2 bottom-full mb-2">
                <div className="bg-slate-800 rounded-lg shadow-xl border border-slate-700 overflow-hidden">
                  <EmojiPicker value={folder.emoji || '📁'} onChange={handleEmojiSelectInternal} />
                </div>
              </div>
            )}
          </div>
        </Button>
      </CustomTooltip>

      <AnimatePresence initial={false}>
        {isRenaming && (
          <motion.div
            layout
            className="flex items-center h-full ml-1 pl-1 pr-1 bg-slate-700 rounded-md"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: inputWidth, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 35, duration: 0.2 }}
          >
            <input
              ref={inputRef}
              type="text"
              value={folderName}
              onChange={handleInputChangeInternal}
              onKeyDown={handleKeyDownInternal}
              className="bg-slate-600 text-white placeholder-slate-400 text-sm rounded-l-md px-2 h-full flex-grow focus:outline-none focus:ring-1 focus:ring-sky-500 min-w-0"
              placeholder="Folder name"
              style={{ caretColor: 'white' }}
            />
            <Button
              variant="ghost" size="icon"
              className="h-full w-7 text-green-500 hover:text-green-400 hover:bg-slate-600 flex-shrink-0 rounded-none"
              onClick={handleRenameInternal} aria-label="Confirm rename"
            >
              <Check size={18} />
            </Button>
            <Button
              variant="ghost" size="icon"
              className="h-full w-7 text-red-500 hover:text-red-400 hover:bg-slate-600 flex-shrink-0 rounded-r-md rounded-l-none"
              onClick={handleCancelRenameInternal}
              aria-label="Cancel rename"
            >
              <XIcon size={18} />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmationDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={confirmDeleteInternal}
        title={`Delete Folder "${folder.name}"?`}
        description="This action cannot be undone. All snippets in this folder will become uncategorized."
        confirmText="Delete"
        variant="destructive"
      />
    </motion.div>
  );
};
