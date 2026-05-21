import { useState, useEffect, useCallback, useRef } from "react";

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

export function useTVMode() {
  const [isTVMode, setIsTVMode] = useState(() => isTVLikeViewport());
  const isTVModeRef = useRef(isTVMode);
  isTVModeRef.current = isTVMode;

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

          const score = primaryDistance + crossDistance * 0.55;

          return { el, score };
        })
        .filter(Boolean)
        .sort((a, b) => a.score - b.score);

      return candidates[0]?.el || null;
    },
    [getFocusableElements],
  );

  const findNextRef = useRef(findNextByDirection);
  findNextRef.current = findNextByDirection;
  const findTargetRef = useRef(findFocusableTarget);
  findTargetRef.current = findFocusableTarget;

  const handleKeyDown = useCallback((e) => {
    if (TV_KEYS.includes(e.key)) {
      if (!isTVModeRef.current) {
        if (!isTVLikeViewport()) return;
        setIsTVMode(true);
      }

      const activeElement = document.activeElement;
      const activeIsSkipLink =
        activeElement?.classList?.contains("skip-link");
      if (
        activeElement === document.body ||
        !activeElement ||
        activeIsSkipLink
      ) {
        const focusable = findTargetRef.current();
        if (focusable) {
          focusable.focus();
          e.preventDefault();
        }
        return;
      }

      if (e.key.startsWith("Arrow")) {
        const nextElement = findNextRef.current(activeElement, e.key);
        if (nextElement) {
          nextElement.focus();
          e.preventDefault();
        }
      }
    }
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (isTVModeRef.current && e.clientX !== 0 && e.clientY !== 0) {
      setIsTVMode(false);
      document.documentElement.classList.remove("tv-mode");
    }
  }, []);

  const handleTouchStart = useCallback(() => {
    if (isTVModeRef.current) {
      setIsTVMode(false);
      document.documentElement.classList.remove("tv-mode");
    }
  }, []);

  useEffect(() => {
    const cleanup = { fn: null };

    const timer = setTimeout(() => {
      const syncTVMode = () => {
        const shouldUseTVMode = isTVLikeViewport();
        setIsTVMode((current) =>
          current === shouldUseTVMode ? current : shouldUseTVMode,
        );
      };

      window.addEventListener("resize", syncTVMode, { passive: true });
      syncTVMode();
      window.addEventListener("keydown", handleKeyDown, true);
      window.addEventListener("mousemove", handleMouseMove, { passive: true });
      window.addEventListener("touchstart", handleTouchStart, { passive: true });

      cleanup.fn = () => {
        window.removeEventListener("resize", syncTVMode);
        window.removeEventListener("keydown", handleKeyDown, true);
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("touchstart", handleTouchStart);
      };
    }, 0);

    return () => {
      clearTimeout(timer);
      cleanup.fn?.();
    };
  }, [handleKeyDown, handleMouseMove, handleTouchStart]);

  useEffect(() => {
    if (isTVMode) {
      document.documentElement.classList.add("tv-mode");
      import("../styles/tv-mode.css").catch(() => {});
    } else {
      document.documentElement.classList.remove("tv-mode");
    }
  }, [isTVMode]);

  return isTVMode;
}

export default useTVMode;
