import { useCallback, useRef } from 'react';

/**
 * Simple long-press hook.
 * Usage:
 * const longPress = useLongPress(() => doSomething(), 500);
 * <div {...longPress}>…</div>
 */
export function useLongPress<T extends HTMLElement>(
  callback: () => void,
  ms = 500,
) {
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const start = useCallback((e?: React.TouchEvent) => {
    // prevent default to avoid 300ms delay & context menu on mobile
    e?.preventDefault?.();
    timerRef.current = setTimeout(() => {
      callback();
    }, ms);
  }, [callback, ms]);

  const clear = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  return {
    onTouchStart: (e: any) => start(e),
    onTouchEnd: clear,
    onTouchMove: clear,
    onTouchCancel: clear,
  } as React.HTMLAttributes<T>;
}
