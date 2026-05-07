import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { moviesService } from '../services/moviesService';
import { useBreakpoint } from '../hooks';
import { useRecentlyViewed } from '../hooks';
import WatchlistButton from '../components/ui/WatchlistButton';
import ShareButton from '../components/ui/ShareButton';
import StarRating from '../components/ui/StarRating';

const posterFallback = '/portal/assets/poster-placeholder.svg';
const MOVIE_CACHE_PREFIX = 'portal-movie-details-v1:';

function readMovieCache(slug) {
  if (typeof sessionStorage === 'undefined' || !slug) return null;
  try {
    const raw = sessionStorage.getItem(`${MOVIE_CACHE_PREFIX}${slug}`);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function writeMovieCache(slug, movie) {
  if (typeof sessionStorage === 'undefined' || !slug || !movie) return;
  try {
    sessionStorage.setItem(`${MOVIE_CACHE_PREFIX}${slug}`, JSON.stringify(movie));
  } catch { /* ignore */ }
}

// ── Skeleton ────────────────────────────────────────────────────────────────
function MovieDetailsSkeleton() {
  return (
    <div style={s.page}>
      <div style={s.hero}>
        <div style={{ ...s.skeletonBlock, position: 'absolute', inset: 0 }} />
        <div style={s.heroGradient} />
        <div style={s.heroInner}>
          <div style={{ ...s.skeletonBlock, width: 220, height: 330, borderRadius: 20, flexShrink: 0 }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ ...s.skeletonLine, width: 100, height: 12 }} />
            <div style={{ ...s.skeletonLine, width: '55%', height: 52 }} />
            <div style={{ ...s.skeletonLine, width: '80%', height: 16 }} />
            <div style={{ ...s.skeletonLine, width: '70%', height: 16 }} />
            <div style={{ ...s.skeletonLine, width: '60%', height: 16 }} />
            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              {[150, 180, 52].map((w, i) => (
                <div key={i} style={{ ...s.skeletonLine, width: w, height: 50, borderRadius: 999 }} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────
export default function MovieDetailsPage() {
  const { isMobile, isTablet } = useBreakpoint();
  const { slug } = useParams();
  const { addItem: trackView } = useRecentlyViewed();
  const [movie, setMovie] = useState(() => readMovieCache(slug));
  const [loading, setLoading] = useState(() => !readMovieCache(slug));
  const [error, setError] = useState('');
  const [descExpanded, setDescExpanded] = useState(false);
  const [posterError, setPosterError] = useState(false);
  const [backdropError, setBackdropError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const cachedMovie = readMovieCache(slug);
        if (!cachedMovie) setLoading(true);
        setError('');
        const res = await moviesService.getById(slug);
        if (!cancelled) {
          setMovie(res);
          writeMovieCache(slug, res);
          trackView({ id: res.id, title: res.title, poster: res.poster, type: 'movie', year: res.year, genre: res.genre });
        }
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load movie details.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [slug, trackView]);

  if (loading && !movie) return <MovieDetailsSkeleton />;
  if (error || !movie) {
    return (
      <div style={s.errorState}>
        <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" aria-hidden="true">
          <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <p style={{ color: 'var(--text-muted)', marginTop: 12 }}>{error || 'Movie not found.'}</p>
        <Link to="/browse" style={s.backLink}>← Browse movies</Link>
      </div>
    );
  }

  const genres = Array.isArray(movie.genres) && movie.genres.length
    ? movie.genres
    : String(movie.genre || '').split(',').map((g) => g.trim()).filter(Boolean);

  const runtime = movie.runtime ? `${movie.runtime} min` : null;
  const language = movie.language || movie.originalLanguage;
  const descLong = (movie.description || '').length > 180;

  return (
    <div style={s.page}>
      <div style={{ ...s.auroraOrb, top: '-10%', left: '-10%', background: 'radial-gradient(circle, var(--accent-cyan), transparent 70%)' }} />
      <div style={{ ...s.auroraOrb, bottom: '20%', right: '-10%', background: 'radial-gradient(circle, var(--accent-pink), transparent 70%)' }} />

      {/* ── Hero ── */}
      <section style={s.hero}>
        {/* Backdrop */}
        <div style={s.backdropWrap}>
          <img
            src={backdropError ? posterFallback : (movie.backdrop || movie.poster || posterFallback)}
            alt=""
            style={s.backdropImg}
            onError={() => setBackdropError(true)}
          />
          <div style={s.backdropOverlay} />
          <div style={s.heroGradient} />
        </div>

        {/* Content */}
        <div style={{ ...s.heroInner, ...(isMobile ? s.heroInnerMobile : isTablet ? s.heroInnerTablet : {}) }}>

          {/* Poster */}
          <div style={{ ...s.posterWrap, ...(isMobile ? s.posterWrapMobile : {}) }}>
            <img
              src={posterError ? posterFallback : (movie.poster || posterFallback)}
              alt={movie.title}
              style={s.poster}
              onError={() => setPosterError(true)}
            />
            <div style={s.posterGlow} />
          </div>

          {/* Info */}
          <div style={{ ...s.infoPanel, ...(isMobile ? s.infoPanelMobile : {}) }}>
            <div style={s.eyebrowRow}>
              <span style={s.eyebrow}>Spotlight</span>
              {movie.quality && <span style={s.qualityBadge}>{movie.quality}</span>}
            </div>

            <h1 style={{ ...s.title, ...(isMobile ? s.titleMobile : {}) }}>{movie.title}</h1>

            {movie.originalTitle && movie.originalTitle !== movie.title && (
              <p style={s.originalTitle}>{movie.originalTitle}</p>
            )}

            {/* Meta row */}
            <div style={s.metaRow}>
              <div style={s.ratingBox}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--accent-cyan)"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                <span style={s.ratingVal}>{movie.rating || 'N/A'}</span>
              </div>
              {movie.year && <span style={s.metaChip}>{movie.year}</span>}
              {runtime && <span style={s.metaChip}>{runtime}</span>}
              {language && <span style={s.metaChip}>{language}</span>}
            </div>

            {/* Genres */}
            {genres.length > 0 && (
              <div style={s.genreRow}>
                {genres.map((g) => (
                  <Link key={g} to={`/browse?genre=${g}`} style={s.genreTag}>{g}</Link>
                ))}
              </div>
            )}

            {/* Description */}
            <div style={s.descWrap}>
              <p style={{
                ...s.description,
                ...(isMobile && !descExpanded ? s.descClamped : {}),
              }}>
                {movie.description || 'No description available.'}
              </p>
              {isMobile && descLong && (
                <button style={s.readMore} onClick={() => setDescExpanded((v) => !v)} aria-expanded={descExpanded}>
                  {descExpanded ? 'Show less ↑' : 'Read more ↓'}
                </button>
              )}
            </div>

            {/* Actions */}
            <div style={{ ...s.actions, ...(isMobile ? s.actionsMobile : {}) }}>
              <Link to={`/watch/${movie.id}`} style={{ ...s.playBtn, ...(isMobile ? s.btnFull : {}) }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M8 5v14l11-7z" />
                </svg>
                Watch Now
              </Link>
              <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                <WatchlistButton contentType="movie" contentId={movie.id} title={movie.title} />
                <ShareButton title={movie.title} url={`${window.location.origin}/movies/${movie.id}`} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Details section ── */}
      <div style={s.body}>
        <div style={{ ...s.detailGrid, ...(isMobile ? s.detailGridMobile : {}) }}>

          {/* Stats */}
          <section style={s.card}>
            <h2 style={s.cardTitle}>Details</h2>
            <div style={s.statGrid}>
              {[
                { label: 'Year', value: movie.year },
                { label: 'Runtime', value: runtime || '—' },
                { label: 'Language', value: language || '—' },
                { label: 'Quality', value: movie.quality || 'HD' },
                { label: 'Rating', value: movie.rating ? `${movie.rating} / 10` : '—' },
                { label: 'Genre', value: genres.slice(0, 2).join(', ') || '—' },
              ].map(({ label, value }) => (
                <div key={label} style={s.statItem}>
                  <span style={s.statLabel}>{label}</span>
                  <strong style={s.statValue}>{value}</strong>
                </div>
              ))}
            </div>
          </section>

          {/* Description card — desktop only (mobile shows in hero) */}
          {!isMobile && movie.description && (
            <section style={s.card}>
              <h2 style={s.cardTitle}>Synopsis</h2>
              <p style={s.synopsisText}>{movie.description}</p>
            </section>
          )}
        </div>

        {/* Browse more */}
        <div style={s.browseMore}>
          {genres[0] && (
            <Link to={`/browse?genre=${genres[0]}`} style={s.browseBtn}>
              More {genres[0]} films →
            </Link>
          )}
          {language && (
            <Link to={`/browse?language=${language}`} style={s.browseBtn}>
              More {language} films →
            </Link>
          )}
          <Link to="/browse" style={s.browseBtn}>Browse all →</Link>
        </div>
      </div>
    </div>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
const s = {
  page: { minHeight: '100vh', paddingTop: 88, position: 'relative', overflow: 'hidden' },

  auroraOrb: {
    position: 'absolute',
    width: '60vw',
    height: '60vw',
    borderRadius: '50%',
    filter: 'blur(120px)',
    opacity: 0.1,
    zIndex: 0,
    pointerEvents: 'none',
  },

  // Hero
  hero: {
    position: 'relative',
    minHeight: '75vh',
    display: 'flex',
    alignItems: 'center',
    padding: '40px 0',
  },
  backdropWrap: {
    position: 'absolute',
    inset: 0,
    zIndex: 0,
  },
  backdropImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    objectPosition: 'center 10%',
  },
  backdropOverlay: {
    position: 'absolute',
    inset: 0,
    background: 'linear-gradient(105deg, rgba(5,12,22,0.95) 10%, rgba(5,12,22,0.4) 40%, rgba(5,12,22,0.2) 60%, rgba(5,12,22,0.9) 100%)',
  },
  heroGradient: {
    position: 'absolute',
    inset: 0,
    background: 'linear-gradient(to top, #050c16 0%, transparent 40%)',
  },
  heroInner: {
    position: 'relative',
    zIndex: 2,
    width: 'min(1440px, calc(100vw - 48px))',
    margin: '0 auto',
    display: 'grid',
    gridTemplateColumns: '320px 1fr',
    gap: '60px',
    alignItems: 'center',
  },
  heroInnerTablet: {
    gridTemplateColumns: '260px 1fr',
    gap: '32px',
  },
  heroInnerMobile: {
    gridTemplateColumns: '1fr',
    gap: '24px',
    padding: '20px 16px',
    alignItems: 'start',
  },

  // Poster
  posterWrap: {
    position: 'relative',
    borderRadius: '24px',
    overflow: 'hidden',
    boxShadow: '0 40px 80px rgba(0,0,0,0.8)',
    border: '1px solid rgba(255,255,255,0.12)',
    aspectRatio: '2/3',
  },
  posterGlow: {
    position: 'absolute',
    inset: 0,
    background: 'linear-gradient(135deg, rgba(255,255,255,0.1), transparent 40%)',
    pointerEvents: 'none',
  },
  poster: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  posterWrapMobile: {
    width: '100%',
    maxWidth: '360px',
    margin: '0 auto',
    aspectRatio: '2/3',
  },
  originalTitle: {
    margin: 0,
    color: 'rgba(255,255,255,0.65)',
    fontSize: '0.98rem',
    lineHeight: 1.6,
  },
  metaRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '12px',
    alignItems: 'center',
  },
  genreRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '10px',
    alignItems: 'center',
  },
  skeletonBlock: {
    background: 'rgba(255,255,255,0.08)',
    borderRadius: '24px',
  },
  skeletonLine: {
    background: 'rgba(255,255,255,0.08)',
    borderRadius: '999px',
  },

  // Info
  infoPanel: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  infoPanelMobile: {
    gap: '16px',
  },
  eyebrowRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap',
  },
  eyebrow: {
    color: 'var(--accent-pink)',
    textTransform: 'uppercase',
    letterSpacing: '0.2em',
    fontSize: '0.75rem',
    fontWeight: '900',
  },
  qualityBadge: {
    padding: '6px 12px',
    borderRadius: '999px',
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.12)',
    color: '#ffffff',
    fontSize: '0.78rem',
    fontWeight: '700',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 'clamp(2.8rem, 6vw, 5.2rem)',
    fontWeight: '900',
    color: '#ffffff',
    lineHeight: '0.95',
    letterSpacing: '-0.03em',
    textShadow: '0 10px 30px rgba(0,0,0,0.5)',
  },
  ratingBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: 'rgba(0, 255, 255, 0.1)',
    padding: '6px 12px',
    borderRadius: '8px',
    border: '1px solid rgba(0, 255, 255, 0.3)',
  },
  ratingVal: {
    color: 'var(--accent-cyan)',
    fontWeight: '900',
    fontSize: '1rem',
  },
  metaChip: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '700',
    fontSize: '0.9rem',
    letterSpacing: '0.05em',
  },
  genreTag: {
    padding: '8px 16px',
    borderRadius: '12px',
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    color: '#ffffff',
    fontSize: '0.8rem',
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  playBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    padding: '18px 40px',
    borderRadius: '14px',
    background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-secondary))',
    color: '#050c16',
    fontWeight: '900',
    fontSize: '1.05rem',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    boxShadow: '0 0 30px rgba(0, 255, 255, 0.3)',
    textDecoration: 'none',
  },
  titleMobile: {
    fontSize: 'clamp(2rem, 8vw, 3.2rem)',
  },
  actions: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '18px',
    flexWrap: 'wrap',
  },
  actionsMobile: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  btnFull: {
    width: '100%',
  },
  body: {
    position: 'relative',
    zIndex: 2,
    width: 'min(1440px, calc(100vw - 48px))',
    margin: '0 auto',
    padding: '0 24px 64px',
    display: 'flex',
    flexDirection: 'column',
    gap: '28px',
  },
  detailGrid: {
    display: 'grid',
    gridTemplateColumns: '1.2fr 0.8fr',
    gap: '24px',
  },
  detailGridMobile: {
    gridTemplateColumns: '1fr',
  },
  statGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: '18px',
  },
  statItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    padding: '18px',
    borderRadius: '18px',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
  },
  statLabel: {
    color: 'var(--text-muted)',
    fontSize: '0.72rem',
    textTransform: 'uppercase',
    letterSpacing: '0.14em',
    fontWeight: '700',
  },
  statValue: {
    fontSize: '1.05rem',
    fontWeight: '900',
    color: '#ffffff',
  },
  cardTitle: {
    margin: '0 0 18px 0',
    color: '#ffffff',
    fontSize: '1.15rem',
    fontWeight: '900',
  },
  synopsisText: {
    margin: 0,
    color: 'rgba(255,255,255,0.82)',
    lineHeight: 1.8,
    fontSize: '0.98rem',
  },
  card: {
    padding: '32px',
    borderRadius: '24px',
    background: 'rgba(13, 26, 45, 0.42)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    backdropFilter: 'blur(20px)',
  },
  descWrap: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    maxWidth: '720px',
  },
  description: {
    margin: 0,
    color: 'rgba(255,255,255,0.85)',
    fontSize: '1rem',
    lineHeight: 1.76,
  },
  descClamped: {
    display: '-webkit-box',
    WebkitLineClamp: 4,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  },
  readMore: {
    appearance: 'none',
    border: 'none',
    background: 'none',
    color: 'var(--accent-cyan)',
    cursor: 'pointer',
    fontWeight: '900',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    padding: 0,
  },
  browseMore: {
    display: 'flex',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
    gap: '12px',
  },
  browseBtn: {
    padding: '12px 24px',
    borderRadius: '12px',
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    color: '#ffffff',
    fontSize: '0.85rem',
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    textDecoration: 'none',
  },
  errorState: {
    minHeight: '60vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16px',
    color: '#ffffff',
    textAlign: 'center',
    padding: '40px 16px',
  },
  backLink: {
    marginTop: '12px',
    color: 'var(--accent-cyan)',
    textDecoration: 'none',
    fontWeight: '900',
  },
};
