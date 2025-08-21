import React, { useState, useEffect, useCallback } from 'react';

import { Button } from '@/components/ui/button';
import { MagnetizeButton } from '@/components/ui/magnetize-button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TipTapEditor } from '@/components/ui/tiptap-editor';
import { ClippyProcessor } from '@/utils/clippy-integration';
import type { ClippyContent } from '../../utils/types';

import type { Snippet, Folder } from '../../utils/types';
import { extractDomain } from '../../utils/url-helpers';

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
    sourceUrl?: string;
    sourceDomain?: string;
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
  const [clippyContent, setClippyContent] = useState<ClippyContent | undefined>(undefined);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [sourceUrl, setSourceUrl] = useState('');
  // TipTap-only system - no editor switching needed
  const [isCreatingNewVersion, setIsCreatingNewVersion] = useState(false);
  const [versionMode, setVersionMode] = useState<'edit' | 'create'>('edit');
  const [savedContent, setSavedContent] = useState<{ text: string; html?: string; title: string }>({ text: '', html: undefined, title: '' });
  const [createModeContent, setCreateModeContent] = useState<{ text: string; html?: string; versionTitle: string }>({ text: '', html: undefined, versionTitle: '' });
  const [isSwitchingTabs, setIsSwitchingTabs] = useState(false);
  const [versionTitle, setVersionTitle] = useState('');
  const [isContentReady, setIsContentReady] = useState(false);
  
  // Remove manual slash command state - using YooptaRichEditor for both modes

  // Initialize modal content when opened (but not during tab switches)
  useEffect(() => {
    if (!isOpen || isSwitchingTabs) return;
    
    if (snippetToEdit) {
      // Editing existing snippet  
      console.log('[Debug] Editing snippet:', snippetToEdit);
      setTitle(snippetToEdit.title || '');
      const currentVersion = snippetToEdit.versions?.[snippetToEdit.currentVersionIndex ?? 0] || snippetToEdit;
      console.log('[Debug] Current version:', currentVersion);
      
      let originalText = currentVersion.text || '';
      let originalHtml = currentVersion.html || undefined;
      
      // FALLBACK: If no text/html but has ClippyContent, extract text
      if (!originalText && !originalHtml && currentVersion.clippyContent) {
        try {
          // Simple synchronous text extraction from ClippyContent
          const extractTextFromClippyContent = (content: any): string => {
            if (!content?.blocks) return '';
            return content.blocks
              .map((block: any) => {
                if (block.type === 'paragraph' || block.type === 'heading') {
                  return block.content?.map((inline: any) => 
                    inline.type === 'text' ? inline.text : ''
                  ).join('') || '';
                }
                return '';
              })
              .filter((text: string) => text.trim())
              .join('\n');
          };
          
          originalText = extractTextFromClippyContent(currentVersion.clippyContent);
        } catch (error) {
          console.warn('Failed to extract text from ClippyContent:', error);
        }
      }
      
      console.log('[Debug] Setting text/html:', { originalText, originalHtml });
      setText(originalText);
      setHtml(originalHtml);
      setSelectedFolderId(snippetToEdit.folderId || null);
      setSourceUrl(snippetToEdit.sourceUrl || '');
      setVersionMode('edit'); // Always start in edit mode when editing
      setVersionTitle(''); // Clear version title
      
      // Mark content as ready AFTER state is set
      console.log('[Debug] Setting content ready...');
      setTimeout(() => {
        console.log('[Debug] Content is now ready');
        setIsContentReady(true);
      }, 0);
      
      // Auto-migrate existing content to ClippyContent for TipTap
      const migrateToClippyContent = async () => {
        try {
          if (currentVersion.clippyContent) {
            // Already has ClippyContent
            setClippyContent(currentVersion.clippyContent);
          } else if (originalHtml || originalText) {
            // Convert existing content to ClippyContent
            const content = originalHtml || originalText;
            const clippyContent = await ClippyProcessor.processContent(content, {
              format: originalHtml ? 'html' : 'text',
              sourceUrl: snippetToEdit.sourceUrl,
              sourceDomain: snippetToEdit.sourceDomain
            });
            setClippyContent(clippyContent);
          }
        } catch (error) {
          console.warn('Auto-migration failed, using fallback:', error);
          // Fallback: create basic ClippyContent from text
          if (originalText) {
            setClippyContent({
              version: "1.0",
              blocks: [{
                id: `block-${Date.now()}`,
                type: 'paragraph',
                content: [{ type: 'text', text: originalText }]
              }]
            });
          }
        }
      };
      
      migrateToClippyContent();
      
      // Store the original content for restoration
      setSavedContent({ text: originalText, html: originalHtml, title: snippetToEdit.title || '' });
    } else {
      // Creating new snippet - auto-populate URL from pending data or current tab
      setTitle('');
      setText(initialText || '');
      setHtml(initialHtml || undefined);
      setSelectedFolderId(null);
      setVersionMode('edit'); // Reset to edit mode for new snippets
      setVersionTitle(''); // Clear version title
      setSavedContent({ text: '', html: undefined, title: '' }); // Clear saved content
      
      // Content is immediately ready for new snippets
      setIsContentReady(true);
      
      // Auto-populate URL from storage or current tab
      const loadInitialUrl = async () => {
        try {
          const result = await chrome.storage.local.get('pendingSnippetUrl');
          setSourceUrl(result.pendingSnippetUrl || '');
        } catch (error) {
          console.warn('Error loading pending URL:', error);
          setSourceUrl('');
        }
      };
      loadInitialUrl();
      // Don't reset createModeContent - preserve any previously typed content
    }
    
    // Cleanup function to reset states when modal closes
    return () => {
      if (!isOpen) {
        setIsSwitchingTabs(false);
        setIsContentReady(false);
      }
    };
  }, [isOpen, snippetToEdit, initialText, initialHtml]);

  // TipTap-only content change handler
  const handleTipTapChange = (content: { clippyContent: ClippyContent; html: string; text: string }) => {
    setText(content.text);
    setHtml(content.html);
    setClippyContent(content.clippyContent);
  };

  // Handle version mode toggle - use useCallback to ensure fresh closure values
  const handleVersionModeChange = useCallback((newMode: 'edit' | 'create') => {
    // Prevent useEffect from interfering during tab switch
    setIsSwitchingTabs(true);
    
    if (newMode === 'create') {
      // Save current content to savedContent before switching
      setSavedContent({ text, html, title });
      
      // Switch to create mode - restore previously entered create content
      setVersionMode(newMode);
      setText(createModeContent.text);
      setHtml(createModeContent.html);
      setVersionTitle(createModeContent.versionTitle);
    } else {
      // Save current content to createModeContent before switching  
      setCreateModeContent({ text, html, versionTitle });
      
      // Switch back to edit mode - restore saved content
      setVersionMode(newMode);
      setText(savedContent.text);
      setHtml(savedContent.html);
      setTitle(savedContent.title);
      setVersionTitle('');
    }
    
    // Allow useEffect to run again after state updates complete
    setTimeout(() => setIsSwitchingTabs(false), 0);
  }, [text, html, title, versionTitle, createModeContent, savedContent]);


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
      clippyContent: clippyContent || undefined, // Include ClippyContent for better copy-paste
      folderId: selectedFolderId,
      isNewVersion: isCreatingNewVersion || undefined,
      originalSnippetId: isCreatingNewVersion ? snippetToEdit?.id : undefined,
      versionTitle: versionTitle.trim() || undefined, // Include version-specific title
      sourceUrl: sourceUrl.trim() || undefined,
      sourceDomain: sourceUrl.trim() ? (extractDomain(sourceUrl.trim()) || undefined) : undefined,
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
          
          {/* Version title field when creating new version */}
          {snippetToEdit && versionMode === 'create' && (
            <div className="flex gap-3">
              <div className="flex-1">
                <Input
                  id="version-title"
                  value={versionTitle}
                  onChange={(e) => setVersionTitle(e.target.value)}
                  className="h-9 bg-slate-800/50 text-slate-100 border-slate-700/50 placeholder:text-slate-500 text-sm focus-visible:ring-1 focus-visible:ring-sky-500"
                  placeholder="Version title (optional)..."
                />
              </div>
            </div>
          )}
          
          {/* Source URL field */}
          <div className="flex gap-3">
            <div className="flex-1">
              <Input
                id="source-url"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                className="h-9 bg-slate-800/50 text-slate-100 border-slate-700/50 placeholder:text-slate-500 text-sm focus-visible:ring-1 focus-visible:ring-sky-500"
                placeholder="Source URL (auto-captured)..."
              />
            </div>
          </div>
          
          {/* TipTap Editor - clean and focused */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-xs text-slate-400">💡 Use toolbar for formatting</div>
              <div className="text-xs text-slate-400">TipTap Editor</div>
            </div>

            {isContentReady ? (
              <TipTapEditor
                key={`tiptap-${versionMode}-${snippetToEdit?.id || 'new'}`}
                value={
                  // CRITICAL FIX: Use HTML fallback if ClippyContent has empty blocks
                  clippyContent && clippyContent.blocks && clippyContent.blocks.length > 0 
                    ? clippyContent 
                    : (html || text || '')
                }
                onChange={handleTipTapChange}
                placeholder="Enter your snippet content... Use toolbar for rich formatting."
                className="h-40"
              />
            ) : (
              <div className="border border-slate-700 rounded-lg bg-slate-800/50 p-4 h-40 flex items-center justify-center">
                <div className="text-slate-400">Loading content...</div>
              </div>
            )}
            {/* Debug info */}
            <div className="text-xs text-slate-500 mt-1">
              Debug: clippyContent={!!clippyContent ? 'yes' : 'no'}, html={!!html ? 'yes' : 'no'}, text={!!text ? 'yes' : 'no'}, ready={isContentReady ? 'yes' : 'no'}
            </div>
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
