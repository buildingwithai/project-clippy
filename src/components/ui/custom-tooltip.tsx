import * as React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { motion, useMotionValue, useSpring, useTransform, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';

interface CustomTooltipProps {
  children: React.ReactNode;
  content: string;
  side?: 'top' | 'right' | 'bottom' | 'left';
}

// Helper function to calculate position based on side
function getPositionFromSide(rect: DOMRect, side: 'top' | 'right' | 'bottom' | 'left') {
  switch (side) {
    case 'top':
      return {
        left: rect.left + rect.width / 2, // Center horizontally
        top: rect.top - 4, // Position above with small gap
      };
    case 'right':
      return {
        left: rect.right + 4, // Position to the right with small gap
        top: rect.top + rect.height / 2, // Center vertically
      };
    case 'left':
      return {
        left: rect.left - 35, // Increased offset to move further left
        top: rect.bottom - 12, // Position towards the bottom of the element
      };
    case 'bottom':
    default:
      return {
        left: rect.left + rect.width / 2, // Center horizontally
        top: rect.bottom + 4, // Position below with small gap
      };
  }
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
    
    // Update tooltip position during movement
    if (isHovered) {
      const rect = target.getBoundingClientRect();
      setTooltipPos(getPositionFromSide(rect, side));
    }
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLElement>) => {
    setIsHovered(true);
    setTargetElement(e.currentTarget);
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipPos(getPositionFromSide(rect, side));
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
              scale: isHovered ? 1.1 : 1, // Reduced scale effect
              transition: 'all 0.2s cubic-bezier(.4,2,.6,1)',
              zIndex: isHovered ? 10 : 1,
            },
          })}
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
                y: { 
                  type: 'spring',
                  stiffness: 500,
                  damping: 15,
                  mass: 0.5
                },
                rotate: {
                  duration: 0.7,
                  ease: [0.4, 0, 0.6, 1],
                  repeat: Infinity,
                  repeatType: 'reverse'
                }
              },
            }}
            exit={{ 
              opacity: 0, 
              y: -5,
              transition: { duration: 0.1 }
            }}
            style={{
              position: 'fixed',
              left: tooltipPos.left,
              top: tooltipPos.top,
              zIndex: 9999,
              pointerEvents: 'none',
              fontSize: '0.7rem',
              lineHeight: '1rem',
              transformOrigin: 'center center',
              transform: `translate(${side === 'right' ? '0' : side === 'left' ? '-100%' : '-50%'}, ${side === 'bottom' ? '0' : side === 'top' ? '-100%' : (side === 'left' ? '-50%' : '-50%')})`,
            }}
            className="px-2 py-1 rounded-md bg-slate-800/95 backdrop-blur-sm text-slate-100 shadow-lg font-medium whitespace-nowrap border border-slate-700/50"
          >
            {content}
          </motion.div>,
          document.body
        )}
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}
