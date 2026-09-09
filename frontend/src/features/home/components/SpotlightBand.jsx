import { useState } from 'react';
import { Link } from 'react-router-dom';
import WatchlistButton from '../../../components/ui/WatchlistButton';
import { useBreakpoint, useTVMode } from '../../../hooks';

function tmdbSized(url, width) {
  if (!url || !url.includes('image.tmdb.org/t/p/')) return url;
  return url.replace(/\/t\/p\/[^/]+\//, `/t/p/w${width}/`);
}

/**
 * Full-bleed static billboard (Netflix-style, no carousel): edge-to-edge
 * backdrop, oversized title, Top-10 badge, maturity box, Watch Now.
 * Deliberately NO timers / autoplay / transitions — variety comes from
 * HomePage's rotated pools, reliability from zero animation. TV-safe.
 */
function SpotlightBand({ item, eyebrow, topRank }) {
  const { isMobile } = useBreakpoint();
  const isTVMode = useTVMode();
  const [bgFailed, setBgFailed] = useState(false);

  if (!item?.id) return null;

  const isSeries = item.type === 'series';
  const href = isSeries ? `/series/${item.id}` : `/movies/${item.id}`;
  // Two-level fallback: backdrop → poster → solid color (never a void).
  const backdrop = bgFailed
    ? item.poster
    : item.backdrop || item.poster;
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
          decoding="async"
          onError={() => setBgFailed(true)}
          style={styles.bg}
        />
      ) : null}
      <div style={styles.scrim} />
      <div style={styles.bottomFade} />

      <div style={{ ...styles.content, ...(isMobile ? styles.contentMobile : {}) }}>
        <div style={styles.eyebrowRow}>
          <span style={styles.eyebrow}>{eyebrow || 'Spotlight'}</span>
          <span style={styles.type}>{isSeries ? 'Series' : 'Movie'}</span>
        </div>
        <h2 style={{ ...styles.title, ...(isMobile ? styles.titleMobile : {}) }}>
          {item.title}
        </h2>
        {topRank > 0 && topRank <= 10 ? (
          <div style={styles.topRow}>
            <span style={styles.topBox}>TOP 10</span>
            <span style={styles.topText}>#{topRank} in Top 10 Today</span>
          </div>
        ) : null}
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
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
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

      {item.quality ? (
        <div style={styles.maturity} aria-label={`Quality ${item.quality}`}>
          {item.quality}
        </div>
      ) : null}
    </section>
  );
}

const styles = {
  band: {
    position: 'relative',
    width: '100%',
    minHeight: '66vh',
    display: 'flex',
    alignItems: 'flex-end',
    overflow: 'hidden',
    background: '#050c16',
  },
  bandTV: {
    minHeight: '68vh',
  },
  bandMobile: {
    minHeight: '56vh',
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
      'linear-gradient(100deg, rgba(5,12,22,0.95) 0%, rgba(5,12,22,0.55) 45%, rgba(5,12,22,0.1) 75%, rgba(5,12,22,0.35) 100%)',
  },
  bottomFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '38%',
    background: 'linear-gradient(180deg, transparent 0%, #050c16 100%)',
  },
  content: {
    position: 'relative',
    zIndex: 1,
    width: 'min(1720px, calc(100vw - 96px))',
    maxWidth: '640px',
    marginLeft: 'max(48px, calc((100vw - 1720px) / 2))',
    marginRight: 'auto',
    padding: '0 0 10vh',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  contentMobile: {
    width: 'calc(100vw - 32px)',
    marginLeft: '16px',
    padding: '0 0 10vh',
  },
  eyebrowRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  eyebrow: {
    color: 'var(--accent-cyan)',
    fontSize: '0.72rem',
    fontWeight: '900',
    letterSpacing: '0.18em',
    textTransform: 'uppercase',
  },
  type: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: '0.72rem',
    fontWeight: '700',
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
  },
  title: {
    color: '#fff',
    fontSize: 'clamp(2.2rem, 5.5vw, 4.6rem)',
    fontWeight: '900',
    lineHeight: '1.02',
    margin: 0,
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
    textShadow: '0 8px 40px rgba(0,0,0,0.65)',
    letterSpacing: '-0.02em',
  },
  titleMobile: {
    fontSize: 'clamp(1.7rem, 9vw, 2.4rem)',
  },
  topRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  topBox: {
    padding: '3px 7px',
    borderRadius: '5px',
    background: 'var(--accent-cyan)',
    color: '#050c16',
    fontSize: '0.68rem',
    fontWeight: '900',
    letterSpacing: '0.06em',
  },
  topText: {
    color: '#fff',
    fontSize: '1rem',
    fontWeight: '800',
    textShadow: '0 2px 12px rgba(0,0,0,0.6)',
  },
  desc: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: '0.95rem',
    lineHeight: '1.6',
    margin: 0,
    maxWidth: '52ch',
    display: '-webkit-box',
    WebkitLineClamp: 3,
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
    marginTop: '6px',
  },
  watchBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '10px',
    padding: '13px 34px',
    borderRadius: '6px',
    background: '#ffffff',
    color: '#050c16',
    fontSize: '1rem',
    fontWeight: '900',
    textDecoration: 'none',
    whiteSpace: 'nowrap',
  },
  maturity: {
    position: 'absolute',
    right: 0,
    bottom: '22%',
    zIndex: 1,
    padding: '8px 18px 8px 14px',
    borderLeft: '3px solid rgba(255,255,255,0.85)',
    background: 'rgba(5,12,22,0.45)',
    color: '#fff',
    fontSize: '0.85rem',
    fontWeight: '700',
    letterSpacing: '0.04em',
  },
};

export default SpotlightBand;
