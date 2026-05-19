import { useState, useEffect, useCallback } from 'react';

/**
 * useResponsive - Comprehensive responsive design hook
 * Provides detailed breakpoint information and responsive utilities
 */
export function useResponsive() {
  const [deviceInfo, setDeviceInfo] = useState({
    width: typeof window === 'undefined' ? 1280 : window.innerWidth,
    height: typeof window === 'undefined' ? 720 : window.innerHeight,
  });

  const updateDeviceInfo = useCallback(() => {
    setDeviceInfo({
      width: window.innerWidth,
      height: window.innerHeight,
    });
  }, []);

  useEffect(() => {
    window.addEventListener('resize', updateDeviceInfo, { passive: true });
    window.addEventListener('orientationchange', updateDeviceInfo, { passive: true });

    return () => {
      window.removeEventListener('resize', updateDeviceInfo);
      window.removeEventListener('orientationchange', updateDeviceInfo);
    };
  }, [updateDeviceInfo]);

  const { width, height } = deviceInfo;

  // Breakpoint checks
  const isExtraSmall = width < 480;        // Extra small phones
  const isSmall = width >= 480 && width < 640;    // Small phones
  const isMobile = width < 768;            // All mobile devices
  const isSmallMobile = width < 480;
  const isMediumMobile = width >= 480 && width < 640;
  const isTablet = width >= 768 && width < 1024;
  const isSmallDesktop = width >= 1024 && width < 1440;
  const isDesktop = width >= 1024 && width < 1600;
  const isLargeDesktop = width >= 1440 && width < 1600;
  const isTV = width >= 1600 && width < 2500;
  const is4K = width >= 2500;
  const isWidescreen = width >= 1440;

  // Device type detection
  const isTouchDevice = typeof window !== 'undefined' && 
    (navigator.maxTouchPoints > 0 || navigator.msMaxTouchPoints > 0);

  // Screen orientation
  const isPortrait = height > width;
  const isLandscape = width > height;

  // Group classifications
  const isSmallScreen = isMobile;
  const isMediumScreen = isTablet;
  const isLargeScreen = isDesktop || isLargeDesktop;
  const isXLargeScreen = isTV || is4K;

  // Responsive utilities
  const containerSize = 
    isExtraSmall ? 'extra-small' :
    isSmall ? 'small' :
    isMobile ? 'mobile' :
    isTablet ? 'tablet' :
    isSmallDesktop ? 'small-desktop' :
    isLargeDesktop ? 'large-desktop' :
    isTV ? 'tv' :
    '4k';

  // Column count for grids
  const gridCols = 
    isExtraSmall ? 1 :
    isSmall ? 2 :
    isMobile ? 2 :
    isTablet ? 3 :
    isSmallDesktop ? 4 :
    isLargeDesktop ? 4 :
    isTV ? 5 :
    6;

  // Spacing multiplier
  const spacingMultiplier = 
    isExtraSmall ? 0.75 :
    isSmall ? 0.85 :
    isMobile ? 1 :
    isTablet ? 1.15 :
    isSmallDesktop ? 1.3 :
    isLargeDesktop ? 1.5 :
    isTV ? 1.8 :
    2.2;

  // Font size multiplier
  const fontMultiplier = 
    isExtraSmall ? 0.875 :
    isSmall ? 0.9 :
    isMobile ? 1 :
    isTablet ? 1.05 :
    isSmallDesktop ? 1.1 :
    isLargeDesktop ? 1.2 :
    isTV ? 1.4 :
    1.7;

  // Touch target size
  const touchTarget = isTV || is4K ? 52 : isMobile ? 44 : 40;

  return {
    // Width breakpoints
    width,
    height,
    isExtraSmall,
    isSmall,
    isMobile,
    isSmallMobile,
    isMediumMobile,
    isTablet,
    isSmallDesktop,
    isDesktop,
    isLargeDesktop,
    isTV,
    is4K,
    isWidescreen,

    // Screen classifications
    isSmallScreen,
    isMediumScreen,
    isLargeScreen,
    isXLargeScreen,

    // Device detection
    isTouchDevice,
    isPortrait,
    isLandscape,

    // Responsive values
    containerSize,
    gridCols,
    spacingMultiplier,
    fontMultiplier,
    touchTarget,

    // Utility methods
    getContainerWidth: () => {
      if (isExtraSmall) return 'calc(100vw - 1rem)';
      if (isSmall) return 'calc(100vw - 1.5rem)';
      if (isMobile) return 'calc(100vw - 2rem)';
      if (isTablet) return 'calc(100vw - 3rem)';
      if (isSmallDesktop) return 'calc(100vw - 4rem)';
      if (isLargeDesktop) return 'calc(100vw - 6rem)';
      if (isTV) return 'min(1720px, calc(100vw - 8rem))';
      return 'min(2100px, calc(100vw - 10rem))';
    },

    getPadding: (base = 1) => ({
      horizontal: `${0.5 * base * spacingMultiplier}rem`,
      vertical: `${0.75 * base * spacingMultiplier}rem`,
      all: `${base * spacingMultiplier}rem`,
    }),

    getGap: (base = 1) => `${base * spacingMultiplier}rem`,

    getFontSize: (base = 1) => `${base * fontMultiplier}rem`,

    getGridTemplate: (minSize = 280) => {
      if (isExtraSmall) return '1fr';
      if (isSmall) return 'repeat(2, 1fr)';
      if (isMobile) return 'repeat(2, 1fr)';
      if (isTablet) return 'repeat(3, 1fr)';
      if (isSmallDesktop) return 'repeat(4, 1fr)';
      if (isLargeDesktop) return 'repeat(4, 1fr)';
      if (isTV) return 'repeat(5, 1fr)';
      return 'repeat(6, 1fr)';
    },
  };
}

/**
 * useMediaQuery - Hook for custom media queries
 * @param {string} query - CSS media query string
 * @returns {boolean} - Whether media query matches
 */
export function useMediaQuery(query) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    setMatches(mediaQuery.matches);

    const handler = (e) => setMatches(e.matches);
    mediaQuery.addListener(handler);

    return () => mediaQuery.removeListener(handler);
  }, [query]);

  return matches;
}

/**
 * useIsMobile - Check if device is mobile
 * @returns {boolean}
 */
export function useIsMobile() {
  const { isMobile } = useResponsive();
  return isMobile;
}

/**
 * useIsTablet - Check if device is tablet
 * @returns {boolean}
 */
export function useIsTablet() {
  const { isTablet } = useResponsive();
  return isTablet;
}

/**
 * useIsDesktop - Check if device is desktop
 * @returns {boolean}
 */
export function useIsDesktop() {
  const { isDesktop, isLargeDesktop } = useResponsive();
  return isDesktop || isLargeDesktop;
}

/**
 * useIsTV - Check if device is TV
 * @returns {boolean}
 */
export function useIsTV() {
  const { isTV, is4K } = useResponsive();
  return isTV || is4K;
}

/**
 * useScreenSize - Get current screen size category
 * @returns {string} - One of: 'xs', 'sm', 'md', 'lg', 'xl', '2xl'
 */
export function useScreenSize() {
  const { isExtraSmall, isSmall, isMobile, isTablet, isSmallDesktop, isTV, is4K } = useResponsive();

  if (isExtraSmall) return 'xs';
  if (isSmall) return 'sm';
  if (isMobile) return 'md';
  if (isTablet) return 'lg';
  if (isSmallDesktop) return 'xl';
  if (isTV) return '2xl';
  if (is4K) return '3xl';
  return 'xl';
}
