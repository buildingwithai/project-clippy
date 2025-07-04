import React, { useState, useEffect } from 'react';

import { Button } from '@/components/ui/button';
import { MagnetizeButton } from '@/components/ui/magnetize-button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

import type { Snippet, Folder } from '../../utils/types';

interface SnippetFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (snippetData: {
    id?: string;
    title: string;
    text: string;
    folderId: string | null;
  }) => void;
  snippetToEdit?: Snippet | null;
  initialText?: string; // New: text to pre-populate when creating a new snippet
  folders: Folder[];
}

export const SnippetFormModal: React.FC<SnippetFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  snippetToEdit,
  initialText,
  folders,
}) => {
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);

  useEffect(() => {
    if (snippetToEdit) {
      setTitle(snippetToEdit.title || ''); // Fallback for optional title
      setText(snippetToEdit.text);
      setSelectedFolderId(snippetToEdit.folderId || null); // folderId is optional in Snippet, maps to null for modal state
    } else if (initialText) {
      // Creating new snippet with pre-populated text (e.g., from context menu)
      setTitle('');
      setText(initialText);
      setSelectedFolderId(null);
    } else {
      // Reset form for new snippet without initial text
      setTitle('');
      setText('');
      setSelectedFolderId(null);
    }
  }, [snippetToEdit, initialText, isOpen]); // Re-run effect if isOpen changes to reset form when re-opened for new snippet

  const handleSubmit = () => {
    if (!title.trim() || !text.trim()) {
      // Basic validation: title and text are required
      // TODO: Add more robust validation and user feedback (e.g., toast notifications)
      alert('Title and Snippet text cannot be empty.');
      return;
    }
    onSave({
      id: snippetToEdit?.id,
      title: title.trim(),
      text: text.trim(),
      folderId: selectedFolderId,
    });
    onClose(); // Close modal after save
  };

  const handleModalOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleModalOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-slate-900 border-slate-700 text-slate-50 overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-sky-400">
            {snippetToEdit ? 'Edit Snippet' : 'Create New Snippet'}
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-400 mt-1 mb-2">
            {snippetToEdit ? 'Edit your snippet details.' : 'Create a new snippet. Add a title, paste your code, and optionally select a folder.'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="title" className="text-right">
              Title
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="col-span-3 bg-slate-800 text-slate-100 border border-slate-700 placeholder:text-slate-400 rounded-md shadow-none focus-visible:ring-2 focus-visible:ring-sky-500"
              placeholder="e.g., React useEffect Hook"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="folder" className="text-right">
              Folder
            </Label>
            <Select
              value={selectedFolderId || 'none'} // Ensure 'none' is default if null
              onValueChange={(value: string) => setSelectedFolderId(value === 'none' ? null : value)}
            >
              <SelectTrigger className="col-span-3 bg-slate-800 text-slate-100 border border-slate-700 placeholder:text-slate-400 rounded-md shadow-none focus-visible:ring-2 focus-visible:ring-sky-500">
                <SelectValue placeholder="Select a folder (optional)" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 text-slate-100 border border-slate-700">
                <SelectItem value="none">No Folder</SelectItem>
                {folders.map((folder) => (
                  <SelectItem key={folder.id} value={folder.id}>
                    {folder.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-1 items-start gap-2">
            <Label htmlFor="text" className="text-left mb-1">
              Snippet Code / Text
            </Label>
            <Textarea
              id="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="col-span-1 min-h-[100px] bg-slate-800 text-slate-100 border border-slate-700 placeholder:text-slate-400 rounded-md shadow-none focus-visible:ring-2 focus-visible:ring-sky-500"
              placeholder="Paste your code or type your note here..."
            />
          </div>
        </div>
        <DialogFooter className="mt-4">
          <DialogClose asChild>
            <Button type="button" variant="secondary" className="border-none">
              Cancel
            </Button>
          </DialogClose>
          <MagnetizeButton type="button" onClick={handleSubmit}>
            {snippetToEdit ? 'Save Changes' : 'Create Snippet'}
          </MagnetizeButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
