import React from 'react';
import { cn } from '@/lib/utils';

/**
 * Pill component for concise metadata labels.
 *
 * Variants map to preset Tailwind colour classes that meet WCAG AA contrast on white backgrounds.
 */
export type PillVariant = 'created' | 'folder' | 'used' | 'lastUsed';

const variantClasses: Record<PillVariant, string> = {
  created: 'bg-emerald-200 text-emerald-700',
  folder: 'bg-indigo-200 text-indigo-700',
  used: 'bg-sky-200 text-sky-700',
  lastUsed: 'bg-slate-200 text-slate-700',
};

interface PillProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant: PillVariant;
  /**
   * Content rendered inside the pill.
   * Keep this short (≤ 10-12 characters) for best appearance.
   */
  children: React.ReactNode;
  className?: string;
}

export const Pill: React.FC<PillProps> = ({ variant, children, className, ...props }) => (
  <span
    {...props}
    className={cn(
      'inline-flex items-center rounded-full px-1.5 py-px text-[10px] font-medium gap-0.5 select-none',
      variantClasses[variant],
      className
    )}
  >
    {children}
  </span>
);
