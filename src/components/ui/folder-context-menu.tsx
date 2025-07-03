import * as React from "react";
import { useState } from "react";
import { useLongPress } from "@/hooks/use-long-press";
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
} from "@/components/ui/context-menu";

interface FolderContextMenuProps {
  onRename: () => void;
  onChangeIcon: () => void;
  onDelete: () => void;
  children: React.ReactNode;
  className?: string;
}

/**
 * Generic wrapper that adds a Radix context-menu (right-click / long-press) to a folder tab.
 * It exposes three actions: Rename, Change Icon, Delete.
 */
export const FolderContextMenu: React.FC<FolderContextMenuProps> = ({
  onRename,
  onChangeIcon,
  onDelete,
  children,
  className,
}) => {
  const [open, setOpen] = useState(false);
  const longPress = useLongPress(() => setOpen(true), 500);

  return (
        <ContextMenu {...({ open, onOpenChange: setOpen } as any)}>
      <ContextMenuTrigger asChild>
        <div {...longPress}>{children}</div>
      </ContextMenuTrigger>
      <ContextMenuContent
        className={
          className ??
          "w-44 rounded-md bg-slate-800 border border-slate-700 shadow-xl backdrop-blur-md"
        }
      >
        <ContextMenuItem
          onSelect={onRename}
          inset
          className="text-slate-200 focus:bg-sky-700/60 focus:text-white hover:bg-sky-700/40"
        >
          📝 Rename
        </ContextMenuItem>
        <ContextMenuItem
          onSelect={onChangeIcon}
          inset
          className="text-slate-200 focus:bg-sky-700/60 focus:text-white hover:bg-sky-700/40"
        >
          🌈 Change Icon
        </ContextMenuItem>
        <ContextMenuItem
          onSelect={onDelete}
          inset
          className="text-red-400 focus:bg-red-600 focus:text-white hover:bg-red-600/30"
        >
          🗑 Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};
