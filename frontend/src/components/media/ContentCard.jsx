import { useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import WatchlistButton from "../ui/WatchlistButton";


/**
 * Convert TMDB poster URL to appropriate size
 * TMDB sizes: w92, w154, w185, w342, w500, w780, original
 */
function getTmdbPosterSrc(url, targetSize = 'w342') {
  if (!url) return url;
  // Only transform TMDB image URLs
  if (url.includes('image.tmdb.org/t/p/')) {
    return url.replace(/\/t\/p\/[^/]+\//, `/t/p/${targetSize}/`);
  }
  return url;
}

function getTmdbSrcSet(url) {
  if (!url || !url.includes('image.tmdb.org/t/p/')) return undefined;
  const parts = url.match(/^(.*\/t\/p\/)[^/]+(\/.*)$/);
  if (!parts) return undefined;
  const base = parts[1];
  const path = parts[2];
  return `${base}w185${path} 185w, ${base}w342${path} 342w, ${base}w500${path} 500w`;
}

function formatReleaseDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function ContentCard({
  item,
  type,
  index,
  eager,
  compact,
  tablet,
  tv,
  showReviewBadge,
  cardWidth,
}) {
  const navigate = useNavigate();
  const isSeries = type === "series" || item.type === "series";
  const isLandscape = type === "continue";
  const [hovered, setHovered] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const genre = String(item.genre || "Featured")
    .split(",")[0]
    .trim();
  const itemRating = item.rating || null;
  const displayDate = formatReleaseDate(item.releasedAt) || item.year || null;
  const isAdmin = useMemo(() => {
    try {
      const u = JSON.parse(localStorage.getItem('user') || 'null');
      return ['admin', 'super_admin'].includes(u?.role);
    } catch { return false; }
  }, []);

  return (
    <article
      className={`content-rail-card${tv ? " tv-mode-card" : ""}`}
      style={{
        ...styles.cardWrap,
        ...(isLandscape ? styles.cardWrapLandscape : {}),
        ...(tv
          ? isLandscape
            ? styles.cardWrapLandscapeTV
            : styles.cardWrapTV
          : compact
            ? styles.cardWrapMobile
            : tablet
              ? styles.cardWrapTablet
              : styles.cardWrapDefault),
        ...(cardWidth
          ? { width: cardWidth, maxWidth: "100%", minWidth: 0 }
          : {}),
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        type="button"
        className="content-card-trigger"
        style={{ ...styles.cardButton, touchAction: 'manipulation' }}
        onClick={() => {
          const targetPath = isSeries ? `/series/${item.id}` : `/movies/${item.id}`;
          navigate(targetPath);
        }}
        onFocus={() => tv && setHovered(true)}
        onBlur={() => tv && setHovered(false)}
      >
        <div
          style={{
            ...styles.posterWrap,
            aspectRatio: isLandscape ? "16 / 9" : "2 / 3",
            transform:
              hovered && !compact
                ? "translateY(-8px) scale(1.03)"
                : "translateY(0) scale(1)",
            boxShadow:
              hovered && !compact
                ? "0 32px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(0,255,255,0.2), 0 0 40px rgba(0,255,255,0.1)"
                : "0 8px 32px rgba(0,0,0,0.4)",
            borderColor:
              hovered && !compact
                ? "rgba(0,255,255,0.3)"
                : "rgba(255,255,255,0.08)",
          }}
        >
          {!imgLoaded ? (
            <div style={styles.posterPlaceholder}>
              <div style={styles.posterShimmer} />
            </div>
          ) : null}
          <img
            src={getTmdbPosterSrc(item.poster, compact ? 'w185' : 'w342')}
            srcSet={getTmdbSrcSet(item.poster)}
            sizes={compact ? '(max-width: 480px) 148px, 156px' : '(max-width: 1024px) 196px, 220px'}
            alt={item.title}
            loading={eager ? "eager" : "lazy"}
            decoding="async"
            fetchPriority={eager ? "high" : "low"}
            style={{
              ...styles.poster,
              opacity: imgLoaded ? 1 : 0,
              transform: hovered && !compact ? "scale(1.06)" : "scale(1)",
            }}
            onLoad={() => setImgLoaded(true)}
          />
          <div style={styles.posterOverlay} />

          <div style={styles.topBadges}>
            <span style={styles.typeBadge}>
              {isSeries ? "Series" : "Movie"}
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              {isAdmin ? (
                <Link
                  to={`/admin/content/${item.id}/edit`}
                  onClick={(e) => e.stopPropagation()}
                  style={styles.editBadge}
                  title="Edit"
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                  </svg>
                </Link>
              ) : null}
              {itemRating ? (
                <span style={styles.ratingBadge}>
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="var(--accent-tertiary)"
                    aria-hidden="true"
                  >
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                  {itemRating}
                </span>
              ) : null}
            </div>
          </div>

          <div style={styles.posterBottom}>
            <h3
              style={{
                ...styles.posterTitle,
                ...(compact ? styles.posterTitleCompact : {}),
                ...(tv ? styles.posterTitleTV : {}),
              }}
            >
              {item.title}
            </h3>
            <div
              style={{
                ...styles.posterMeta,
                ...(compact ? styles.posterMetaCompact : {}),
              }}
            >
              <span style={styles.genrePill}>{genre}</span>
              {!compact && displayDate ? (
                <span style={styles.yearText}>{displayDate}</span>
              ) : null}
              {!compact ? (
                <span style={styles.langText}>{item.language || "Mixed"}</span>
              ) : null}
            </div>
          </div>

          {!compact && hovered ? (
            <div style={styles.hoverOverlay}>
              <div style={styles.playCircle}>
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="#08111d"
                  aria-hidden="true"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
              <span style={styles.hoverLabel}>View Details</span>
              <div style={styles.hoverWatchlist} onClick={e => e.stopPropagation()}>
                <WatchlistButton
                  contentType={isSeries ? 'series' : 'movie'}
                  contentId={item.id}
                  title={item.title}
                  compact
                  checkOnMount={false}
                />
              </div>
            </div>
          ) : null}
        </div>

        <div style={styles.cardInfo}>
          <div className="content-rail-meta" style={styles.cardMeta}>
            <span>{genre}</span>
            <span style={styles.metaDot}>·</span>
            {displayDate ? (
              <>
                <span>{displayDate}</span>
                <span style={styles.metaDot}>·</span>
              </>
            ) : null}
            <span>{item.language || "Mixed"}</span>
            {item.runtime ? (
              <>
                <span style={styles.metaDot}>·</span>
                <span>{item.runtime}m</span>
              </>
            ) : null}
            {showReviewBadge && item.metadataStatus === "needs_review" ? (
              <span style={styles.reviewBadge}>Review</span>
            ) : null}
          </div>
        </div>
      </button>

    </article>
  );
}

const styles = {
  cardWrap: {
    position: "relative",
    flex: "0 0 auto",
    flexShrink: 0,
    scrollSnapAlign: "start",
  },
  cardWrapDefault: { width: "220px" },
  cardWrapLandscape: { width: "360px" },
  cardWrapLandscapeTV: { width: "420px" },
  cardWrapTV: { width: "280px" },
  cardWrapTablet: { width: "180px" },
  cardWrapMobile: { width: "148px" },
  cardButton: {
    width: "100%",
    textAlign: "left",
    display: "grid",
    gap: "10px",
  },
  posterWrap: {
    position: "relative",
    borderRadius: "14px",
    overflow: "hidden",
    background: "#0d1a2d",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    transition: "transform 450ms cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 450ms cubic-bezier(0.34, 1.56, 0.64, 1), border-color 450ms cubic-bezier(0.34, 1.56, 0.64, 1)",
  },
  poster: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    transition:
      "transform 500ms cubic-bezier(0.4, 0, 0.2, 1), opacity 300ms ease",
  },
  posterPlaceholder: {
    position: "absolute",
    inset: 0,
    background: "rgba(255, 255, 255, 0.03)",
  },
  posterShimmer: {
    position: "absolute",
    inset: 0,
    background:
      "linear-gradient(90deg, rgba(255,255,255,0.03), rgba(255,255,255,0.1), rgba(255,255,255,0.03))",
    backgroundSize: "200% 100%",
    animation: "shimmer 1.8s linear infinite",
  },
  posterOverlay: {
    position: "absolute",
    inset: 0,
    background:
      "linear-gradient(180deg, rgba(0,0,0,0) 25%, rgba(0,0,0,0.08) 45%, rgba(7,17,31,0.88) 100%)",
    pointerEvents: "none",
  },
  topBadges: {
    position: "absolute",
    top: "10px",
    left: "10px",
    right: "10px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "8px",
    zIndex: 1,
    pointerEvents: "none",
  },
  typeBadge: {
    padding: "5px 10px",
    borderRadius: "6px",
    background: "rgba(5, 12, 22, 0.6)",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    color: "#ffffff",
    fontSize: "0.62rem",
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: "0.12em",
    border: "1px solid rgba(255, 255, 255, 0.1)",
  },
  editBadge: {
    padding: "5px 7px",
    borderRadius: "6px",
    background: "rgba(5, 12, 22, 0.6)",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    color: "var(--accent-cyan)",
    fontSize: "0.7rem",
    fontWeight: "900",
    display: "flex",
    alignItems: "center",
    gap: "4px",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    cursor: "pointer",
    textDecoration: "none",
    pointerEvents: "auto",
    transition: "opacity 200ms",
    opacity: 0.7,
  },
  ratingBadge: {
    flexShrink: 0,
    padding: "5px 9px",
    borderRadius: "6px",
    background: "rgba(5, 12, 22, 0.6)",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    color: "var(--accent-cyan)",
    fontSize: "0.7rem",
    fontWeight: "900",
    display: "flex",
    alignItems: "center",
    gap: "4px",
    border: "1px solid rgba(255, 255, 255, 0.1)",
  },
  posterBottom: {
    position: "absolute",
    left: "10px",
    right: "10px",
    bottom: "10px",
    zIndex: 1,
    minWidth: 0,
  },
  posterTitle: {
    color: "#fff",
    fontSize: "0.88rem",
    fontWeight: "700",
    lineHeight: "1.3",
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
    marginBottom: "6px",
    textShadow: "0 2px 10px rgba(0,0,0,0.6)",
    letterSpacing: "-0.01em",
  },
  posterTitleCompact: {
    fontSize: "0.76rem",
    lineHeight: "1.22",
    marginBottom: "4px",
  },
  posterTitleTV: {
    fontSize: "1rem",
  },
  posterMeta: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    flexWrap: "wrap",
    minWidth: 0,
  },
  posterMetaCompact: {
    gap: "4px",
  },
  genrePill: {
    padding: "3px 8px",
    borderRadius: "6px",
    background: "rgba(255,255,255,0.12)",
    color: "rgba(255,255,255,0.9)",
    fontSize: "0.62rem",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    maxWidth: "100%",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  yearText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: "0.68rem",
    fontWeight: "600",
  },
  langText: {
    color: "rgba(255,255,255,0.5)",
    fontSize: "0.66rem",
    fontWeight: "600",
  },
  hoverOverlay: {
    position: "absolute",
    inset: 0,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    background: "rgba(0,0,0,0.35)",
    backdropFilter: "blur(2px)",
    zIndex: 2,
  },
  playCircle: {
    width: "50px",
    height: "50px",
    borderRadius: "50%",
    background: "rgba(255,255,255,0.95)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 8px 28px rgba(0,0,0,0.35)",
    paddingLeft: "3px",
  },
  hoverLabel: {
    color: "#fff",
    fontSize: "0.7rem",
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    textShadow: "0 2px 8px rgba(0,0,0,0.5)",
  },
  hoverWatchlist: {
    position: "absolute",
    top: "10px",
    right: "10px",
  },
  cardInfo: {
    padding: "0 2px",
  },
  cardMeta: {
    display: "flex",
    alignItems: "center",
    gap: "5px",
    color: "var(--text-muted)",
    fontSize: "0.72rem",
    textTransform: "capitalize",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  metaDot: {
    opacity: 0.4,
    fontSize: "0.6rem",
  },
  reviewBadge: {
    padding: "4px 8px",
    borderRadius: "6px",
    background: "rgba(255, 209, 102, 0.14)",
    color: "var(--accent-tertiary)",
    fontSize: "0.6rem",
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: "0.1em",
  },
};

export default ContentCard;
