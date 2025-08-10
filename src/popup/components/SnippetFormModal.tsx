import React, { useState, useEffect } from 'react';

import { Button } from '@/components/ui/button';
import { MagnetizeButton } from '@/components/ui/magnetize-button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SimpleRichEditor } from '@/components/ui/simple-rich-editor';

import type { Snippet, Folder } from '../../utils/types';

interface SnippetFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (snippetData: {
    id?: string;
    title: string;
    text: string;
    html?: string;
    folderId: string | null;
    isNewVersion?: boolean;
    originalSnippetId?: string;
  }) => void;
  snippetToEdit?: Snippet | null;
  initialText?: string; // New: text to pre-populate when creating a new snippet
  initialHtml?: string; // New: HTML to pre-populate when creating a new snippet
  folders: Folder[];
}

export const SnippetFormModal: React.FC<SnippetFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  snippetToEdit,
  initialText,
  initialHtml,
  folders,
}) => {

  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [html, setHtml] = useState<string | undefined>(undefined);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [useSimpleEditor, setUseSimpleEditor] = useState(false);
  const [isCreatingNewVersion, setIsCreatingNewVersion] = useState(false);
  const [versionMode, setVersionMode] = useState<'edit' | 'create'>('edit');
  
  // Remove manual slash command state - using YooptaRichEditor for both modes

  // Initialize modal content when opened
  useEffect(() => {
    if (!isOpen) return;
    
    if (snippetToEdit) {
      // Editing existing snippet
      setTitle(snippetToEdit.title || '');
      setText(snippetToEdit.text || '');
      setHtml(snippetToEdit.html || undefined);
      setSelectedFolderId(snippetToEdit.folderId || null);
      setVersionMode('edit');
    } else {
      // Creating new snippet
      setTitle('');
      setText(initialText || '');
      setHtml(initialHtml || undefined);
      setSelectedFolderId(null);
      setVersionMode('edit');
    }
  }, [isOpen, snippetToEdit, initialText, initialHtml]);

  // Remove manual slash command menu effect - using YooptaRichEditor for both modes

  // Handle rich text editor content change
  const handleEditorChange = (content: { html: string; text: string }) => {
    setText(content.text);
    setHtml(content.html);
  };

  // Handle version mode toggle
  const handleVersionModeChange = (newMode: 'edit' | 'create') => {
    setVersionMode(newMode);
  };

  // Remove manual slash commands - using YooptaRichEditor for both modes

  // Remove manual element insertion - using YooptaRichEditor for both modes

  // Remove manual key handling - using YooptaRichEditor for both modes

  const handleSubmit = () => {
    if (!title.trim() || !text.trim()) {
      alert('Title and Snippet content cannot be empty.');
      return;
    }
    
    const isCreatingNewVersion = Boolean(snippetToEdit && versionMode === 'create');
    const snippetData = {
      id: isCreatingNewVersion ? undefined : snippetToEdit?.id,
      title: title.trim(),
      text: text.trim(),
      html: html || undefined,
      folderId: selectedFolderId,
      isNewVersion: isCreatingNewVersion || undefined,
      originalSnippetId: isCreatingNewVersion ? snippetToEdit?.id : undefined,
    };
    onSave(snippetData);
    onClose();
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
        <DialogHeader className="pb-2">
          <DialogTitle className="text-slate-100 text-base font-medium">
            {snippetToEdit 
              ? (versionMode === 'create' ? 'New Version' : 'Edit Snippet')
              : 'Add Snippet'
            }
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-400 mt-0.5 mb-1">
            {snippetToEdit 
              ? (versionMode === 'create' 
                ? 'Create new version with different content' 
                : 'Edit snippet content'
              )
              : 'Add name, content and folder'
            }
          </DialogDescription>
        </DialogHeader>
        
        {/* Version Mode Toggle - compact and centered */}
        {snippetToEdit && (
          <div className="flex justify-center mb-3">
            <div className="flex bg-slate-800/50 rounded-md p-0.5 border border-slate-700/50">
              <button
                type="button"
                onClick={() => handleVersionModeChange('edit')}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-all duration-200 ${
                  versionMode === 'edit' 
                    ? 'text-white bg-gradient-to-r from-sky-500 to-blue-600 shadow-sm' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Edit Current
              </button>
              <button
                type="button"
                onClick={() => handleVersionModeChange('create')}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-all duration-200 ${
                  versionMode === 'create' 
                    ? 'text-white bg-gradient-to-r from-sky-500 to-blue-600 shadow-sm' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Create New
              </button>
            </div>
          </div>
        )}
        
        {/* Compact form layout */}
        <div className="space-y-3">
          {/* Title and Folder in one row */}
          <div className="flex gap-3">
            <div className="flex-1">
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-9 bg-slate-800/50 text-slate-100 border-slate-700/50 placeholder:text-slate-500 text-sm focus-visible:ring-1 focus-visible:ring-sky-500"
                placeholder="Snippet title..."
              />
            </div>
            <div className="w-36">
              <Select
                value={selectedFolderId || 'none'}
                onValueChange={(value: string) => setSelectedFolderId(value === 'none' ? null : value)}
              >
                <SelectTrigger className="h-9 bg-slate-800/50 text-slate-100 border-slate-700/50 text-sm focus-visible:ring-1 focus-visible:ring-sky-500">
                  <SelectValue placeholder="Folder" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="none">No Folder</SelectItem>
                  {folders.map((folder) => (
                    <SelectItem key={folder.id} value={folder.id}>
                      {folder.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Content editor - clean and focused */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-xs text-slate-400">💡 Use '/' for formatting</div>
              <button
                type="button"
                onClick={() => setUseSimpleEditor(!useSimpleEditor)}
                className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
              >
                {useSimpleEditor ? 'Rich' : 'Plain'}
              </button>
            </div>

            {useSimpleEditor ? (
              <textarea
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  setHtml(undefined);
                }}
                placeholder="Enter your snippet content..."
                className="w-full h-32 p-3 bg-slate-800/50 border border-slate-700/50 rounded-lg text-slate-100 placeholder-slate-500 text-sm focus:ring-1 focus:ring-sky-500 focus:border-sky-500/50 resize-none"
              />
            ) : (
              <SimpleRichEditor
                value={html || (text ? `<p>${text.replace(/\n/g, '</p><p>')}</p>` : '')}
                onChange={handleEditorChange}
                placeholder="Enter your snippet content... Use toolbar for formatting."
                className="h-32"
              />
            )}
          </div>
        </div>
        
        <DialogFooter className="mt-6 flex justify-between items-center pt-4 border-t border-slate-700/30">
          <DialogClose asChild>
            <Button type="button" variant="secondary" className="border-none">
              Cancel
            </Button>
          </DialogClose>
          <MagnetizeButton type="button" onClick={handleSubmit}>
            {snippetToEdit 
              ? (versionMode === 'create' ? 'Create Version' : 'Save Changes') 
              : 'Create Snippet'
            }
          </MagnetizeButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
