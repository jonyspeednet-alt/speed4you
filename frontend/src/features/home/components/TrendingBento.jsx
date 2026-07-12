import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useBreakpoint, useTVMode } from '../../../hooks';

function getTmdbPosterSrc(url, targetSize = 'w342') {
  if (!url) return url;
  if (url.includes('image.tmdb.org/t/p/')) {
    return url.replace(/\/t\/p\/[^/]+\//, `/t/p/${targetSize}/`);
  }
  return url;
}

export default function TrendingBento({ items }) {
  const { isMobile, isTablet } = useBreakpoint();
  const isTVMode = useTVMode();
  const displayItems = items.slice(0, 5);

  if (displayItems.length < 3 && !isMobile) return null;

  const isCompact = !isMobile && displayItems.length < 5;

  return (
    <section style={{
      ...styles.section,
      width: isMobile ? '100vw' : isTablet ? 'calc(100vw - 48px)' : 'min(1720px, calc(100vw - 96px))',
      ...(isTVMode ? styles.sectionTV : {})
    }}>
      <div style={styles.header}>
        <div>
          <span style={styles.eyebrow}>Viral Hits</span>
          <h2 style={styles.title}>Trending Right Now</h2>
        </div>
        <Link to="/browse?sort=trending" style={styles.viewAll}>View All</Link>
      </div>

      <div style={{
        ...styles.grid,
        ...(isTVMode ? styles.gridTV : isMobile ? styles.gridMobile : isTablet ? styles.gridTablet : {}),
        ...(isCompact ? { gridTemplateColumns: `repeat(${displayItems.length}, 1fr)`, gridTemplateRows: '220px' } : {}),
      }}>
        {displayItems.map((item, index) => (
          <BentoItem
            key={item.id}
            item={item}
            index={index}
            isLarge={index === 0 && !isMobile && !isTVMode && !isCompact}
            tv={isTVMode}
            mobile={isMobile}
          />
        ))}
      </div>
    </section>
  );
}

function BentoItem({ item, index, isLarge, tv, mobile }) {
  const [hovered, setHovered] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const isSeries = item.type === 'series';
  const path = isSeries ? `/series/${item.id}` : `/movies/${item.id}`;
  const imageSrc = getTmdbPosterSrc(
    isLarge ? (item.backdrop || item.poster) : item.poster,
    isLarge ? 'w780' : 'w342'
  );
  const genre = String(item.genre || '').split(',')[0].trim();

  return (
    <Link
      to={path}
      style={{
        ...styles.item,
        ...(isLarge ? styles.itemLarge : {}),
        ...(tv ? styles.itemTV : mobile ? styles.itemMobile : {}),
        ...(hovered ? styles.itemHovered : {}),
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
      aria-label={`${item.title} — #${index + 1} trending`}
    >
      {!imgLoaded && (
        <div style={styles.imgPlaceholder}>
          <div style={styles.imgShimmer} />
        </div>
      )}
      {imageSrc ? (
        <img
          src={imageSrc}
          alt={item.title}
          loading="lazy"
          decoding="async"
          onLoad={() => setImgLoaded(true)}
          style={{
            ...styles.image,
            opacity: imgLoaded ? 1 : 0,
            ...(hovered ? styles.imageHovered : {})
          }}
        />
      ) : null}

      <div style={{
        ...styles.overlay,
        ...(hovered ? styles.overlayHovered : {})
      }} />

      <div style={styles.content}>
        <div style={styles.topRow}>
          <span style={styles.rank}>#{index + 1}</span>
          <div style={styles.topBadges}>
            <span style={styles.typeBadge}>{isSeries ? 'Series' : 'Movie'}</span>
            {item.rating ? (
              <span style={styles.ratingBadge}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="var(--accent-tertiary)" aria-hidden="true">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
                {item.rating}
              </span>
            ) : null}
          </div>
        </div>

        <div style={styles.bottomRow}>
          <h3 style={{
            ...styles.itemTitle,
            ...(isLarge ? styles.itemTitleLarge : {})
          }}>{item.title}</h3>

          <div style={styles.metaRow}>
            {genre ? <span style={styles.genrePill}>{genre}</span> : null}
            {item.language ? <span style={styles.langText}>{item.language}</span> : null}
            {item.year ? <span style={styles.yearText}>{item.year}</span> : null}
          </div>

          {hovered && (
            <div style={styles.actions}>
              <span style={styles.quickViewBtn}>View Details</span>
            </div>
          )}
        </div>
      </div>

      {isLarge && <div style={styles.glow} />}
    </Link>
  );
}

const styles = {
  section: {
    margin: '40px auto',
  },
  sectionTV: {
    width: 'min(1720px, calc(100vw - 120px))',
    margin: '60px auto',
  },
  header: {
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: '24px',
    gap: '16px',
    padding: '0 14px',
  },
  eyebrow: {
    color: 'var(--accent-pink)',
    fontSize: '0.75rem',
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: '0.15em',
    display: 'block',
    marginBottom: '8px',
  },
  title: {
    color: 'var(--text-primary)',
    fontSize: '2rem',
    fontWeight: '900',
  },
  viewAll: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '0 12px',
    minHeight: '34px',
    borderRadius: '10px',
    background: 'rgba(255, 255, 255, 0.055)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    color: 'var(--text-secondary)',
    fontSize: '0.72rem',
    fontWeight: '800',
    letterSpacing: '0.02em',
    whiteSpace: 'nowrap',
    textDecoration: 'none',
    flexShrink: 0,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gridTemplateRows: 'repeat(2, 220px)',
    gap: '16px',
  },
  gridTablet: {
    gridTemplateColumns: 'repeat(2, 1fr)',
    gridTemplateRows: 'repeat(3, 240px)',
  },
  gridMobile: {
    display: 'flex',
    flexDirection: 'row',
    overflowX: 'auto',
    gap: '12px',
    padding: '4px 14px 12px',
    scrollSnapType: 'x proximity',
    scrollbarWidth: 'none',
    overscrollBehaviorX: 'contain',
  },
  gridTV: {
    display: 'flex',
    overflowX: 'auto',
    padding: '20px 0',
    gap: '24px',
    scrollbarWidth: 'none',
  },
  item: {
    position: 'relative',
    borderRadius: '16px',
    overflow: 'hidden',
    background: '#0d1a2d',
    cursor: 'pointer',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    transition: 'transform 400ms cubic-bezier(0.4, 0, 0.2, 1), border-color 400ms cubic-bezier(0.4, 0, 0.2, 1), box-shadow 400ms cubic-bezier(0.4, 0, 0.2, 1)',
    textDecoration: 'none',
    display: 'block',
  },
  itemLarge: {
    gridColumn: 'span 2',
    gridRow: 'span 2',
    borderRadius: '24px',
  },
  itemHovered: {
    transform: 'scale(1.02)',
    borderColor: 'var(--accent-cyan)',
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6), 0 0 20px rgba(0, 255, 255, 0.1)',
    zIndex: 2,
  },
  itemTV: {
    minWidth: '320px',
    height: '480px',
    flexShrink: 0,
  },
  itemMobile: {
    minWidth: '200px',
    height: '280px',
    flexShrink: 0,
    scrollSnapAlign: 'start',
  },
  imgPlaceholder: {
    position: 'absolute',
    inset: 0,
    background: 'rgba(255, 255, 255, 0.03)',
    overflow: 'hidden',
  },
  imgShimmer: {
    position: 'absolute',
    inset: 0,
    background: 'linear-gradient(90deg, rgba(255,255,255,0.03), rgba(255,255,255,0.1), rgba(255,255,255,0.03))',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.8s linear infinite',
  },
  image: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    transition: 'transform 600ms ease, opacity 300ms ease',
  },
  imageHovered: {
    transform: 'scale(1.06)',
  },
  overlay: {
    position: 'absolute',
    inset: 0,
    background: 'linear-gradient(to top, rgba(5, 12, 22, 0.95) 0%, rgba(5, 12, 22, 0.2) 50%, transparent 100%)',
    transition: 'background 300ms ease',
  },
  overlayHovered: {
    background: 'linear-gradient(to top, rgba(5, 12, 22, 0.98) 0%, rgba(5, 12, 22, 0.4) 60%, rgba(0, 255, 255, 0.06) 100%)',
  },
  content: {
    position: 'absolute',
    inset: 0,
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    zIndex: 3,
  },
  topRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '8px',
  },
  topBadges: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '4px',
  },
  rank: {
    fontSize: '1.5rem',
    fontWeight: '900',
    color: 'rgba(255, 255, 255, 0.3)',
    fontFamily: 'var(--font-family-display)',
    WebkitTextStroke: '1px rgba(255, 255, 255, 0.5)',
  },
  typeBadge: {
    padding: '4px 8px',
    borderRadius: '6px',
    background: 'rgba(5, 12, 22, 0.6)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    fontSize: '0.62rem',
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: '#fff',
  },
  ratingBadge: {
    padding: '4px 8px',
    borderRadius: '6px',
    background: 'rgba(5, 12, 22, 0.6)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    color: 'var(--accent-cyan)',
    fontSize: '0.68rem',
    fontWeight: '900',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  bottomRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  itemTitle: {
    fontSize: '1rem',
    fontWeight: '800',
    color: '#fff',
    lineHeight: '1.2',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
    textShadow: '0 2px 10px rgba(0,0,0,0.6)',
  },
  itemTitleLarge: {
    fontSize: '1.8rem',
    WebkitLineClamp: 3,
  },
  metaRow: {
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
  langText: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: '0.66rem',
    fontWeight: '600',
  },
  yearText: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: '0.66rem',
    fontWeight: '600',
  },
  actions: {
    display: 'flex',
    gap: '10px',
    alignItems: 'center',
  },
  quickViewBtn: {
    display: 'inline-block',
    padding: '7px 16px',
    borderRadius: '999px',
    background: 'var(--accent-cyan)',
    color: '#050c16',
    fontSize: '0.75rem',
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  glow: {
    position: 'absolute',
    top: '-50%',
    left: '-50%',
    width: '200%',
    height: '200%',
    background: 'radial-gradient(circle, rgba(0, 255, 255, 0.04), transparent 70%)',
    pointerEvents: 'none',
    zIndex: 1,
  },
};
