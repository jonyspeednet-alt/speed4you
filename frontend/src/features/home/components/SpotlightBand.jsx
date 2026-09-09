import { Link } from 'react-router-dom';
import WatchlistButton from '../../../components/ui/WatchlistButton';
import { useBreakpoint, useTVMode } from '../../../hooks';

function tmdbSized(url, width) {
  if (!url || !url.includes('image.tmdb.org/t/p/')) return url;
  return url.replace(/\/t\/p\/[^/]+\//, `/t/p/w${width}/`);
}

/**
 * Compact static spotlight band (~300px) — fills the ex-hero void WITHOUT
 * a carousel: no timers, no autoplay, no transitions. One backdrop image,
 * title, one-line pitch, Watch Now. Variety comes from HomePage's rotated
 * pools (different pick every 30 min), not client-side animation.
 */
function SpotlightBand({ item, eyebrow }) {
  const { isMobile } = useBreakpoint();
  const isTVMode = useTVMode();

  if (!item?.id) return null;

  const isSeries = item.type === 'series';
  const href = isSeries ? `/series/${item.id}` : `/movies/${item.id}`;
  const backdrop = item.backdrop || item.poster;
  const genreFirst = String(item.genre || '').split(',')[0].trim();

  return (
    <section
      aria-label={`Spotlight: ${item.title}`}
      style={{
        ...styles.band,
        ...(isTVMode ? styles.bandTV : isMobile ? styles.bandMobile : {}),
      }}
    >
      {backdrop ? (
        <img
          src={tmdbSized(backdrop, 1280)}
          srcSet={
            backdrop.includes('image.tmdb.org')
              ? `${tmdbSized(backdrop, 780)} 780w, ${tmdbSized(backdrop, 1280)} 1280w`
              : undefined
          }
          sizes="100vw"
          alt=""
          aria-hidden="true"
          loading="eager"
          fetchPriority="high"
          decoding="async"
          style={styles.bg}
        />
      ) : null}
      <div style={styles.scrim} />

      <div style={{ ...styles.content, ...(isMobile ? styles.contentMobile : {}) }}>
        <div style={styles.eyebrowRow}>
          <span style={styles.eyebrow}>{eyebrow || 'Spotlight'}</span>
          <span style={styles.type}>{isSeries ? 'Series' : 'Movie'}</span>
        </div>
        <h2 style={{ ...styles.title, ...(isMobile ? styles.titleMobile : {}) }}>
          {item.title}
        </h2>
        {item.description ? (
          <p style={styles.desc}>{item.description}</p>
        ) : null}
        <div style={styles.chips}>
          {item.year && item.year !== 'Unknown' ? (
            <span style={styles.chip}>{item.year}</span>
          ) : null}
          {item.rating && item.rating !== 'N/A' ? (
            <span style={{ ...styles.chip, ...styles.chipRating }}>★ {item.rating}</span>
          ) : null}
          {genreFirst ? <span style={styles.chip}>{genreFirst}</span> : null}
          {item.language ? <span style={styles.chip}>{item.language}</span> : null}
        </div>
        <div style={styles.actions}>
          <Link to={href} style={styles.watchBtn}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M8 5v14l11-7z" />
            </svg>
            Watch Now
          </Link>
          <WatchlistButton
            contentType={isSeries ? 'series' : 'movie'}
            contentId={item.id}
            title={item.title}
          />
        </div>
      </div>
    </section>
  );
}

const styles = {
  band: {
    position: 'relative',
    margin: '0 max(48px, calc((100vw - 1720px) / 2))',
    minHeight: '300px',
    borderRadius: '20px',
    overflow: 'hidden',
    background: '#0a1424',
    border: '1px solid rgba(255,255,255,0.08)',
    display: 'flex',
    alignItems: 'flex-end',
  },
  bandTV: {
    minHeight: '360px',
  },
  bandMobile: {
    margin: '0 16px',
    minHeight: '260px',
    borderRadius: '16px',
  },
  bg: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    objectPosition: 'center 20%',
  },
  scrim: {
    position: 'absolute',
    inset: 0,
    background:
      'linear-gradient(100deg, rgba(5,12,22,0.96) 0%, rgba(5,12,22,0.75) 45%, rgba(5,12,22,0.25) 75%, rgba(5,12,22,0.55) 100%), linear-gradient(0deg, rgba(5,12,22,0.9) 0%, transparent 45%)',
  },
  content: {
    position: 'relative',
    zIndex: 1,
    padding: '28px 32px',
    maxWidth: '640px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  contentMobile: {
    padding: '20px 18px',
  },
  eyebrowRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  eyebrow: {
    color: 'var(--accent-cyan)',
    fontSize: '0.7rem',
    fontWeight: '900',
    letterSpacing: '0.18em',
    textTransform: 'uppercase',
  },
  type: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: '0.7rem',
    fontWeight: '700',
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
  },
  title: {
    color: '#fff',
    fontSize: 'clamp(1.5rem, 3vw, 2.4rem)',
    fontWeight: '900',
    lineHeight: '1.1',
    margin: 0,
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
    textShadow: '0 4px 24px rgba(0,0,0,0.6)',
  },
  titleMobile: {
    fontSize: '1.35rem',
  },
  desc: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: '0.88rem',
    lineHeight: '1.55',
    margin: 0,
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  },
  chips: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
  },
  chip: {
    padding: '4px 12px',
    borderRadius: '999px',
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.12)',
    color: 'rgba(255,255,255,0.9)',
    fontSize: '0.72rem',
    fontWeight: '700',
  },
  chipRating: {
    color: 'var(--accent-cyan)',
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap',
    marginTop: '4px',
  },
  watchBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 28px',
    borderRadius: '999px',
    background: '#ffffff',
    color: '#050c16',
    fontSize: '0.92rem',
    fontWeight: '900',
    textDecoration: 'none',
    whiteSpace: 'nowrap',
  },
};

export default SpotlightBand;
