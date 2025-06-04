"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from "framer-motion";
import { cn } from "@/lib/utils";

interface AnimatedTooltipProps {
  items: { id: string; name: string; emoji: string }[];
  className?: string;
  activeId?: string | null;
  editingId?: string | null;
  editingValue?: string;
  onClick?: (item: { id: string; name: string; emoji: string }) => void;
  onDoubleClick?: (item: { id: string; name: string; emoji: string }) => void;
  onContextMenu?: (item: { id: string; name: string; emoji: string }, e: React.MouseEvent) => void;
  onRenameChange?: (value: string) => void;
  onRenameSubmit?: (item: { id: string; name: string; emoji: string }) => void;
}

export const AnimatedTooltip: React.FC<AnimatedTooltipProps> = ({
  items,
  className,
  activeId,
  editingId,
  editingValue,
  onClick,
  onDoubleClick,
  onContextMenu,
  onRenameChange,
  onRenameSubmit,
}) => {
  const [hoveredIndex, setHoveredIndex] = React.useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = React.useState<{ left: number; top: number } | null>(null);
  const [hoveredItem, setHoveredItem] = React.useState<{ id: string; name: string; emoji: string } | null>(null);

  const springConfig = { stiffness: 100, damping: 5 };
  const x = useMotionValue(0);
  const rotate = useSpring(
    useTransform(x, [-100, 100], [-45, 45]),
    springConfig
  );
  const translateX = useSpring(
    useTransform(x, [-100, 100], [-50, 50]),
    springConfig
  );
  const handleMouseMove = (event: React.MouseEvent<HTMLButtonElement>) => {
    const target = event.target as HTMLElement;
    const halfWidth = target.offsetWidth / 2;
    x.set((event.nativeEvent as MouseEvent).offsetX - halfWidth);
  };

  // Reset tooltip state if items array changes (sidebar collapse/expand, folder change)
  React.useEffect(() => {
    setHoveredIndex(null);
    setHoveredItem(null);
    setTooltipPos(null);
  }, [items.length]);

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {items.map((item) => {
        const isEditing = editingId === item.id;
        return (
          <div key={item.id} className="mb-2 flex justify-center">
            {isEditing ? (
              <input
                value={editingValue}
                onChange={e => onRenameChange && onRenameChange(e.target.value)}
                onBlur={() => onRenameSubmit && onRenameSubmit(item)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && onRenameSubmit) onRenameSubmit(item);
                  if (e.key === 'Escape' && onRenameSubmit) onRenameSubmit(item);
                }}
                className="bg-slate-900 border border-sky-500 text-slate-100 rounded px-1 w-24 text-sm outline-none"
                autoFocus
                style={{ zIndex: 20, position: 'relative' }}
              />
            ) : (
              <motion.button
                type="button"
                className={
                  `bg-transparent border-none outline-none cursor-pointer flex items-center justify-center ` +
                  (activeId === item.id ? 'bg-sky-900/40 border border-sky-500' : 'hover:bg-slate-800') +
                  ' w-10 h-10 rounded-md transition-colors text-2xl'
                }
                style={{
                  rotate: hoveredIndex === item.id ? rotate : 0,
                  translateX: hoveredIndex === item.id ? translateX : 0,
                  scale: hoveredIndex === item.id ? 1.15 : 1,
                  zIndex: hoveredIndex === item.id ? 10 : 1,
                  transition: 'all 0.2s cubic-bezier(.4,2,.6,1)',
                  fontSize: '2rem',
                  padding: 0,
                  margin: 0,
                }}
                onMouseMove={hoveredIndex === item.id ? (e) => handleMouseMove(e as any) : undefined}
                onMouseEnter={e => {
                  setHoveredIndex(item.id);
                  setHoveredItem(item);
                  const btn = e.currentTarget;
                  if (btn) {
                    const rect = btn.getBoundingClientRect();
                    setTooltipPos({
                      left: rect.left + rect.width / 2,
                      top: rect.top - 8,
                    });
                  }
                }}
                onMouseLeave={() => {
                  setHoveredIndex(null);
                  setHoveredItem(null);
                  setTooltipPos(null);
                }}
                tabIndex={0}
                aria-label={item.name}
                onClick={() => onClick && onClick(item)}
                onDoubleClick={() => onDoubleClick && onDoubleClick(item)}
                onContextMenu={e => {
                  if (onContextMenu) onContextMenu(item, e);
                }}
              >
                <span>{item.emoji}</span>
              </motion.button>
            )}
          </div>
        );
      })}
      {/* Tooltip rendered outside the map */}
      {hoveredIndex && hoveredItem && tooltipPos && createPortal(
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.6, rotate: 0 }}
          animate={{
            opacity: 1,
            y: 0,
            scale: 1,
            rotate: hoveredIndex ? -1 * (typeof rotate.get === 'function' ? rotate.get() : 0) : 0,
            transition: {
              type: 'spring',
              stiffness: 100,
              damping: 5,
            },
          }}
          exit={{ opacity: 0, y: 20, scale: 0.6, rotate: 0 }}
          style={{
            position: 'fixed',
            left: tooltipPos.left,
            top: tooltipPos.top,
            transform: 'translate(-50%, -100%)',
            zIndex: 9999,
            pointerEvents: 'none',
          }}
          className="px-3 py-2 rounded-xl bg-white text-slate-900 shadow-lg text-xs font-semibold whitespace-nowrap"
        >
          {hoveredItem.name}
        </motion.div>,
        document.body
      )}
    </div>
  );
};