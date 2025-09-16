import { useEffect, useRef } from 'react';

export function useStableSticky() {
  const ref = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    
    // Force a stable position
    let rafId: number;
    let lastScrollY = window.scrollY;
    
    const stabilize = () => {
      if (element && window.scrollY !== lastScrollY) {
        lastScrollY = window.scrollY;
        // Force repaint to stabilize position
        element.style.transform = 'translateZ(0)';
      }
      rafId = requestAnimationFrame(stabilize);
    };
    
    // Start stabilization
    stabilize();
    
    return () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
    };
  }, []);
  
  return ref;
}