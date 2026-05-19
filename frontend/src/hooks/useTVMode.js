import { useState, useEffect, useCallback } from "react";

const TV_KEYS = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Enter"];
const TV_MODE_MIN_WIDTH = 1600;

function isFinePointerDesktop() {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(hover: hover) and (pointer: fine)").matches
  );
}

function isTVLikeViewport() {
  return (
    typeof window !== "undefined" &&
    window.innerWidth >= TV_MODE_MIN_WIDTH &&
    !isFinePointerDesktop()
  );
}

/**
 * useTVMode - Detects and manages TV mode with spatial navigation
 * Automatically enables on TV-like large screens, or when remote keys are used on TV-like devices.
 *
 * @returns {boolean} - Is TV mode active
 */
export function useTVMode() {
  const [isTVMode, setIsTVMode] = useState(false);

  // Helper function to get focusable elements
  const getFocusableElements = useCallback(() => {
    const selectors = [
      "button:not([disabled])",
      "a[href]",
      "input:not([disabled])",
      "select:not([disabled])",
      "textarea:not([disabled])",
      '[tabindex]:not([tabindex="-1"])',
    ].join(", ");

    return Array.from(document.querySelectorAll(selectors)).filter((el) => {
      if (el.classList?.contains("skip-link")) return false;
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      return (
        rect.width > 0 &&
        rect.height > 0 &&
        rect.bottom > 0 &&
        rect.right > 0 &&
        style.visibility !== "hidden" &&
        style.display !== "none"
      );
    });
  }, []);

  const findFocusableTarget = useCallback(
    () => getFocusableElements()[0],
    [getFocusableElements],
  );

  const findNextByDirection = useCallback(
    (currentElement, direction) => {
      const currentRect = currentElement?.getBoundingClientRect?.();
      if (!currentRect) return null;

      const currentCenterX = currentRect.left + currentRect.width / 2;
      const currentCenterY = currentRect.top + currentRect.height / 2;
      const focusables = getFocusableElements().filter(
        (el) => el !== currentElement,
      );

      const candidates = focusables
        .map((el) => {
          const rect = el.getBoundingClientRect();
          const centerX = rect.left + rect.width / 2;
          const centerY = rect.top + rect.height / 2;
          const dx = centerX - currentCenterX;
          const dy = centerY - currentCenterY;

          switch (direction) {
            case "ArrowRight":
              if (dx <= 8) return null;
              break;
            case "ArrowLeft":
              if (dx >= -8) return null;
              break;
            case "ArrowDown":
              if (dy <= 8) return null;
              break;
            case "ArrowUp":
              if (dy >= -8) return null;
              break;
            default:
              return null;
          }

          const primaryDistance =
            direction === "ArrowLeft" || direction === "ArrowRight"
              ? Math.abs(dx)
              : Math.abs(dy);
          const crossDistance =
            direction === "ArrowLeft" || direction === "ArrowRight"
              ? Math.abs(dy)
              : Math.abs(dx);

          // Prefer elements that are actually in the requested direction and roughly aligned.
          const score = primaryDistance + crossDistance * 0.55;

          return { el, score };
        })
        .filter(Boolean)
        .sort((a, b) => a.score - b.score);

      return candidates[0]?.el || null;
    },
    [getFocusableElements],
  );

  // Detect TV remote key presses. Do not enable TV mode on normal desktop PCs,
  // because desktop users often press arrow keys to scroll and that caused the
  // large-screen TV CSS to rapidly toggle with mouse movement.
  const handleKeyDown = useCallback(
    (e) => {
      if (TV_KEYS.includes(e.key)) {
        if (!isTVMode) {
          if (!isTVLikeViewport()) return;
          setIsTVMode(true);
        }

        // Auto-focus first element if stuck on body
        const activeElement = document.activeElement;
        const activeIsSkipLink =
          activeElement?.classList?.contains("skip-link");
        if (
          activeElement === document.body ||
          !activeElement ||
          activeIsSkipLink
        ) {
          const focusable = findFocusableTarget();
          if (focusable) {
            focusable.focus();
            e.preventDefault();
          }
          return;
        }

        if (e.key.startsWith("Arrow")) {
          const nextElement = findNextByDirection(activeElement, e.key);
          if (nextElement) {
            nextElement.focus();
            e.preventDefault();
          }
        }
      }
    },
    [isTVMode, findFocusableTarget, findNextByDirection],
  );

  // Detect mouse usage to revert to PC mode (only if user explicitly moved mouse)
  const handleMouseMove = useCallback(
    (e) => {
      // Only disable TV mode if mouse actually moved (not just touched)
      if (isTVMode && e.clientX !== 0 && e.clientY !== 0) {
        setIsTVMode(false);
        document.documentElement.classList.remove("tv-mode");
      }
    },
    [isTVMode],
  );

  // Also consider touch as non-TV mode
  const handleTouchStart = useCallback(() => {
    if (isTVMode) {
      setIsTVMode(false);
      document.documentElement.classList.remove("tv-mode");
    }
  }, [isTVMode]);

  // Auto-enable only for TV-like large screens. A large desktop monitor with a
  // precise mouse/trackpad should stay in desktop mode to avoid layout shaking.
  useEffect(() => {
    const syncTVMode = () => {
      const shouldUseTVMode = isTVLikeViewport();
      setIsTVMode((current) =>
        current === shouldUseTVMode ? current : shouldUseTVMode,
      );
    };

    window.addEventListener("resize", syncTVMode, { passive: true });
    syncTVMode();

    return () => window.removeEventListener("resize", syncTVMode);
  }, []);

  // Set up keyboard and mouse event listeners
  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown, true);
    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("touchstart", handleTouchStart, { passive: true });

    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("touchstart", handleTouchStart);
    };
  }, [handleKeyDown, handleMouseMove, handleTouchStart]);

  // Update HTML class on mount and when TV mode changes
  useEffect(() => {
    if (isTVMode) {
      document.documentElement.classList.add("tv-mode");
    } else {
      document.documentElement.classList.remove("tv-mode");
    }
  }, [isTVMode]);

  return isTVMode;
}

export default useTVMode;
