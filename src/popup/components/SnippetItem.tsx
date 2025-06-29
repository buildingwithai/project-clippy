import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { CustomTooltip } from '@/components/ui/custom-tooltip';
import { Edit3, Copy, Check, Star, Trash2 } from 'lucide-react';
import type { Snippet } from '@/utils/types';
import { cn } from '@/lib/utils';

interface SnippetItemProps {
  snippet: Snippet;
  copiedSnippetId: string | null;
  onCopyToClipboard: (text: string, snippetId: string) => void;
  onOpenEditModal: (snippet: Snippet) => void;
  onPinSnippet: (snippetId: string) => void;
  onDeleteSnippet: (snippetId: string) => void;
  getFolderById: (folderId?: string) => { id: string; name: string; emoji: string; } | null;
}

export const SnippetItem: React.FC<SnippetItemProps> = ({
  snippet,
  copiedSnippetId,
  onCopyToClipboard,
  onOpenEditModal,
  onPinSnippet,
  onDeleteSnippet,
  getFolderById,
}) => {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'bg-slate-800 p-3 rounded-lg shadow hover:shadow-md hover:shadow-sky-600/30 transition-shadow',
        snippet.isPinned && 'bg-sky-900/20 border border-sky-700/50'
      )}
    >
      <div className="flex justify-between items-start mb-1">
        <h3 className="text-md font-semibold text-sky-400">{snippet.title || 'Untitled Snippet'}</h3>
        <div className="flex items-center space-x-1">
          <CustomTooltip content={snippet.isPinned ? 'Unpin Snippet' : 'Pin Snippet'} side="bottom">
  <Button
    variant="ghost"
    size="icon"
    className="h-7 w-7 text-slate-400 hover:text-yellow-400"
    onClick={() => onPinSnippet(snippet.id)}
  >
    <Star size={14} className={cn(snippet.isPinned && 'text-yellow-400 fill-yellow-400')} />
  </Button>
</CustomTooltip>
          <CustomTooltip content="Edit" side="bottom">
  <Button
    variant="ghost"
    size="icon"
    className="h-7 w-7 text-slate-400 hover:text-blue-400"
    onClick={() => onOpenEditModal(snippet)}
    aria-label="Edit snippet"
  >
    <Edit3 size={14} />
  </Button>
</CustomTooltip>

          <CustomTooltip content={copiedSnippetId === snippet.id ? 'Copied!' : 'Copy to clipboard'} side="bottom">
  <Button
    variant="ghost"
    size="icon"
    className="h-7 w-7 text-slate-400 hover:text-green-400"
    onClick={() => onCopyToClipboard(snippet.text, snippet.id)}
    aria-label="Copy snippet"
  >
    {copiedSnippetId === snippet.id ? (
      <Check size={14} className="text-green-400" />
    ) : (
      <Copy size={14} />
    )}
  </Button>
</CustomTooltip>

          <CustomTooltip content="Delete" side="bottom">
  <Button
    variant="ghost"
    size="icon"
    className="h-7 w-7 text-slate-400 hover:text-red-400"
    onClick={() => onDeleteSnippet(snippet.id)}
    aria-label="Delete snippet"
  >
    <Trash2 size={14} />
  </Button>
</CustomTooltip>
        </div>
      </div>
      <div className="text-xs text-slate-500 mb-2 flex items-center space-x-2 flex-wrap">
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
    </motion.div>
  );
};
