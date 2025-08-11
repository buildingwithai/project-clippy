import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { SnippetItem } from './SnippetItem';
import type { Snippet } from '@/utils/types';

interface SortableSnippetItemProps {
  snippet: Snippet;
  copiedSnippetId: string | null;
  onCopyToClipboard: (text: string, snippetId: string, html?: string) => void;
  onOpenEditModal: (snippet: Snippet) => void;
  onPinSnippet: (snippetId: string) => void;
  onDeleteSnippet: (snippetId: string) => void;
  getFolderById: (folderId?: string) => { id: string; name: string; emoji: string; } | null;
  onVersionChange?: (snippetId: string, versionIndex: number) => void;
  currentViewingIndex?: number;
  hotkeyMappings?: Array<{ slot: string; snippetId: string; }>;
  chromeHotkeys?: Record<string, string>;
}

export const SortableSnippetItem: React.FC<SortableSnippetItemProps> = ({
  snippet,
  copiedSnippetId,
  onCopyToClipboard,
  onOpenEditModal,
  onPinSnippet,
  onDeleteSnippet,
  getFolderById,
  onVersionChange,
  currentViewingIndex,
  hotkeyMappings,
  chromeHotkeys,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: snippet.id,
    data: {
      type: 'snippet',
      snippet,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      {...attributes} 
      {...listeners}
      className="touch-none select-none"
    >
      <SnippetItem
        snippet={snippet}
        copiedSnippetId={copiedSnippetId}
        onCopyToClipboard={onCopyToClipboard}
        onOpenEditModal={onOpenEditModal}
        onPinSnippet={onPinSnippet}
        onDeleteSnippet={onDeleteSnippet}
        getFolderById={getFolderById}
        onVersionChange={onVersionChange}
        currentViewingIndex={currentViewingIndex}
        hotkeyMappings={hotkeyMappings}
        chromeHotkeys={chromeHotkeys}
      />
    </div>
  );
};