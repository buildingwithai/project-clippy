import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { CustomTooltip } from '@/components/ui/custom-tooltip';
import { Edit3, Copy, Check, Star, Trash2, Folder, Calendar, Clock, Repeat } from 'lucide-react';
import type { Snippet } from '@/utils/types';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { formatDateToMD, formatCount } from '@/utils/format';

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
            >
              <Trash2 size={14} />
            </Button>
          </CustomTooltip>
        </div>
      </div>
      <div className="mb-1 flex items-center gap-1 flex-wrap">
        <Badge size="small" variant="success" aria-label="Created date" className="flex items-center gap-1">
          <Calendar size={10} />
          <span className="text-foreground font-medium">Created</span>
          <span className="w-px h-2 bg-slate-500/60 self-center mx-1" />
          <span className="text-slate-400">{formatDateToMD(snippet.createdAt)}</span>
        </Badge>
        {snippet.folderId && getFolderById(snippet.folderId) && (
          <Badge size="small" variant="brand" aria-label="Folder" className="flex items-center gap-1">
            <Folder size={10} />
            <span className="text-foreground font-medium">Folder</span>
            <span className="w-px h-2 bg-slate-500/60 self-center mx-1" />
            <span className="text-slate-400">{getFolderById(snippet.folderId)?.name}</span>
          </Badge>
        )}
        <Badge size="small" variant="secondary" aria-label="Times used" className="flex items-center gap-1">
          <Repeat size={10} />
          <span className="text-foreground font-medium">Used</span>
          <span className="w-px h-2 bg-slate-500/60 self-center mx-1" />
          <span className="text-slate-400">{formatCount(snippet.frequency ?? 0)}</span>
        </Badge>
        {snippet.lastUsed && (
          <Badge size="small" variant="outline" aria-label="Last used date" className="flex items-center gap-1">
            <Clock size={10} />
            <span className="text-foreground font-medium">Last&nbsp;Used</span>
            <span className="w-px h-2 bg-slate-500/60 self-center mx-1" />
            <span className="text-slate-400">{formatDateToMD(snippet.lastUsed)}</span>
          </Badge>
        )}
      </div>
      <pre className="text-sm text-slate-300 bg-slate-900/50 p-2.5 rounded-md whitespace-pre-wrap break-all max-h-32 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-800">{snippet.text}</pre>
    </motion.div>
  );
};
