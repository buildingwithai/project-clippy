import React from 'react';
import type { Folder } from '../../utils/types';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Folder as FolderIcon, List } from 'lucide-react';
import { CustomTooltip } from '@/components/ui/custom-tooltip';

interface FolderTabsProps {
  folders: Folder[];
  activeFilterFolderId: string | null;
  setActiveFilterFolderId: (id: string | null) => void;
}

export const FolderTabs: React.FC<FolderTabsProps> = ({ folders, activeFilterFolderId, setActiveFilterFolderId }) => {
  return (
    <div className="p-1.5 border-b border-slate-700 flex space-x-1.5 items-center overflow-x-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-800">
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

      {folders.map((folder) => (
        <CustomTooltip key={folder.id} content={folder.name}>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              'p-1.5 h-7 w-7 flex items-center justify-center rounded-md',
              activeFilterFolderId === folder.id
                ? 'bg-sky-700 text-sky-100 hover:bg-sky-600'
                : 'text-slate-300 hover:bg-slate-700 hover:text-slate-100'
            )}
            onClick={() => setActiveFilterFolderId(folder.id)}
          >
            <FolderIcon size={14} className="shrink-0" />
          </Button>
        </CustomTooltip>
      ))}
    </div>
  );
};
