import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { moviesService } from '../services/moviesService';
import { useBreakpoint } from '../hooks';
import { useRecentlyViewed } from '../hooks';
import WatchlistButton from '../components/ui/WatchlistButton';
import ShareButton from '../components/ui/ShareButton';
import StarRating from '../components/ui/StarRating';
import { DETAIL_STYLES, DETAIL_SKELETON, posterFallbackUrl } from '../styles/detailPage';

const posterFallback = posterFallbackUrl;
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
  const s = DETAIL_SKELETON;
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
  const { isMobile, isTablet, isDesktop } = useBreakpoint();
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
const s = DETAIL_STYLES;
s.qualityBadge = {
  padding: '6px 12px', borderRadius: '8px',
  background: 'rgba(255,255,255,0.08)',
  border: '1px solid rgba(255,255,255,0.12)', color: '#ffffff',
  fontSize: '0.78rem', fontWeight: '700', letterSpacing: '0.08em',
  textTransform: 'uppercase',
};
