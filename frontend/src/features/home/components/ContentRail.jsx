import { useEffect, useRef, useState } from "react";
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
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);

  const accent = title.includes("Bengali")
    ? "var(--accent-violet)"
    : title.includes("Trending")
      ? "var(--accent-pink)"
      : "var(--accent-cyan)";

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = 0;
    }
  }, [items, title]);

  const scroll = (direction) => {
    const element = scrollRef.current;
    if (!element) return;
    
    const scrollDistance = direction === "left" ? -380 : 380;
    const currentScroll = element.scrollLeft;
    const targetScroll = currentScroll + scrollDistance;
    
    element.scrollLeft = targetScroll;
  };

  const handleTouchStart = (e) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = (e) => {
    setTouchEnd(e.changedTouches[0].clientX);
    handleSwipe();
  };

  const handleSwipe = () => {
    if (touchStart - touchEnd > 50) {
      scroll("right");
    }
    if (touchStart - touchEnd < -50) {
      scroll("left");
    }
  };

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
              style={{ ...styles.viewAll, ...(isTVMode ? styles.viewAllTV : {}) }}
            >
              Open shelf
            </Link>
          ) : null}
          {(isTVMode || !isMobile) && (
            <div className="content-rail-controls" style={{ ...styles.controls, ...(isTVMode ? styles.controlsTV : isMobile ? styles.controlsMobile : {}) }}>
              <button
                type="button"
                aria-label={`Scroll ${title} left`}
                onClick={() => scroll("left")}
                onMouseEnter={() => setLeftHovered(true)}
                onMouseLeave={() => setLeftHovered(false)}
                style={{
                  ...styles.arrow,
                  ...(isTVMode ? styles.arrowTV : isMobile ? styles.arrowMobile : {}),
                  ...(leftHovered ? styles.arrowHover : {}),
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
                style={{
                  ...styles.arrow,
                  ...(isTVMode ? styles.arrowTV : isMobile ? styles.arrowMobile : {}),
                  ...(rightHovered ? styles.arrowHover : {}),
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
          )}
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
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
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
  },
  arrowMobile: {
    width: "32px",
    height: "32px",
    minWidth: "32px",
    minHeight: "32px",
    borderRadius: "8px",
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
  rail: {
    width: "100%",
    maxWidth: "none",
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
    overscrollBehaviorY: "none",
    scrollPaddingLeft: "max(48px, calc((100vw - 1720px) / 2))",
    scrollbarWidth: "none",
    WebkitOverflowScrolling: "touch",
    touchAction: "pan-x",
  },
  railCompactSet: {
    justifyContent: "space-between",
  },
  railMobile: {
    width: "100%",
    maxWidth: "none",
    gap: "10px",
    margin: "0",
    padding: "4px 14px 12px",
    scrollPaddingLeft: "14px",
    scrollSnapType: "x proximity",
    scrollSnapStop: "normal",
    overscrollBehaviorX: "contain",
    overscrollBehaviorY: "none",
    touchAction: "pan-x",
    WebkitOverflowScrolling: "touch",
  },
  railTV: {
    width: "100%",
    maxWidth: "none",
    gap: "20px",
    margin: "0",
    padding: "6px max(48px, calc((100vw - 1720px) / 2)) 16px",
    scrollPaddingLeft: "max(48px, calc((100vw - 1720px) / 2))",
  },
};

export default ContentRail;
