import { useEffect, useState } from "react";

const TV_KEYS = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Enter"];
// Tizen / WebOS / Orsay remote Back keys
const TV_BACK_KEYS = ["Backspace", "Escape", "GoBack", "XF86Back", "BrowserBack"];
const TV_MODE_MIN_WIDTH = 1600;
const TV_USER_AGENT = /(?:smart-?tv|smarttv|hbbtv|web0s|tizen|netcast|viera|bravia|aft[a-z0-9-]*|android tv|google tv|roku|crkey)/i;

let currentTVMode = false;
let listenersAttached = false;
const subscribers = new Set();

function isFinePointerDesktop() {
  return typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}

function isKnownTVDevice() {
  return typeof navigator !== "undefined" && TV_USER_AGENT.test(navigator.userAgent || "");
}

function isTVLikeViewport() {
  if (typeof window === "undefined") return false;

  // Many 720p/1080p TVs expose a 960–1366 CSS-pixel viewport. Prefer their
  // user agent; retain the wide, non-mouse fallback for TVs with generic UAs.
  return isKnownTVDevice() || (
    window.innerWidth >= TV_MODE_MIN_WIDTH && !isFinePointerDesktop()
  );
}

function setTVMode(nextMode) {
  if (currentTVMode === nextMode || typeof document === "undefined") return;

  currentTVMode = nextMode;
  document.documentElement.classList.toggle("tv-mode", nextMode);
  if (nextMode) import("../styles/tv-mode.css").catch(() => {});
  subscribers.forEach((notify) => notify(nextMode));
}

function getFocusableElements() {
  const selectors = [
    "button:not([disabled])",
    "a[href]",
    "input:not([disabled])",
    "select:not([disabled])",
    "textarea:not([disabled])",
    '[tabindex]:not([tabindex="-1"])',
  ].join(", ");

  return Array.from(document.querySelectorAll(selectors)).filter((element) => {
    if (element.classList?.contains("skip-link")) return false;
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    return rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.right > 0 &&
      style.visibility !== "hidden" && style.display !== "none";
  });
}

function findNextByDirection(currentElement, direction) {
  const currentRect = currentElement?.getBoundingClientRect?.();
  if (!currentRect) return null;

  const currentCenterX = currentRect.left + currentRect.width / 2;
  const currentCenterY = currentRect.top + currentRect.height / 2;
  const candidates = getFocusableElements()
    .filter((element) => element !== currentElement)
    .map((element) => {
      const rect = element.getBoundingClientRect();
      const dx = rect.left + rect.width / 2 - currentCenterX;
      const dy = rect.top + rect.height / 2 - currentCenterY;
      const horizontal = direction === "ArrowLeft" || direction === "ArrowRight";

      if ((direction === "ArrowRight" && dx <= 8) ||
          (direction === "ArrowLeft" && dx >= -8) ||
          (direction === "ArrowDown" && dy <= 8) ||
          (direction === "ArrowUp" && dy >= -8)) return null;

      const primaryDistance = horizontal ? Math.abs(dx) : Math.abs(dy);
      const crossDistance = horizontal ? Math.abs(dy) : Math.abs(dx);
      return { element, score: primaryDistance + crossDistance * 0.55 };
    })
    .filter(Boolean)
    .sort((a, b) => a.score - b.score);

  return candidates[0]?.element || null;
}

function handleKeyDown(event) {
  const keyCode = event.keyCode || event.which;
  // Samsung Tizen (10009) / LG WebOS (461) Back keys report as keyCodes
  const isBackKey = TV_BACK_KEYS.includes(event.key) || keyCode === 10009 || keyCode === 461 || keyCode === 8;
  if (!TV_KEYS.includes(event.key) && !isBackKey) return;

  // A D-pad is a reliable TV signal even when the browser reports a small CSS
  // viewport. Do not switch a mouse/keyboard desktop into TV mode.
  if (!currentTVMode) {
    if (isFinePointerDesktop()) return;
    setTVMode(true);
  }

  const activeElement = document.activeElement;
  if (["INPUT", "TEXTAREA", "SELECT"].includes(activeElement?.tagName) && event.key !== "Enter") return;

  if (isBackKey) {
    // Let MainSiteLayout's global back handler do the navigate(-1);
    // only ensure we don't trap focus inside a modal-less page.
    return;
  }

  if (activeElement === document.body || !activeElement || activeElement.classList?.contains("skip-link")) {
    const firstFocusable = getFocusableElements()[0];
    if (firstFocusable) {
      firstFocusable.focus();
      try { firstFocusable.scrollIntoView({ block: "nearest", inline: "nearest" }); } catch { /* old TV browsers */ }
      event.preventDefault();
    }
    return;
  }

  if (event.key.startsWith("Arrow")) {
    const nextElement = findNextByDirection(activeElement, event.key);
    if (nextElement) {
      nextElement.focus();
      try { nextElement.scrollIntoView({ block: "nearest", inline: "nearest" }); } catch { /* old TV browsers */ }
      event.preventDefault();
    }
  }
}

function attachListeners() {
  if (listenersAttached || typeof window === "undefined") return;
  listenersAttached = true;
  setTVMode(isTVLikeViewport());

  window.addEventListener("keydown", handleKeyDown, true);
  window.addEventListener("resize", () => {
    if (isTVLikeViewport()) setTVMode(true);
  }, { passive: true });
}

/**
 * Shared TV-mode state and one global D-pad handler for the entire SPA.
 * Components may use this hook freely without registering duplicate listeners.
 */
export function useTVMode() {
  const [isTVMode, setIsTVMode] = useState(() => currentTVMode || isTVLikeViewport());

  useEffect(() => {
    subscribers.add(setIsTVMode);
    attachListeners();
    setIsTVMode(currentTVMode);
    return () => subscribers.delete(setIsTVMode);
  }, []);

  return isTVMode;
}

export default useTVMode;
