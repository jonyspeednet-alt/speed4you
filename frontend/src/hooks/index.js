import { useState, useEffect, useRef, useCallback } from "react";

export function useDebouncedSearch(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

// Breakpoint thresholds — keep in sync with global.css
const BREAKPOINTS = {
  SMALL_MOBILE: 420,
  MOBILE: 768,
  TABLET: 1024,
  LARGE_DESKTOP: 1440,
  TV: 1600,
  FOUR_K: 2500,
};

function getBreakpoint(w) {
  if (w < BREAKPOINTS.MOBILE) return "mobile";
  if (w < BREAKPOINTS.TABLET) return "tablet";
  return "desktop";
}

export function useBreakpoint() {
  const initialWidth = typeof window === "undefined" ? 1280 : window.innerWidth;
  const initialHeight =
    typeof window === "undefined" ? 720 : window.innerHeight;
  const [viewport, setViewport] = useState({
    width: initialWidth,
    height: initialHeight,
  });
  const rafRef = useRef(null);

  useEffect(() => {
    const handleResize = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        setViewport({ width: window.innerWidth, height: window.innerHeight });
      });
    };

    let observer;
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(handleResize);
      observer.observe(document.documentElement);
    } else {
      window.addEventListener("resize", handleResize, { passive: true });
    }

    window.addEventListener("orientationchange", handleResize, {
      passive: true,
    });

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (observer) {
        observer.disconnect();
      } else {
        window.removeEventListener("resize", handleResize);
      }
      window.removeEventListener("orientationchange", handleResize);
    };
  }, []);

  const { width, height } = viewport;
  const breakpoint = getBreakpoint(width);
  const isMobile = breakpoint === "mobile";
  const isTablet = breakpoint === "tablet";
  const isTV = width >= BREAKPOINTS.TV && width < BREAKPOINTS.FOUR_K;
  const is4K = width >= BREAKPOINTS.FOUR_K;

  return {
    breakpoint,
    width,
    height,
    isMobile,
    isTablet,
    isDesktop: breakpoint === "desktop",
    isSmallMobile: width < BREAKPOINTS.SMALL_MOBILE,
    isLargeDesktop: width >= BREAKPOINTS.LARGE_DESKTOP,
    isTV,
    is4K,
    isTouchDevice:
      isMobile ||
      isTablet ||
      (typeof navigator !== "undefined" && navigator.maxTouchPoints > 0),
    isPortrait: height > width,
    isLandscape: width >= height,
  };
}

export function useHorizontalScroll() {
  const ref = useRef(null);

  const scroll = (direction) => {
    if (ref.current) {
      const scrollAmount = 300;
      ref.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  return { ref, scroll };
}

export function useLocalStorage(key, initialValue) {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = useCallback(
    (value) => {
      setStoredValue((previousValue) => {
        try {
          const valueToStore =
            value instanceof Function ? value(previousValue) : value;
          window.localStorage.setItem(key, JSON.stringify(valueToStore));
          return valueToStore;
        } catch {
          return value instanceof Function ? value(previousValue) : value;
        }
      });
    },
    [key],
  );

  return [storedValue, setValue];
}

export function useRecentlyViewed() {
  const [items, setItems] = useLocalStorage("isp-recently-viewed", []);

  const addItem = useCallback(
    (item) => {
      if (!item?.id) return;
      setItems((prev) => {
        const filtered = (prev || []).filter(
          (i) => String(i.id) !== String(item.id),
        );
        return [
          { ...item, viewedAt: new Date().toISOString() },
          ...filtered,
        ].slice(0, 12);
      });
    },
    [setItems],
  );

  const clearAll = useCallback(() => setItems([]), [setItems]);

  return { items: items || [], addItem, clearAll };
}

export { useTVMode } from "./useTVMode";
export { useModalBackNav } from "./useModalBackNav";

export {
  useResponsive,
  useMediaQuery,
  useIsMobile,
  useIsTablet,
  useIsDesktop,
  useIsTV,
  useScreenSize,
} from "./useResponsive";
