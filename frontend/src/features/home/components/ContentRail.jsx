import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import ContentCard from "../../../components/media/ContentCard";
import { useBreakpoint, useTVMode } from "../../../hooks";

function ContentRail({
  title,
  items,
  type = "default",
  subtitle = "Curated now",
  viewAllLink,
  priorityCount = 0,
}) {
  const scrollRef = useRef(null);
  const { isMobile, isTablet } = useBreakpoint();
  const isTVMode = useTVMode();
  const [leftHovered, setLeftHovered] = useState(false);
  const [rightHovered, setRightHovered] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const accent = title.includes("Bengali")
    ? "var(--accent-violet)"
    : title.includes("Trending")
      ? "var(--accent-pink)"
      : "var(--accent-cyan)";

  const updateScrollIndicators = useCallback(() => {
    const element = scrollRef.current;
    if (!element) return;

    const maxScrollLeft = Math.max(
      0,
      element.scrollWidth - element.clientWidth,
    );

    setCanScrollLeft(element.scrollLeft > 5);
    setCanScrollRight(
      maxScrollLeft > 5 && element.scrollLeft < maxScrollLeft - 5,
    );
  }, []);

  const scheduleScrollIndicatorUpdate = useCallback(() => {
    updateScrollIndicators();

    if (typeof window === "undefined") return;

    window.requestAnimationFrame(() => {
      updateScrollIndicators();
      window.requestAnimationFrame(updateScrollIndicators);
    });

    window.setTimeout(updateScrollIndicators, 250);
  }, [updateScrollIndicators]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = 0;
    }
    scheduleScrollIndicatorUpdate();
  }, [items, title, scheduleScrollIndicatorUpdate]);

  const clampScrollLeft = useCallback((element, nextLeft) => {
    const maxScrollLeft = Math.max(
      0,
      element.scrollWidth - element.clientWidth,
    );
    return Math.min(maxScrollLeft, Math.max(0, nextLeft));
  }, []);

  const getScrollDistance = useCallback(
    (element) => {
      const firstCard = element.querySelector(".content-rail-card");
      const cardWidth = firstCard?.getBoundingClientRect?.().width || 0;
      const stylesForElement = window.getComputedStyle(element);
      const gap =
        Number.parseFloat(
          stylesForElement.columnGap || stylesForElement.gap || "0",
        ) || 0;
      const byCard = cardWidth ? (cardWidth + gap) * (isTVMode ? 2 : 1) : 0;
      const byViewport =
        element.clientWidth * (isTVMode ? 0.72 : isMobile ? 0.78 : 0.82);

      return Math.max(
        120,
        Math.min(Math.max(byCard, byViewport), element.clientWidth || 380),
      );
    },
    [isMobile, isTVMode],
  );

  const applyScrollLeft = useCallback(
    (element, targetScroll, behavior = "smooth") => {
      const startScroll = element.scrollLeft;
      const nextScroll = clampScrollLeft(element, targetScroll);

      try {
        element.scrollTo({ left: nextScroll, behavior });
      } catch {
        element.scrollLeft = nextScroll;
      }

      window.setTimeout(() => {
        if (
          Math.abs(element.scrollLeft - startScroll) < 1 &&
          Math.abs(nextScroll - startScroll) > 1
        ) {
          element.scrollLeft = nextScroll;
        }
        updateScrollIndicators();
      }, 180);
    },
    [clampScrollLeft, updateScrollIndicators],
  );

  const scroll = useCallback(
    (direction) => {
      const element = scrollRef.current;
      if (!element) return;

      const scrollDistance = getScrollDistance(element);
      const signedDistance =
        direction === "left" ? -scrollDistance : scrollDistance;
      applyScrollLeft(element, element.scrollLeft + signedDistance);
      scheduleScrollIndicatorUpdate();
    },
    [applyScrollLeft, getScrollDistance, scheduleScrollIndicatorUpdate],
  );

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return undefined;

    const handleWheel = (event) => {
      const deltaX = event.deltaX || 0;
      const deltaY = event.deltaY || 0;

      // Determine the horizontal scroll delta:
      // 1. Trackpad horizontal swipe → use deltaX naturally
      // 2. Shift + mouse wheel → convert shift+deltaY to horizontal
      // 3. Regular mouse wheel (deltaY only) → DO NOT intercept, let page scroll vertically
      let delta = 0;

      if (Math.abs(deltaX) > 0 && Math.abs(deltaX) >= Math.abs(deltaY)) {
        // Trackpad horizontal gesture
        delta = deltaX;
      } else if (event.shiftKey && Math.abs(deltaY) > 0) {
        // Shift + mouse wheel → horizontal scroll
        delta = deltaY;
      }
      // else: regular vertical wheel — do NOT convert to horizontal, let page scroll

      if (!delta) return;

      const maxScrollLeft = Math.max(
        0,
        element.scrollWidth - element.clientWidth,
      );

      // Only intercept if there is actually overflow to scroll
      if (maxScrollLeft <= 0) return;

      const nextScroll = clampScrollLeft(element, element.scrollLeft + delta);
      const canMove = nextScroll !== element.scrollLeft;

      if (canMove) {
        element.scrollLeft = nextScroll;
        scheduleScrollIndicatorUpdate();
        if (event.cancelable) {
          event.preventDefault();
        }
      }
    };

    const resizeObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(scheduleScrollIndicatorUpdate)
        : null;
    resizeObserver?.observe(element);
    Array.from(element.children).forEach((child) =>
      resizeObserver?.observe(child),
    );

    const mutationObserver =
      typeof MutationObserver !== "undefined"
        ? new MutationObserver(scheduleScrollIndicatorUpdate)
        : null;
    mutationObserver?.observe(element, { childList: true, subtree: true });

    element.addEventListener("wheel", handleWheel, { passive: false });
    element.addEventListener("scroll", updateScrollIndicators, {
      passive: true,
    });

    scheduleScrollIndicatorUpdate();

    return () => {
      resizeObserver?.disconnect();
      mutationObserver?.disconnect();
      element.removeEventListener("wheel", handleWheel);
      element.removeEventListener("scroll", updateScrollIndicators);
    };
  }, [
    clampScrollLeft,
    scheduleScrollIndicatorUpdate,
    updateScrollIndicators,
  ]);

  return (
    <section className="content-rail-section" style={styles.section}>
      <div
        className={`content-rail-header${isMobile ? " content-rail-header--mobile" : ""}`}
        style={{
          ...styles.header,
          ...(isTVMode ? styles.headerTV : isMobile ? styles.headerMobile : {}),
        }}
      >
        <div>
          <span
            className="content-rail-eyebrow"
            style={{ ...styles.eyebrow, color: accent }}
          >
            {subtitle}
          </span>
          <h2
            className="content-rail-title"
            style={{ ...styles.title, ...(isMobile ? styles.titleMobile : {}) }}
          >
            {title}
          </h2>
        </div>

        <div className="content-rail-actions" style={styles.headerActions}>
          {viewAllLink ? (
            <Link
              className="content-rail-view-all"
              to={viewAllLink}
              style={{
                ...styles.viewAll,
                ...(isTVMode ? styles.viewAllTV : {}),
                ...(isMobile ? styles.viewAllMobile : {}),
              }}
            >
              Open shelf
            </Link>
          ) : null}
          <div
            className="content-rail-controls"
            style={{
              ...styles.controls,
              ...(isTVMode
                ? styles.controlsTV
                : isMobile
                  ? styles.controlsMobile
                  : {}),
            }}
          >
            <button
              type="button"
              aria-label={`Scroll ${title} left`}
              onClick={() => scroll("left")}
              onMouseEnter={() => setLeftHovered(true)}
              onMouseLeave={() => setLeftHovered(false)}
              disabled={!canScrollLeft}
              style={{
                ...styles.arrow,
                ...(isTVMode
                  ? styles.arrowTV
                  : isMobile
                    ? styles.arrowMobile
                    : {}),
                ...(leftHovered && canScrollLeft ? styles.arrowHover : {}),
                ...(!canScrollLeft ? styles.arrowDisabled : {}),
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
              </svg>
            </button>
            <button
              type="button"
              aria-label={`Scroll ${title} right`}
              onClick={() => scroll("right")}
              onMouseEnter={() => setRightHovered(true)}
              onMouseLeave={() => setRightHovered(false)}
              disabled={!canScrollRight}
              style={{
                ...styles.arrow,
                ...(isTVMode
                  ? styles.arrowTV
                  : isMobile
                    ? styles.arrowMobile
                    : {}),
                ...(rightHovered && canScrollRight ? styles.arrowHover : {}),
                ...(!canScrollRight ? styles.arrowDisabled : {}),
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div
        className="content-rail-list"
        style={{
          ...styles.rail,
          ...(!isMobile && items.length <= 5 ? styles.railCompactSet : {}),
          ...(isTVMode ? styles.railTV : isMobile ? styles.railMobile : {}),
        }}
        ref={scrollRef}
        role="region"
        aria-label={`${title} content rail`}
        onMouseEnter={scheduleScrollIndicatorUpdate}
        onFocus={scheduleScrollIndicatorUpdate}
      >
        {items.map((item, index) => (
          <ContentCard
            key={item.id}
            item={item}
            index={index}
            type={type}
            eager={index < priorityCount}
            compact={isMobile}
            tablet={isTablet}
            tv={isTVMode}
          />
        ))}
      </div>
    </section>
  );
}

const styles = {
  section: {
    padding: "var(--spacing-md) 0 var(--spacing-lg)",
    overflow: "hidden",
    width: "100%",
    maxWidth: "100vw",
    boxSizing: "border-box",
  },
  header: {
    width: "100%",
    boxSizing: "border-box",
    padding: "0 max(48px, calc((100vw - 1720px) / 2))",
    margin: "0 0 14px",
    display: "flex",
    justifyContent: "flex-start",
    alignItems: "end",
    gap: "24px",
  },
  headerMobile: {
    width: "100%",
    boxSizing: "border-box",
    padding: "0 14px",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "nowrap",
  },
  headerTV: {
    width: "100%",
    boxSizing: "border-box",
    padding: "0 max(48px, calc((100vw - 1720px) / 2))",
    margin: "0 0 24px",
  },
  eyebrow: {
    display: "inline-block",
    marginBottom: "4px",
    fontSize: "0.68rem",
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: "0.16em",
  },
  title: {
    color: "var(--text-primary)",
    fontSize: "clamp(1.1rem, 2.5vw, 1.8rem)",
  },
  titleMobile: {
    fontSize: "1.1rem",
    fontWeight: "800",
  },
  headerActions: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "3px",
    borderRadius: "14px",
    background: "rgba(255, 255, 255, 0.035)",
    border: "1px solid rgba(255, 255, 255, 0.07)",
    backdropFilter: "blur(18px)",
    WebkitBackdropFilter: "blur(18px)",
    flexShrink: 0,
  },
  viewAll: {
    minHeight: "34px",
    display: "inline-flex",
    alignItems: "center",
    padding: "0 12px",
    borderRadius: "10px",
    background: "rgba(255, 255, 255, 0.055)",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    color: "var(--text-secondary)",
    fontSize: "0.72rem",
    fontWeight: "800",
    letterSpacing: "0.02em",
    whiteSpace: "nowrap",
    textDecoration: "none",
  },
  controls: {
    display: "flex",
    gap: "4px",
  },
  controlsTV: {
    gap: "12px",
  },
  controlsMobile: {
    gap: "6px",
  },
  arrow: {
    width: "38px",
    height: "38px",
    minWidth: "38px",
    minHeight: "38px",
    padding: 0,
    borderRadius: "12px",
    background: "rgba(255, 255, 255, 0.045)",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    color: "var(--text-muted)",
    display: "grid",
    placeItems: "center",
    touchAction: "manipulation",
  },
  arrowMobile: {
    width: "44px",
    height: "44px",
    minWidth: "44px",
    minHeight: "44px",
    borderRadius: "12px",
  },
  arrowTV: {
    width: "56px",
    height: "56px",
    minWidth: "56px",
    minHeight: "56px",
    borderRadius: "16px",
  },
  viewAllTV: {
    minHeight: "48px",
    padding: "0 18px",
    fontSize: "0.9rem",
  },
  arrowHover: {
    background: "rgba(255, 255, 255, 0.1)",
    color: "var(--text-primary)",
    borderColor: "rgba(255,255,255,0.14)",
  },
  arrowDisabled: {
    opacity: 0.25,
    cursor: "default",
    pointerEvents: "none",
  },
  viewAllMobile: {
    minHeight: "44px",
    padding: "0 14px",
    fontSize: "0.78rem",
  },
  rail: {
    width: "100%",
    maxWidth: "100%",
    boxSizing: "border-box",
    display: "flex",
    justifyContent: "flex-start",
    alignItems: "flex-start",
    gap: "16px",
    margin: "0",
    padding: "6px max(48px, calc((100vw - 1720px) / 2)) 16px",
    overflowX: "auto",
    overflowY: "hidden",
    scrollSnapType: "x proximity",
    scrollSnapStop: "normal",
    overscrollBehaviorX: "contain",
    scrollPaddingLeft: "max(48px, calc((100vw - 1720px) / 2))",
    scrollbarWidth: "none",
    WebkitOverflowScrolling: "touch",
    touchAction: "auto",
  },
  railCompactSet: {
    justifyContent: "space-between",
  },
  railMobile: {
    width: "100%",
    maxWidth: "100%",
    boxSizing: "border-box",
    gap: "10px",
    margin: "0",
    padding: "4px 14px 12px",
    scrollPaddingLeft: "14px",
    scrollSnapType: "x proximity",
    scrollSnapStop: "normal",
    overscrollBehaviorX: "contain",
    touchAction: "auto",
    WebkitOverflowScrolling: "touch",
  },
  railTV: {
    width: "100%",
    maxWidth: "100%",
    boxSizing: "border-box",
    gap: "20px",
    margin: "0",
    padding: "6px max(48px, calc((100vw - 1720px) / 2)) 16px",
    scrollPaddingLeft: "max(48px, calc((100vw - 1720px) / 2))",
  },
};

export default ContentRail;
