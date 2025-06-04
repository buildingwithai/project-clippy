import * as React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { motion, useMotionValue, useSpring, useTransform, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';

interface CustomTooltipProps {
  children: React.ReactNode;
  content: string;
  side?: 'top' | 'right' | 'bottom' | 'left';
}

export function CustomTooltip({ children, content, side = 'bottom' }: CustomTooltipProps) {
  const [isHovered, setIsHovered] = React.useState(false);
  const [tooltipPos, setTooltipPos] = React.useState<{ left: number; top: number } | null>(null);
  const [targetElement, setTargetElement] = React.useState<HTMLElement | null>(null);
  
  // Spring animation values - matching Aceternity's config
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

  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    const target = e.currentTarget;
    const halfWidth = target.offsetWidth / 2;
    x.set((e.nativeEvent as MouseEvent).offsetX - halfWidth);
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLElement>) => {
    setIsHovered(true);
    setTargetElement(e.currentTarget);
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipPos({
      left: rect.left + rect.width / 2,
      top: rect.top - 8,
    });
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setTooltipPos(null);
  };

  return (
    <TooltipPrimitive.Provider>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger 
          asChild 
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onMouseMove={isHovered ? handleMouseMove : undefined}
        >
          {React.cloneElement(children as React.ReactElement, {
            style: {
              ...(children as React.ReactElement).props.style,
              rotate: isHovered ? rotate : 0,
              translateX: isHovered ? translateX : 0,
              scale: isHovered ? 1.15 : 1,
              transition: 'all 0.2s cubic-bezier(.4,2,.6,1)',
              zIndex: isHovered ? 10 : 1,
            },
          })}
        </TooltipPrimitive.Trigger>
        
        {isHovered && tooltipPos && createPortal(
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.6, rotate: 0 }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
              rotate: isHovered ? -1 * (typeof rotate.get === 'function' ? rotate.get() : 0) : 0,
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
            className="px-3 py-2 rounded-xl bg-slate-800 text-slate-100 shadow-lg text-xs font-semibold whitespace-nowrap border border-slate-700"
          >
            {content}
          </motion.div>,
          document.body
        )}
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}
