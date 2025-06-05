import React from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CustomTooltip } from '@/components/ui/custom-tooltip';

interface NewFolderButtonProps {
  onClick: () => void;
  disabled?: boolean;
}

export const NewFolderButton: React.FC<NewFolderButtonProps> = ({ onClick, disabled }) => {
  return (
    <CustomTooltip content="New Folder" side="left">
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0 flex items-center justify-center rounded-md flex-shrink-0 hover:bg-slate-700/50"
        onClick={onClick}
        disabled={disabled}
        aria-label="Create new folder"
      >
        <Plus size={18} />
      </Button>
    </CustomTooltip>
  );
};
