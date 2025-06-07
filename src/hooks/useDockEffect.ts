import { useRef, useState, useEffect, useCallback } from 'react';

interface DockEffectProps {
  itemCount: number;
  baseSize?: number;
  maxScale?: number;
  effectWidth?: number;
}

export function useDockEffect({ 
  itemCount,
  baseSize = 40, 
  maxScale = 1.4, 
  effectWidth = 200 
}: DockEffectProps) {
  const [scales, setScales] = useState<number[]>(Array(itemCount).fill(1));
  const [mouseX, setMouseX] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const animationFrameRef = useRef<number>();
  const lastMouseMoveTime = useRef<number>(0);
  const baseSpacing = Math.max(4, baseSize * 0.1);
  const minScale = 1.0;

  const updateScales = useCallback(() => {
    if (mouseX === null || !containerRef.current) {
      setScales(Array(itemCount).fill(minScale));
      return;
    }

    const containerRect = containerRef.current.getBoundingClientRect();
    const containerCenter = containerRect.left + containerRect.width / 2;
    const adjustedMouseX = mouseX - containerRect.left;
    
    const newScales = Array(itemCount).fill(minScale);
    
    itemRefs.current.forEach((item, index) => {
      if (!item) return;
      
      const itemRect = item.getBoundingClientRect();
      const itemCenter = itemRect.left + itemRect.width / 2 - containerRect.left;
      const distance = Math.abs(adjustedMouseX - itemCenter);
      
      if (distance < effectWidth / 2) {
        const distanceRatio = 1 - (distance / (effectWidth / 2));
        const scale = minScale + (maxScale - minScale) * Math.pow(distanceRatio, 2);
        newScales[index] = scale;
      }
    });
    
    setScales(newScales);
    animationFrameRef.current = requestAnimationFrame(updateScales);
  }, [mouseX, itemCount, maxScale, minScale, effectWidth]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const now = Date.now();
      if (now - lastMouseMoveTime.current < 16) { // ~60fps
        return;
      }
      lastMouseMoveTime.current = now;
      setMouseX(e.clientX);
    };

    const handleMouseLeave = () => {
      setMouseX(null);
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('mousemove', handleMouseMove);
      container.addEventListener('mouseleave', handleMouseLeave);
    }

    return () => {
      if (container) {
        container.removeEventListener('mousemove', handleMouseMove);
        container.removeEventListener('mouseleave', handleMouseLeave);
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (mouseX !== null) {
      animationFrameRef.current = requestAnimationFrame(updateScales);
    } else {
      setScales(Array(itemCount).fill(minScale));
    }
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [mouseX, updateScales, itemCount, minScale]);

  const getItemRef = (index: number) => (el: HTMLDivElement | null) => {
    itemRefs.current[index] = el;
  };

  return {
    containerRef,
    getItemRef,
    scales,
  };
}
