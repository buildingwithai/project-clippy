import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Folder as FolderIcon, X, Pencil, Check, X as XIcon } from 'lucide-react';
import { CustomTooltip } from '@/components/ui/custom-tooltip';
import { cn } from '@/lib/utils';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { EmojiPicker } from '@/components/ui/emoji-picker';

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
}

export const FolderTab: React.FC<FolderTabProps> = ({
  folder,
  isActive,
  onSelect,
  onDelete,
  onRename,
  onEmojiChange,
}) => {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [folderName, setFolderName] = useState(folder.name);
  // inputWidth will now be for the input field *and* its buttons
  const [inputWidth, setInputWidth] = useState(0); 
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const clickCountRef = useRef(0);

  // Calculate initial width based on folder name length
  useEffect(() => {
    if (isRenaming && inputRef.current) {
      const tempSpan = document.createElement('span');
      tempSpan.style.visibility = 'hidden';
      tempSpan.style.position = 'absolute';
      tempSpan.style.padding = '0 8px'; // Corresponds to input's horizontal padding
      tempSpan.style.fontSize = inputRef.current.style.fontSize || '0.875rem';
      tempSpan.style.fontFamily = inputRef.current.style.fontFamily || 'inherit';
      tempSpan.textContent = folderName || 'New Folder'; // Use current folderName
      document.body.appendChild(tempSpan);
      // Approx 30px per icon button (w-6 + padding/margin) + input padding
      const buttonsWidth = 60; // Space for Check and X buttons
      setInputWidth(Math.max(80 + buttonsWidth, tempSpan.offsetWidth + buttonsWidth + 16)); // Ensure min width for text + buttons
      document.body.removeChild(tempSpan);
      // Focus after a short delay to ensure DOM is updated
      requestAnimationFrame(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      });
    } else if (!isRenaming) {
      setInputWidth(0); // Reset width when not renaming
    }
  }, [isRenaming, folderName]);

  // Handle click outside to save renaming
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        if (isRenaming) {
          handleRename();
        } else if (showEmojiPicker) {
          setShowEmojiPicker(false);
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isRenaming, showEmojiPicker]);

  const handleRename = async () => {
    if (folderName.trim() && folderName !== folder.name) {
      await onRename(folder.id, folderName);
    } else {
      setFolderName(folder.name);
    }
    setIsRenaming(false);
  };

  const handleDoubleClick = () => {
    setIsRenaming(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    setFolderName(newName);
    // Update width based on input
    if (inputRef.current) {
      const tempSpan = document.createElement('span');
      tempSpan.style.visibility = 'hidden';
      tempSpan.style.position = 'absolute';
      tempSpan.style.padding = '0 8px'; // Corresponds to input's horizontal padding
      tempSpan.style.fontSize = inputRef.current.style.fontSize || '0.875rem';
      tempSpan.style.fontFamily = inputRef.current.style.fontFamily || 'inherit';
      tempSpan.textContent = newName || 'New Folder';
      document.body.appendChild(tempSpan);
      const buttonsWidth = 60; // Space for Check and X buttons
      setInputWidth(Math.max(80 + buttonsWidth, tempSpan.offsetWidth + buttonsWidth + 16));
      document.body.removeChild(tempSpan);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleRename();
    } else if (e.key === 'Escape') {
      setFolderName(folder.name);
      setIsRenaming(false);
    }
  };

  const handleDeleteClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    setIsDeleting(true);
    await onDelete(folder.id);
    setShowDeleteDialog(false);
  };

  const handleEmojiSelect = async (emoji: string) => {
    await onEmojiChange(folder.id, emoji);
    setShowEmojiPicker(false);
  };

  const handleEmojiClick = (e: React.MouseEvent) => {
    setShowEmojiPicker(!showEmojiPicker);
  };

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
            // Always w-8 to keep icon container fixed. Background changes if renaming.
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
              handleDoubleClick();
              clickCountRef.current = 0;
            }
          }}
          disabled={isDeleting}
        >
          <div className="relative w-8 h-8 flex items-center justify-center flex-shrink-0">
            <button
              type="button"
              onClick={handleEmojiClick}
              className="text-sm hover:bg-slate-600/50 rounded-md p-0.5 transition-colors"
              aria-label="Change folder emoji"
            >
              {folder.emoji || '📁'}
            </button>
            {showEmojiPicker && (
              <div className="fixed z-[100] -translate-x-1/2 left-1/2 bottom-full mb-2">
                <div className="bg-slate-800 rounded-lg shadow-xl border border-slate-700 overflow-hidden">
                  <EmojiPicker value={folder.emoji || '📁'} onChange={handleEmojiSelect} />
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
            className="flex items-center h-full ml-1 pl-1 pr-1 bg-slate-700 rounded-md" // Added padding and bg for clarity
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: inputWidth, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 35, duration: 0.2 }}
          >
            <input
              ref={inputRef}
              type="text"
              value={folderName}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              className="bg-slate-600 text-white placeholder-slate-400 text-sm rounded-l-md px-2 h-full flex-grow focus:outline-none focus:ring-1 focus:ring-sky-500 min-w-0"
              placeholder="Folder name"
              style={{ caretColor: 'white' }} 
            />
            {/* Confirm Button */}
            <Button
              variant="ghost" size="icon"
              className="h-full w-7 text-green-500 hover:text-green-400 hover:bg-slate-600 flex-shrink-0 rounded-none"
              onClick={handleRename} aria-label="Confirm rename"
            >
              <Check size={18} />
            </Button>
            {/* Cancel Button */}
            <Button
              variant="ghost" size="icon"
              className="h-full w-7 text-red-500 hover:text-red-400 hover:bg-slate-600 flex-shrink-0 rounded-r-md rounded-l-none"
              onClick={() => { setFolderName(folder.name); setIsRenaming(false); }} 
              aria-label="Cancel rename"
            >
              <XIcon size={18} />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {isActive && !isRenaming && (
         <CustomTooltip content="Delete folder">
          <Button
            variant="ghost" size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={handleDeleteClick} disabled={isDeleting} aria-label="Delete folder"
          >
            <X size={16} />
          </Button>
        </CustomTooltip>
      )}

      <ConfirmationDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={confirmDelete}
        title={`Delete Folder "${folder.name}"?`}
        description="This action cannot be undone. All snippets in this folder will become uncategorized."
        confirmText="Delete"
        variant="destructive"
        // isLoading prop is not defined on ConfirmationDialog, remove if not used internally for styling
        // If isLoading is for the button, that's handled internally by the Button component or needs a different prop on ConfirmationDialog
        // For now, assuming isLoading was a typo or meant for a different component, as ConfirmationDialog doesn't use it.
        // isLoading={isDeleting} 
      />
    </motion.div>
  );
};
