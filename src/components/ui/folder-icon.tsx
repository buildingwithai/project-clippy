import React from 'react';
import * as LucideIcons from 'lucide-react';
import * as HeroIcons from '@heroicons/react/24/outline';
import * as IconoirIcons from 'iconoir-react';
import { cn } from '@/lib/utils';

export interface FolderIconProps {
  /**
   * Stored icon value. Examples:
   *   😀                -> emoji
   *   lucide:Folder     -> Lucide icon named 'Folder'
   *   hero:ArchiveBox   -> Hero icon named 'ArchiveBox'
   *   iconoir:Home      -> Iconoir icon named 'Home'
   */
  value?: string;
  className?: string;
  size?: number;
}

export const FolderIcon: React.FC<FolderIconProps> = ({ value, className, size = 18 }) => {
  // Default fallback
  if (!value) return <span className={cn('text-base', className)}>📁</span>;

  // Plain emoji (no namespace)
  if (!value.includes(':')) {
    return <span className={cn('text-base', className)}>{value}</span>;
  }

  const [set, iconName] = value.split(':');
  let Comp: any;
  switch (set) {
    case 'lucide':
      Comp = (LucideIcons as any)[iconName];
      break;
    case 'hero':
      Comp = (HeroIcons as any)[iconName];
      break;
    case 'iconoir':
      Comp = (IconoirIcons as any)[iconName];
      break;
  }

  if (Comp) {
    // Heroicons use className for size, others accept size prop
    if (set === 'hero') {
      return <Comp className={cn(className)} style={{ width: size, height: size }} />;
    }
    return <Comp size={size} className={className} />;
  }

  // Fallback to folder emoji if component not found
  return <span className={cn('text-base', className)}>📁</span>;
};
