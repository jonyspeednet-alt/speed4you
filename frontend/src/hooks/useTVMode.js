import { useState, useEffect, useCallback } from 'react';

const TV_KEYS = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter'];

/**
 * useTVMode - Detects and manages TV mode with spatial navigation
 * Automatically enables with arrow key navigation or large screen (1600px+)
 * 
 * @returns {boolean} - Is TV mode active
 */
export function useTVMode() {
  const [isTVMode, setIsTVMode] = useState(false);

  // Helper function to get focusable elements
  const getFocusableElements = useCallback(() => {
    const selectors = [
      'button:not([disabled])',
      'a[href]',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(', ');

    return Array.from(document.querySelectorAll(selectors)).filter((el) => {
      if (el.classList?.contains('skip-link')) return false;
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      return rect.width > 0
        && rect.height > 0
        && rect.bottom > 0
        && rect.right > 0
        && style.visibility !== 'hidden'
        && style.display !== 'none';
    });
  }, []);

  const findFocusableTarget = useCallback(() => getFocusableElements()[0], [getFocusableElements]);

  const findNextByDirection = useCallback((currentElement, direction) => {
    const currentRect = currentElement?.getBoundingClientRect?.();
    if (!currentRect) return null;

    const currentCenterX = currentRect.left + currentRect.width / 2;
    const currentCenterY = currentRect.top + currentRect.height / 2;
    const focusables = getFocusableElements().filter((el) => el !== currentElement);

    const candidates = focusables
      .map((el) => {
        const rect = el.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const dx = centerX - currentCenterX;
        const dy = centerY - currentCenterY;

        switch (direction) {
          case 'ArrowRight':
            if (dx <= 8) return null;
            break;
          case 'ArrowLeft':
            if (dx >= -8) return null;
            break;
          case 'ArrowDown':
            if (dy <= 8) return null;
            break;
          case 'ArrowUp':
            if (dy >= -8) return null;
            break;
          default:
            return null;
        }

        const primaryDistance = direction === 'ArrowLeft' || direction === 'ArrowRight'
          ? Math.abs(dx)
          : Math.abs(dy);
        const crossDistance = direction === 'ArrowLeft' || direction === 'ArrowRight'
          ? Math.abs(dy)
          : Math.abs(dx);

        // Prefer elements that are actually in the requested direction and roughly aligned.
        const score = primaryDistance + crossDistance * 0.55;

        return { el, score };
      })
      .filter(Boolean)
      .sort((a, b) => a.score - b.score);

    return candidates[0]?.el || null;
  }, [getFocusableElements]);

  // Detect TV remote key presses
  const handleKeyDown = useCallback((e) => {
    if (TV_KEYS.includes(e.key)) {
      if (!isTVMode) {
        setIsTVMode(true);
        document.documentElement.classList.add('tv-mode');
      }
      
      // Auto-focus first element if stuck on body
      const activeElement = document.activeElement;
      const activeIsSkipLink = activeElement?.classList?.contains('skip-link');
      if (activeElement === document.body || !activeElement || activeIsSkipLink) {
        const focusable = findFocusableTarget();
        if (focusable) {
          focusable.focus();
          e.preventDefault();
        }
        return;
      }

      if (e.key.startsWith('Arrow')) {
        const nextElement = findNextByDirection(activeElement, e.key);
        if (nextElement) {
          nextElement.focus();
          e.preventDefault();
        }
      }
    }
  }, [isTVMode, findFocusableTarget, findNextByDirection]);

  // Detect mouse usage to revert to PC mode (only if user explicitly moved mouse)
  const handleMouseMove = useCallback((e) => {
    // Only disable TV mode if mouse actually moved (not just touched)
    if (isTVMode && e.clientX !== 0 && e.clientY !== 0) {
      setIsTVMode(false);
      document.documentElement.classList.remove('tv-mode');
    }
  }, [isTVMode]);
  
  // Also consider touch as non-TV mode
  const handleTouchStart = useCallback(() => {
    if (isTVMode) {
      setIsTVMode(false);
      document.documentElement.classList.remove('tv-mode');
    }
  }, [isTVMode]);

  // Auto-enable TV mode for large screens
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1600 && !isTVMode) {
        setIsTVMode(true);
        document.documentElement.classList.add('tv-mode');
      } else if (window.innerWidth < 1600 && isTVMode) {
        setIsTVMode(false);
        document.documentElement.classList.remove('tv-mode');
      }
    };

    window.addEventListener('resize', handleResize, { passive: true });
    handleResize(); // Check on mount

    return () => window.removeEventListener('resize', handleResize);
  }, [isTVMode]);

  // Set up keyboard and mouse event listeners
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('touchstart', handleTouchStart, { passive: true });

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchstart', handleTouchStart);
    };
  }, [handleKeyDown, handleMouseMove, handleTouchStart]);

  // Update HTML class on mount and when TV mode changes
  useEffect(() => {
    if (isTVMode) {
      document.documentElement.classList.add('tv-mode');
    } else {
      document.documentElement.classList.remove('tv-mode');
    }
  }, [isTVMode]);

  return isTVMode;
}

export default useTVMode;
