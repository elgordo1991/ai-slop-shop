import { useRef, type TouchEvent } from 'react';

const MIN_DISTANCE = 40; // px of horizontal travel to count as a swipe

/**
 * Horizontal swipe detection for photo carousels.
 * Spread the returned handlers on the swipeable element (give it `touch-action: pan-y`
 * so vertical page scrolling still works). `wasSwipe()` lets a click handler ignore
 * the tap that ends a swipe.
 */
export function useSwipe(onLeft: () => void, onRight: () => void) {
  const start = useRef<{ x: number; y: number } | null>(null);
  const swipedAt = useRef(0);

  return {
    handlers: {
      onTouchStart: (e: TouchEvent) => {
        const t = e.touches[0];
        start.current = { x: t.clientX, y: t.clientY };
      },
      onTouchEnd: (e: TouchEvent) => {
        if (!start.current) return;
        const t = e.changedTouches[0];
        const dx = t.clientX - start.current.x;
        const dy = t.clientY - start.current.y;
        start.current = null;
        if (Math.abs(dx) < MIN_DISTANCE || Math.abs(dx) < Math.abs(dy)) return;
        swipedAt.current = Date.now();
        if (dx < 0) onLeft();
        else onRight();
      },
    },
    wasSwipe: () => Date.now() - swipedAt.current < 400,
  };
}
