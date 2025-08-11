import React from 'react';
import { cn } from '@/lib/utils';

interface HotkeyBadgeProps {
  hotkey: string; // The actual hotkey like "Ctrl+1"
  className?: string;
}

export const HotkeyBadge: React.FC<HotkeyBadgeProps> = ({
  hotkey,
  className,
}) => {
  return (
    <div 
      className={cn(
        "inline-flex items-center justify-center px-1 py-0.5 text-[9px] font-mono font-semibold",
        "bg-sky-500/20 text-sky-300 border border-sky-500/40 rounded",
        "transition-colors duration-200 leading-none",
        className
      )}
      title={`Hotkey: ${hotkey}`}
    >
      {hotkey}
    </div>
  );
};