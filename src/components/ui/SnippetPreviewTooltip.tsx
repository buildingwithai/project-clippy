import * as React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { motion } from 'framer-motion';
import { createPortal } from 'react-dom';
import DOMPurify from 'dompurify';

interface SnippetPreviewTooltipProps {
  children: React.ReactElement;
  text?: string;
  html?: string;
  side?: 'top' | 'right' | 'bottom' | 'left' | 'bottom-left' | 'left-close';
  maxWidthPx?: number; // allow slight customization if needed
}

// Reuse the same positioning logic as CustomTooltip to keep look/feel consistent
function getPositionFromSide(rect: DOMRect, side: 'top' | 'right' | 'bottom' | 'left' | 'bottom-left' | 'left-close') {
  switch (side) {
    case 'top':
      return { left: rect.left + rect.width / 2, top: rect.top - 4 };
    case 'right':
      return { left: rect.right + 4, top: rect.top + rect.height / 2 };
    case 'left':
      return { left: rect.left - 35, top: rect.bottom - 12 };
    case 'left-close':
      return { left: rect.left - 15, top: rect.bottom - 12 };
    case 'bottom-left':
      return { left: rect.left - 10, top: rect.bottom + 4 };
    case 'bottom':
    default:
      return { left: rect.left + rect.width / 2, top: rect.bottom + 4 };
  }
}

export function SnippetPreviewTooltip({
  children,
  text,
  html,
  side = 'bottom-left',
  maxWidthPx = 380,
}: SnippetPreviewTooltipProps) {
  const [isHovered, setIsHovered] = React.useState(false);
  const [tooltipPos, setTooltipPos] = React.useState<{ left: number; top: number } | null>(null);

  // Position relative to the popup root (#root) to avoid viewport/scrollbar drift
  const computeClampedPos = React.useCallback((rect: DOMRect) => {
    const base = getPositionFromSide(rect, side);
    const root = document.getElementById('root');
    const rootRect = root?.getBoundingClientRect();
    const centeredLeft = rootRect
      ? (rootRect.left + (rootRect.width / 2))
      : ((document.documentElement?.clientWidth || window.innerWidth || 0) / 2);
    const OFFSET_X_BASE = -120; // base position for plain text
    const extraHtmlOffset = html ? -30 : 0; // nudge rich HTML a bit further left
    const OFFSET_X = OFFSET_X_BASE + extraHtmlOffset;
    const top = base.top; // viewport-aligned for fixed positioning
    return { left: centeredLeft + OFFSET_X, top };
  }, [side, html]);

  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    if (isHovered) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      setTooltipPos(computeClampedPos(rect));
    }
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLElement>) => {
    setIsHovered(true);
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipPos(computeClampedPos(rect));
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setTooltipPos(null);
  };

  // Prepare content
  const hasHtml = typeof html === 'string' && html.trim().length > 0;
  const hasText = typeof text === 'string' && text.trim().length > 0;
  const sanitizedHtml = React.useMemo(() => {
    if (!hasHtml) return '';
    return DOMPurify.sanitize(html!, { USE_PROFILES: { html: true } });
  }, [html, hasHtml]);

  const plainFromHtml = React.useMemo(() => {
    if (!hasHtml) return '';
    const tmp = html!.replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<script[\s\S]*?<\/script>/gi, '');
    const textOnly = tmp.replace(/<[^>]+>/g, '');
    return textOnly.trim();
  }, [html, hasHtml]);

  return (
    <TooltipPrimitive.Provider>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger
          asChild
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onMouseMove={isHovered ? handleMouseMove : undefined}
        >
          {children}
        </TooltipPrimitive.Trigger>

        {isHovered && tooltipPos && createPortal(
          <motion.div
            initial={{ opacity: 0, y: -5, rotate: -1 }}
            animate={{
              opacity: 1,
              y: 0,
              rotate: [0, -1, 1, -1, 0],
              transition: {
                opacity: { duration: 0.1 },
                y: { type: 'spring', stiffness: 500, damping: 15, mass: 0.5 },
                rotate: { duration: 0.7, ease: [0.4, 0, 0.6, 1], repeat: Infinity, repeatType: 'reverse' },
              },
            }}
            exit={{ opacity: 0, y: -5, transition: { duration: 0.1 } }}
            style={{
              position: 'fixed',
              left: tooltipPos.left,
              top: tooltipPos.top,
              zIndex: 9999,
              pointerEvents: 'none',
              // Match the compact preview font-size from VersionCarousel (10px)
              fontSize: '10px',
              lineHeight: '1.5',
              transformOrigin: 'center center',
              transform: `translate(-50%, ${side === 'top' ? '-100%' : (side === 'left' || side === 'right' || side === 'left-close') ? '-50%' : '0'})`,
              maxWidth: `${Math.max(180, Math.min(maxWidthPx, (document.getElementById('root')?.getBoundingClientRect().width || document.documentElement?.clientWidth || window.innerWidth || 0) - 24))}px`,
              maxHeight: '70vh',
              contain: 'layout paint',
            }}
            className="px-3 py-2 rounded-md bg-slate-800/95 backdrop-blur-sm text-slate-100 shadow-lg font-medium border border-slate-700/50"
            role="tooltip"
            aria-live="polite"
          >
            {/* Scoped HTML normalization to keep one font size and sane spacing */}
            <style
              dangerouslySetInnerHTML={{
                __html: `
                  .snippet-preview-tooltip * { font-size: 1em !important; }
                  .snippet-preview-tooltip { overflow-wrap: anywhere; word-break: break-word; }
                  .snippet-preview-tooltip img, .snippet-preview-tooltip svg, .snippet-preview-tooltip video, .snippet-preview-tooltip iframe { max-width: 100%; height: auto; }
                  .snippet-preview-tooltip table { table-layout: fixed; width: 100%; border-collapse: collapse; }
                  .snippet-preview-tooltip td, .snippet-preview-tooltip th { word-break: break-word; overflow-wrap: anywhere; }
                  .snippet-preview-tooltip h1, .snippet-preview-tooltip h2, .snippet-preview-tooltip h3,
                  .snippet-preview-tooltip h4, .snippet-preview-tooltip h5, .snippet-preview-tooltip h6 {
                    margin: 0.35rem 0; font-weight: 600; color: #cbd5e1;
                  }
                  .snippet-preview-tooltip p { margin: 0.35rem 0; color: #cbd5e1; }
                  .snippet-preview-tooltip ul { list-style: disc; margin: 0.35rem 0 0.35rem 1.25rem; }
                  .snippet-preview-tooltip ol { list-style: decimal; margin: 0.35rem 0 0.35rem 1.25rem; }
                  .snippet-preview-tooltip li { margin: 0.25rem 0; color: #cbd5e1; }
                  .snippet-preview-tooltip blockquote { border-left: 3px solid #475569; padding-left: 0.5rem; margin: 0.35rem 0; color: #94a3b8; font-style: italic; }
                  .snippet-preview-tooltip code { background-color: #1e293b; color: #fbbf24; padding: 0.1rem 0.2rem; border-radius: 0.2rem; white-space: pre-wrap; word-break: break-word; }
                  .snippet-preview-tooltip pre { background-color: #1e293b; padding: 0.5rem; border-radius: 0.25rem; overflow-x: auto; margin: 0.35rem 0; max-width: 100%; }
                  .snippet-preview-tooltip a { color: #7dd3fc; text-decoration: underline; }
                `,
              }}
            />

            <div
              className="snippet-preview-tooltip overflow-auto"
              style={{
                maxHeight: '65vh',
                maxWidth: `${Math.max(180, Math.min(maxWidthPx, (document.getElementById('root')?.getBoundingClientRect().width || document.documentElement?.clientWidth || window.innerWidth || 0) - 24))}px`,
              }}
            >
              {hasHtml ? (
                sanitizedHtml.trim() ? (
                  <div
                    className="whitespace-pre-wrap break-words"
                    dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
                  />
                ) : (
                  <pre className="whitespace-pre-wrap break-words text-slate-100">{plainFromHtml}</pre>
                )
              ) : hasText ? (
                <pre className="whitespace-pre-wrap break-words text-slate-100">{text}</pre>
              ) : null}
            </div>
          </motion.div>,
          document.body
        )}
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}
