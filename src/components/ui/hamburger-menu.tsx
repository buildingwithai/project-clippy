/**
 * Hamburger menu component for snippet actions.
 * Groups all snippet tools (edit, delete, etc.) in a clean dropdown.
 * Enhanced with full keyboard navigation and accessibility support.
 */
import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Edit, Trash2, FolderOpen, ExternalLink, Star } from 'lucide-react';

interface HamburgerMenuProps {
  onEdit?: () => void;
  onDelete?: () => void;
  onMoveToFolder?: () => void;
  onViewSource?: () => void;
  hasSourceUrl?: boolean;
  onTogglePin?: () => void;
  isPinned?: boolean;
  className?: string;
}

export const HamburgerMenu: React.FC<HamburgerMenuProps> = ({
  onEdit,
  onDelete,
  onMoveToFolder,
  onViewSource,
  hasSourceUrl = false,
  onTogglePin,
  isPinned = false,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuItemsRef = useRef<(HTMLButtonElement | null)[]>([]);

  // Build available menu items dynamically
  const menuItems = [
    ...(onEdit ? [{ action: onEdit, label: 'Edit', icon: Edit, className: 'text-slate-200 hover:bg-slate-700 hover:text-white' }] : []),
    ...(onTogglePin ? [{ action: onTogglePin, label: isPinned ? 'Unpin' : 'Pin', icon: Star, className: 'text-slate-200 hover:bg-slate-700 hover:text-white' }] : []),
    ...(onMoveToFolder ? [{ action: onMoveToFolder, label: 'Move to Folder', icon: FolderOpen, className: 'text-slate-200 hover:bg-slate-700 hover:text-white' }] : []),
    ...(hasSourceUrl && onViewSource ? [{ action: onViewSource, label: 'View Source', icon: ExternalLink, className: 'text-slate-200 hover:bg-slate-700 hover:text-white', separator: true }] : []),
    ...(onDelete ? [{ action: onDelete, label: 'Delete', icon: Trash2, className: 'text-red-400 hover:bg-red-900/20 hover:text-red-300', separator: true }] : []),
  ];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setFocusedIndex(-1);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;
      
      switch (event.key) {
        case 'Escape':
          event.preventDefault();
          setIsOpen(false);
          setFocusedIndex(-1);
          buttonRef.current?.focus();
          break;
        case 'ArrowDown':
          event.preventDefault();
          setFocusedIndex((prev) => (prev + 1) % menuItems.length);
          break;
        case 'ArrowUp':
          event.preventDefault();
          setFocusedIndex((prev) => (prev - 1 + menuItems.length) % menuItems.length);
          break;
        case 'Enter':
        case ' ':
          if (focusedIndex >= 0) {
            event.preventDefault();
            handleAction(menuItems[focusedIndex].action);
          }
          break;
        case 'Home':
          event.preventDefault();
          setFocusedIndex(0);
          break;
        case 'End':
          event.preventDefault();
          setFocusedIndex(menuItems.length - 1);
          break;
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, focusedIndex, menuItems]);

  // Focus management
  useEffect(() => {
    if (isOpen && focusedIndex >= 0 && menuItemsRef.current[focusedIndex]) {
      menuItemsRef.current[focusedIndex]?.focus();
    }
  }, [focusedIndex, isOpen]);

  const handleAction = (action: () => void) => {
    action();
    setIsOpen(false);
    setFocusedIndex(-1);
  };

  const handleToggle = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setFocusedIndex(0); // Start with first item focused when opening
    } else {
      setFocusedIndex(-1);
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      <Button
        ref={buttonRef}
        variant="ghost"
        size="sm"
        onClick={handleToggle}
        className={`h-6 w-6 p-0 text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-colors ${className}`}
        aria-label="More actions"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <MoreHorizontal className="h-3 w-3" />
      </Button>

      {isOpen && (
        <div 
          className="absolute right-0 top-full z-50 w-40 mt-1 bg-slate-800 border border-slate-700 rounded-md shadow-lg text-slate-100"
          role="menu"
          aria-orientation="vertical"
        >
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <div key={item.label}>
                {item.separator && index > 0 && (
                  <div className="h-px bg-slate-700 mx-1" aria-hidden="true" />
                )}
                <button
                  ref={(el) => { menuItemsRef.current[index] = el; }}
                  onClick={() => handleAction(item.action)}
                  onMouseEnter={() => setFocusedIndex(index)}
                  className={`w-full flex items-center px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-inset ${item.className} ${
                    index === 0 ? 'first:rounded-t-md' : ''
                  } ${
                    index === menuItems.length - 1 ? 'last:rounded-b-md' : ''
                  } ${
                    focusedIndex === index ? 'bg-slate-700' : ''
                  }`}
                  role="menuitem"
                  tabIndex={-1}
                >
                  <Icon className="mr-2 h-3 w-3" aria-hidden="true" />
                  {item.label}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
