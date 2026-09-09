import { Link } from 'react-router-dom';
import { useBreakpoint, useTVMode } from '../../../hooks';

function tmdbSized(url, width) {
  if (!url || !url.includes('image.tmdb.org/t/p/')) return url;
  return url.replace(/\/t\/p\/[^/]+\//, `/t/p/w${width}/`);
}

/**
 * Netflix-style Top 10 rail: giant rank numerals + portrait posters.
 * Fully static — no timers, no scale animations. TV remote works via
 * native focus scrolling; touch via swipe. Posters stay small (w185)
 * so the row stays light on low-end devices.
 */
function TopTenRail({ items }) {
  const { isMobile } = useBreakpoint();
  const isTVMode = useTVMode();
  const top = (items || []).slice(0, 10);

  if (top.length < 5) return null;

  return (
    <section
      aria-label="Top 10 right now"
      style={{
        ...styles.section,
        ...(isMobile ? styles.sectionMobile : {}),
      }}
    >
      <div
        style={{
          ...styles.header,
          ...(isTVMode ? styles.headerTV : isMobile ? styles.headerMobile : {}),
        }}
      >
        <div>
          <span style={styles.eyebrow}>Top 10</span>
          <h2 style={{ ...styles.title, ...(isMobile ? styles.titleMobile : {}) }}>
            Top 10 Right Now
          </h2>
        </div>
        <Link
          to="/browse?sort=trending"
          style={{
            ...styles.viewAll,
            ...(isTVMode ? styles.viewAllTV : {}),
          }}
        >
          View All ›
        </Link>
      </div>

      <div
        role="region"
        aria-label="Top 10 content rail"
        style={{
          ...styles.rail,
          ...(isTVMode ? styles.railTV : isMobile ? styles.railMobile : {}),
        }}
      >
        {top.map((item, index) => {
          const isSeries = item.type === 'series';
          const href = item.id
            ? isSeries
              ? `/series/${item.id}`
              : `/movies/${item.id}`
            : '/browse';
          return (
            <Link
              key={item.id || `top-${index}`}
              to={href}
              aria-label={`#${index + 1}: ${item.title}`}
              style={{
                ...styles.cell,
                ...(isMobile ? styles.cellMobile : {}),
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  ...styles.rank,
                  ...(isMobile ? styles.rankMobile : {}),
                }}
              >
                {index + 1}
              </span>
              {item.poster ? (
                <img
                  src={tmdbSized(item.poster, 185)}
                  srcSet={
                    item.poster.includes('image.tmdb.org')
                      ? `${tmdbSized(item.poster, 185)} 185w, ${tmdbSized(item.poster, 342)} 342w`
                      : undefined
                  }
                  sizes="130px"
                  alt=""
                  loading="lazy"
                  decoding="async"
                  style={{
                    ...styles.poster,
                    ...(isMobile ? styles.posterMobile : {}),
                  }}
                />
              ) : (
                <div
                  style={{
                    ...styles.poster,
                    ...styles.posterFallback,
                    ...(isMobile ? styles.posterMobile : {}),
                  }}
                />
              )}
            </Link>
          );
        })}
      </div>
    </section>
  );
}

const styles = {
  section: {
    // Extra bottom air: Top 10 closes the showcase zone
    // (Movies/Series/Top 10) before the catalog rails begin.
    padding: '2px 0 12px',
    overflow: 'hidden',
    width: '100%',
    maxWidth: '100vw',
    boxSizing: 'border-box',
  },
  sectionMobile: {
    padding: '4px 0 8px',
  },
  header: {
    width: '100%',
    boxSizing: 'border-box',
    padding: '0 max(48px, calc((100vw - 1720px) / 2))',
    margin: '0 0 6px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: '24px',
  },
  headerTV: {
    margin: '0 0 16px',
  },
  headerMobile: {
    padding: '0 14px',
    alignItems: 'center',
  },
  eyebrow: {
    display: 'inline-block',
    marginBottom: '4px',
    fontSize: '0.68rem',
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: '0.16em',
    color: 'var(--accent-pink)',
  },
  title: {
    color: 'var(--text-primary)',
    fontSize: 'clamp(1.1rem, 2.5vw, 1.8rem)',
    margin: 0,
  },
  titleMobile: {
    fontSize: '1.1rem',
    fontWeight: '800',
  },
  viewAll: {
    minHeight: '44px',
    display: 'inline-flex',
    alignItems: 'center',
    padding: '0 6px',
    color: 'var(--text-secondary)',
    fontSize: '0.8rem',
    fontWeight: '700',
    whiteSpace: 'nowrap',
    textDecoration: 'none',
    flexShrink: 0,
  },
  viewAllTV: {
    minHeight: '48px',
    padding: '0 18px',
    fontSize: '0.9rem',
  },
  rail: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: '6px',
    overflowX: 'auto',
    padding: '10px max(48px, calc((100vw - 1720px) / 2)) 16px',
    scrollbarWidth: 'none',
    overscrollBehaviorX: 'contain',
  },
  railTV: {
    gap: '14px',
  },
  railMobile: {
    padding: '8px 14px 12px',
    gap: '2px',
  },
  cell: {
    position: 'relative',
    flex: '0 0 auto',
    display: 'flex',
    alignItems: 'flex-end',
    textDecoration: 'none',
  },
  cellMobile: {},
  rank: {
    fontSize: '150px',
    fontWeight: '900',
    lineHeight: '0.78',
    letterSpacing: '-0.06em',
    color: '#16233a',
    WebkitTextStroke: '2px rgba(160, 200, 230, 0.55)',
    marginRight: '-20px',
    userSelect: 'none',
    fontFamily: 'var(--font-family-display, inherit)',
  },
  rankMobile: {
    fontSize: '104px',
    marginRight: '-14px',
  },
  poster: {
    position: 'relative',
    zIndex: 1,
    width: '118px',
    aspectRatio: '2 / 3',
    objectFit: 'cover',
    borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.12)',
    background: 'rgba(255,255,255,0.06)',
  },
  posterMobile: {
    width: '92px',
  },
  posterFallback: {},
};

export default TopTenRail;
