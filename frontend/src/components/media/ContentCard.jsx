import { useState } from 'react';
import WatchlistButton from '../ui/WatchlistButton';

function ContentCard({ item, type, index, eager, compact, tablet, tv, onQuickView, showReviewBadge, cardWidth }) {
  const isSeries = type === 'series' || item.type === 'series';
  const isLandscape = type === 'continue';
  const [hovered, setHovered] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const genre = String(item.genre || 'Featured').split(',')[0].trim();
  const itemRating = item.rating || null;

  return (
    <article
      className={`content-rail-card${tv ? ' tv-mode-card' : ''}`}
      style={{
        ...styles.cardWrap,
        ...(isLandscape ? styles.cardWrapLandscape : {}),
        ...(cardWidth ? { width: cardWidth } : {}),
        ...(tv ? (isLandscape ? styles.cardWrapLandscapeTV : styles.cardWrapTV) : compact ? styles.cardWrapMobile : tablet ? styles.cardWrapTablet : styles.cardWrapDefault),
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        type="button"
        className="content-card-trigger"
        style={styles.cardButton}
        onClick={() => onQuickView && onQuickView(item)}
        onFocus={() => tv && setHovered(true)}
        onBlur={() => tv && setHovered(false)}
      >
        <div
          style={{
            ...styles.posterWrap,
            aspectRatio: isLandscape ? '16 / 9' : '2 / 3',
            transform: hovered && !compact ? 'translateY(-8px) scale(1.03)' : 'translateY(0) scale(1)',
            boxShadow: hovered && !compact
              ? '0 32px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(0,255,255,0.2), 0 0 40px rgba(0,255,255,0.1)'
              : '0 8px 32px rgba(0,0,0,0.4)',
            borderColor: hovered && !compact ? 'rgba(0,255,255,0.3)' : 'rgba(255,255,255,0.08)',
          }}
        >
          {!imgLoaded ? <div style={styles.posterPlaceholder}><div style={styles.posterShimmer} /></div> : null}
          <img
            src={item.poster}
            alt={item.title}
            loading={eager ? 'eager' : 'lazy'}
            fetchPriority={eager ? 'high' : 'low'}
            style={{
              ...styles.poster,
              opacity: imgLoaded ? 1 : 0,
              transform: hovered && !compact ? 'scale(1.06)' : 'scale(1)',
            }}
            onLoad={() => setImgLoaded(true)}
          />
          <div style={styles.posterOverlay} />

          <div style={styles.topBadges}>
            <span style={styles.typeBadge}>{isSeries ? 'Series' : 'Movie'}</span>
            {itemRating ? (
              <span style={styles.ratingBadge}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="var(--accent-tertiary)" aria-hidden="true"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                {itemRating}
              </span>
            ) : null}
          </div>

          <div style={styles.posterBottom}>
            <h3 style={styles.posterTitle}>{item.title}</h3>
            <div style={styles.posterMeta}>
              <span style={styles.genrePill}>{genre}</span>
              {item.year ? <span style={styles.yearText}>{item.year}</span> : null}
              <span style={styles.langText}>{item.language || 'Mixed'}</span>
            </div>
          </div>

          {!compact && hovered ? (
            <div style={styles.hoverOverlay}>
              <div style={styles.playCircle}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="#08111d" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>
              </div>
              <span style={styles.hoverLabel}>Quick View</span>
            </div>
          ) : null}
        </div>

        <div style={styles.cardInfo}>
          <div className="content-rail-meta" style={styles.cardMeta}>
            <span>{genre}</span>
            <span style={styles.metaDot}>·</span>
            {item.year ? <><span>{item.year}</span><span style={styles.metaDot}>·</span></> : null}
            <span>{item.language || 'Mixed'}</span>
            {item.runtime ? <><span style={styles.metaDot}>·</span><span>{item.runtime}m</span></> : null}
            {showReviewBadge && item.metadataStatus === 'needs_review' ? (
              <span style={styles.reviewBadge}>Review</span>
            ) : null}
          </div>
        </div>
      </button>

      <div style={styles.watchlistSlot}>
        <WatchlistButton
          contentType={isSeries ? 'series' : 'movie'}
          contentId={item.id}
          title={item.title}
          compact
        />
      </div>
    </article>
  );
}

const styles = {
  cardWrap: {
    position: 'relative',
    flex: '0 0 auto',
    scrollSnapAlign: 'start',
  },
  cardWrapDefault: { width: '220px' },
  cardWrapLandscape: { width: '360px' },
  cardWrapLandscapeTV: { width: '420px' },
  cardWrapTV: { width: '280px' },
  cardWrapTablet: { width: '196px' },
  cardWrapMobile: { width: '156px' },
  cardButton: {
    width: '100%',
    textAlign: 'left',
    display: 'grid',
    gap: '10px',
  },
  posterWrap: {
    position: 'relative',
    borderRadius: '14px',
    overflow: 'hidden',
    background: '#0d1a2d',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    transition: 'all 450ms cubic-bezier(0.34, 1.56, 0.64, 1)',
  },
  poster: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    transition: 'transform 500ms cubic-bezier(0.4, 0, 0.2, 1), opacity 300ms ease',
  },
  posterPlaceholder: {
    position: 'absolute',
    inset: 0,
    background: 'rgba(255, 255, 255, 0.03)',
  },
  posterShimmer: {
    position: 'absolute',
    inset: 0,
    background: 'linear-gradient(90deg, rgba(255,255,255,0.03), rgba(255,255,255,0.1), rgba(255,255,255,0.03))',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.8s linear infinite',
  },
  posterOverlay: {
    position: 'absolute',
    inset: 0,
    background: 'linear-gradient(180deg, rgba(0,0,0,0) 25%, rgba(0,0,0,0.08) 45%, rgba(7,17,31,0.88) 100%)',
    pointerEvents: 'none',
  },
  topBadges: {
    position: 'absolute',
    top: '10px',
    left: '10px',
    right: '10px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '6px',
    zIndex: 1,
  },
  typeBadge: {
    padding: '5px 10px',
    borderRadius: '6px',
    background: 'rgba(5, 12, 22, 0.6)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    color: '#ffffff',
    fontSize: '0.62rem',
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
    border: '1px solid rgba(255, 255, 255, 0.1)',
  },
  ratingBadge: {
    padding: '5px 9px',
    borderRadius: '6px',
    background: 'rgba(5, 12, 22, 0.6)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    color: 'var(--accent-cyan)',
    fontSize: '0.7rem',
    fontWeight: '900',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
  },
  posterBottom: {
    position: 'absolute',
    left: '10px',
    right: '10px',
    bottom: '10px',
    zIndex: 1,
  },
  posterTitle: {
    color: '#fff',
    fontSize: '0.88rem',
    fontWeight: '700',
    lineHeight: '1.3',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
    marginBottom: '6px',
    textShadow: '0 2px 10px rgba(0,0,0,0.6)',
    letterSpacing: '-0.01em',
  },
  posterMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    flexWrap: 'wrap',
  },
  genrePill: {
    padding: '3px 8px',
    borderRadius: '6px',
    background: 'rgba(255,255,255,0.12)',
    color: 'rgba(255,255,255,0.9)',
    fontSize: '0.62rem',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },
  yearText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: '0.68rem',
    fontWeight: '600',
  },
  langText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: '0.66rem',
    fontWeight: '600',
  },
  hoverOverlay: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    background: 'rgba(0,0,0,0.35)',
    backdropFilter: 'blur(2px)',
    zIndex: 2,
  },
  playCircle: {
    width: '50px',
    height: '50px',
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.95)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 8px 28px rgba(0,0,0,0.35)',
    paddingLeft: '3px',
  },
  hoverLabel: {
    color: '#fff',
    fontSize: '0.7rem',
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    textShadow: '0 2px 8px rgba(0,0,0,0.5)',
  },
  cardInfo: {
    padding: '0 2px',
  },
  cardMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    color: 'var(--text-muted)',
    fontSize: '0.72rem',
    textTransform: 'capitalize',
  },
  metaDot: {
    opacity: 0.4,
    fontSize: '0.6rem',
  },
  reviewBadge: {
    padding: '4px 8px',
    borderRadius: '6px',
    background: 'rgba(255, 209, 102, 0.14)',
    color: 'var(--accent-tertiary)',
    fontSize: '0.6rem',
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
  },
  watchlistSlot: {
    position: 'absolute',
    top: '8px',
    right: '8px',
    zIndex: 3,
  },
};

export default ContentCard;
