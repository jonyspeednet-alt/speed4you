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
  // TV/low-end: only 2 small sizes, no w500 (saves ~40% bytes per poster)
  return `${base}w185${path} 185w, ${base}w342${path} 342w`;
}

/**
 * TMDB backdrop sizes: w300, w780, w1280, original.
 * Landscape (Netflix-style 16:9) cards use the backdrop still when available.
 */
function getTmdbBackdropSrc(url, targetSize = 'w780') {
  if (!url) return url;
  if (url.includes('image.tmdb.org/t/p/')) {
    return url.replace(/\/t\/p\/[^/]+\//, `/t/p/${targetSize}/`);
  }
  return url;
}

function getTmdbBackdropSrcSet(url) {
  if (!url || !url.includes('image.tmdb.org/t/p/')) return undefined;
  const parts = url.match(/^(.*\/t\/p\/)[^/]+(\/.*)$/);
  if (!parts) return undefined;
  return `${parts[1]}w300${parts[2]} 300w, ${parts[1]}w780${parts[2]} 780w, ${parts[1]}w1280${parts[2]} 1280w`;
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
  eager,
  compact,
  tablet,
  tv,
  showReviewBadge,
  cardWidth,
  orientation = "portrait",
}) {
  const navigate = useNavigate();
  const isSeries = type === "series" || item.type === "series";
  // Netflix-style: rails render 16:9 landscape stills, grids render portraits.
  const isLandscape = orientation === "landscape" || type === "continue";
  const targetPath = isSeries ? `/series/${item.id}` : `/movies/${item.id}`;
  const [hovered, setHovered] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);
  // Hover-expand runs on devices with a real hover pointer; touch + TV get
  // the static card (TV shows the info panel on focus instead of scaling).
  const canExpand = !compact && !tv;
  const showPanel = isLandscape && hovered && !compact;
  const genre = String(item.genre || "Featured")
    .split(",")[0]
    .trim();
  const genreLine = String(item.genre || "")
    .split(",")
    .map((g) => g.trim())
    .filter(Boolean)
    .slice(0, 3)
    .join(" • ");
  const landscapeImg = item.backdrop || item.poster;
  const itemRating = item.rating || null;
  const displayDate = formatReleaseDate(item.releasedAt) || item.year || null;
  const isNew = item.releasedAt && (Date.now() - new Date(item.releasedAt).getTime() < 7 * 24 * 60 * 60 * 1000);
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
          navigate(targetPath);
        }}
        onFocus={() => setHovered(true)}
        onBlur={() => setHovered(false)}
      >
        <div
          style={{
            ...styles.posterWrap,
            ...(isLandscape ? styles.posterWrapLandscape : {}),
            aspectRatio: isLandscape ? "16 / 9" : "2 / 3",
            transform:
              hovered && canExpand
                ? isLandscape
                  ? "scale(1.2)"
                  : "translateY(-8px) scale(1.03)"
                : "translateY(0) scale(1)",
            boxShadow:
              hovered && canExpand
                ? "0 32px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(0,255,255,0.2), 0 0 40px rgba(0,255,255,0.1)"
                : "0 8px 32px rgba(0,0,0,0.4)",
            borderColor:
              hovered && canExpand
                ? "rgba(0,255,255,0.3)"
                : "rgba(255,255,255,0.08)",
            zIndex: showPanel && canExpand ? 10 : undefined,
          }}
        >
          {(!imgLoaded || imgError) ? (
            <div style={styles.posterPlaceholder}>
              {!imgError ? <div style={styles.posterShimmer} /> : null}
            </div>
          ) : null}
          {!imgError ? (
            isLandscape ? (
              <img
                src={getTmdbBackdropSrc(landscapeImg, tv ? 'w300' : 'w780')}
                srcSet={getTmdbBackdropSrcSet(landscapeImg)}
                sizes={tv ? '320px' : compact ? '(max-width: 480px) 160px, 180px' : '(max-width: 1024px) 220px, 300px'}
                alt={item.title}
                loading={eager ? "eager" : "lazy"}
                decoding="async"
                fetchPriority={eager ? "high" : "low"}
                style={{
                  ...styles.poster,
                  opacity: imgLoaded ? 1 : 0,
                  // Faces sit in the top third of posters — cropping to 16:9
                  // from the center beheads people; bias upward instead.
                  objectPosition: 'center 20%',
                }}
                onLoad={() => setImgLoaded(true)}
                onError={() => setImgError(true)}
              />
            ) : (
              <img
                src={getTmdbPosterSrc(item.poster, tv ? 'w185' : compact ? 'w185' : 'w342')}
                srcSet={getTmdbSrcSet(item.poster)}
                sizes={tv ? '200px' : compact ? '(max-width: 480px) 148px, 156px' : '(max-width: 1024px) 196px, 220px'}
                alt={item.title}
                loading={eager ? "eager" : "lazy"}
                decoding="async"
                fetchPriority={eager ? "high" : "low"}
                style={{
                  ...styles.poster,
                  opacity: imgLoaded ? 1 : 0,
                  transform: hovered && canExpand ? "scale(1.06)" : "scale(1)",
                }}
                onLoad={() => setImgLoaded(true)}
                onError={() => setImgError(true)}
              />
            )
          ) : null}
          <div style={styles.posterOverlay} />

          <div style={styles.topBadges}>
            {!isLandscape ? (
              <span style={styles.typeBadge}>
                {isSeries ? "Series" : "Movie"}
              </span>
            ) : isNew ? <span style={styles.newBadge}>New</span> : <span />}
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

          <div style={{
            ...styles.posterBottom,
            opacity: showPanel ? 0 : 1,
            transition: "opacity 200ms ease",
          }}>
            <h3
              style={{
                ...styles.posterTitle,
                ...(isLandscape ? styles.posterTitleLandscape : {}),
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
              {!compact && !isLandscape ? (
                <span style={styles.langText}>{item.language || "Mixed"}</span>
              ) : null}
            </div>
          </div>

          {showPanel ? (
            <div style={styles.xfPanel}>
              <div style={styles.xfBtnRow}>
                <span
                  role="button"
                  tabIndex={-1}
                  aria-label={`Watch ${item.title}`}
                  style={styles.xfPlay}
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(targetPath);
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="#08111d" aria-hidden="true">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </span>
                <span style={styles.xfType}>{isSeries ? "Series" : "Movie"}</span>
              </div>
              <div style={styles.xfTitle}>{item.title}</div>
              <div style={styles.xfMeta}>
                {itemRating ? <span style={styles.xfRating}>★ {itemRating}</span> : null}
                {item.year ? <span style={styles.xfDim}>{item.year}</span> : null}
                {item.quality ? <span style={styles.xfQuality}>{item.quality}</span> : null}
                {item.runtime ? <span style={styles.xfDim}>{item.runtime}m</span> : null}
              </div>
              {genreLine ? <div style={styles.xfGenres}>{genreLine}</div> : null}
            </div>
          ) : null}

          {!isLandscape && !compact && hovered && !tv ? (
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

        {!isLandscape ? (
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
        ) : null}
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
  cardWrapDefault: { width: "272px" },
  cardWrapLandscape: { width: "360px" },
  cardWrapLandscapeTV: { width: "320px" },
  cardWrapTV: { width: "280px" },
  cardWrapTablet: { width: "220px" },
  cardWrapMobile: { width: "160px" },
  cardButton: {
    width: "100%",
    textAlign: "left",
    display: "grid",
    gap: "10px",
  },
  posterWrap: {
    position: "relative",
    borderRadius: "10px",
    overflow: "hidden",
    background: "var(--bg-tertiary)",
    border: "1px solid rgba(173, 211, 236, 0.14)",
    transition: "transform 300ms ease, box-shadow 300ms ease, border-color 300ms ease",
  },
  posterWrapLandscape: {
    borderRadius: "6px",
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
  newBadge: {
    padding: "4px 8px",
    borderRadius: "6px",
    background: "var(--accent-pink)",
    color: "#fff",
    fontSize: "0.55rem",
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
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
  posterTitleLandscape: {
    fontSize: "0.82rem",
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
  // Netflix-style expand panel (landscape rails): play + meta + genres.
  // Brand colors, not Netflix red — white play, cyan rating, navy panel.
  xfPanel: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 3,
    padding: "28px 12px 12px",
    background:
      "linear-gradient(180deg, rgba(5,12,22,0) 0%, rgba(5,12,22,0.82) 45%, rgba(5,12,22,0.97) 100%)",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  xfBtnRow: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  xfPlay: {
    width: "38px",
    height: "38px",
    minWidth: "38px",
    borderRadius: "50%",
    background: "#ffffff",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    paddingLeft: "2px",
    cursor: "pointer",
    boxShadow: "0 6px 20px rgba(0,0,0,0.45)",
  },
  xfType: {
    color: "rgba(255,255,255,0.75)",
    fontSize: "0.68rem",
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: "0.1em",
  },
  xfTitle: {
    color: "#fff",
    fontSize: "0.9rem",
    fontWeight: "800",
    lineHeight: "1.2",
    display: "-webkit-box",
    WebkitLineClamp: 1,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
    textShadow: "0 2px 10px rgba(0,0,0,0.6)",
  },
  xfMeta: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    flexWrap: "wrap",
  },
  xfRating: {
    color: "var(--accent-cyan)",
    fontSize: "0.76rem",
    fontWeight: "800",
  },
  xfDim: {
    color: "rgba(255,255,255,0.65)",
    fontSize: "0.72rem",
    fontWeight: "600",
  },
  xfQuality: {
    padding: "1px 6px",
    borderRadius: "4px",
    border: "1px solid rgba(255,255,255,0.35)",
    color: "rgba(255,255,255,0.8)",
    fontSize: "0.62rem",
    fontWeight: "700",
  },
  xfGenres: {
    color: "rgba(255,255,255,0.6)",
    fontSize: "0.68rem",
    fontWeight: "600",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
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
