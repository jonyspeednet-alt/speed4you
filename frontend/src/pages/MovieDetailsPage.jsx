import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { moviesService } from '../services/moviesService';
import { contentService } from '../services/contentService';
import { useBreakpoint } from '../hooks';
import { useRecentlyViewed } from '../hooks';
import ShareButton from '../components/ui/ShareButton';
import StarRating from '../components/ui/StarRating';
import WatchlistButton from '../components/ui/WatchlistButton';
import VideoPlayerModal from '../components/player/VideoPlayerModal';
import ConfirmDialog from '../components/overlays/ConfirmDialog';
import ContentRail from '../features/home/components/ContentRail';
import { toPlayableSrc } from '../utils/mediaUrl';
import { DETAIL_STYLES, DETAIL_SKELETON, posterFallbackUrl } from '../styles/detailPage';

const posterFallback = posterFallbackUrl;
const MOVIE_CACHE_PREFIX = 'portal-movie-details-v1:';

function formatReleaseDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

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
  const [downloadHovered, setDownloadHovered] = useState(false);
  const [playHovered, setPlayHovered] = useState(false);
  const [playerSrc, setPlayerSrc] = useState(null);
  const [showDownloadConfirm, setShowDownloadConfirm] = useState(false);
  const [related, setRelated] = useState([]);
  const isAdmin = useMemo(() => {
    try { const u = JSON.parse(localStorage.getItem('user') || 'null'); return ['admin', 'super_admin'].includes(u?.role); } catch { return false; }
  }, []);

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

  useEffect(() => {
    if (!movie?.id) return;
    contentService.getRecommendations(movie.id, 10)
      .then(res => setRelated((res?.items || []).filter(i => i.id !== movie.id)))
      .catch(() => {});
  }, [movie?.id]);

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
    <>
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
            loading="lazy"
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
              loading="lazy"
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
              {(movie.releasedAt || movie.year) && <span style={s.metaChip}>{formatReleaseDate(movie.releasedAt) || movie.year}</span>}
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
            {(() => {
              const apiBase = (import.meta.env.VITE_API_URL || '/portal-api').replace(/\/$/, '');
              const videoUrl = movie.videoUrl;
              const downloadUrl = `${apiBase}/api/player/download/movie/${movie.id}`;
              const btnBase = {
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                padding: '18px 40px',
                borderRadius: '14px',
                fontWeight: '900',
                fontSize: '1.05rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                textDecoration: 'none',
                cursor: 'pointer',
                transition: 'all 180ms ease',
              };
              const getPlayBtnStyle = (h) => ({
                ...btnBase,
                background: h ? 'rgba(0, 255, 255, 0.12)' : 'rgba(0, 200, 255, 0.08)',
                border: h ? '1px solid var(--accent-cyan)' : '1px solid rgba(0, 200, 255, 0.25)',
                color: h ? 'var(--accent-cyan)' : '#ffffff',
                boxShadow: h ? '0 0 20px rgba(0, 255, 255, 0.15)' : 'none',
              });
              const getDlBtnStyle = (h) => ({
                ...btnBase,
                background: h ? 'rgba(0, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.05)',
                border: h ? '1px solid var(--accent-cyan)' : '1px solid rgba(255, 255, 255, 0.12)',
                color: h ? 'var(--accent-cyan)' : '#ffffff',
                boxShadow: h ? '0 0 20px rgba(0, 255, 255, 0.15)' : 'none',
              });

              return (
                <div style={{ ...s.actions, ...(isMobile ? s.actionsMobile : {}) }}>
                  <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', width: isMobile ? '100%' : 'auto', alignItems: 'center' }}>
                    {videoUrl && (() => {
                      return (
                        <button
                          onClick={() => setPlayerSrc(toPlayableSrc(videoUrl))}
                          style={{ ...getPlayBtnStyle(playHovered), ...(isMobile ? s.btnFull : {}), border:'none', fontFamily:'inherit' }}
                          onMouseEnter={() => setPlayHovered(true)}
                          onMouseLeave={() => setPlayHovered(false)}
                        >
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden="true">
                            <polygon points="8,5 19,12 8,19" />
                          </svg>
                          Play Movie
                        </button>
                      );
                    })()}
                    <button
                      onClick={() => setShowDownloadConfirm(true)}
                      style={{ ...getDlBtnStyle(downloadHovered), ...(isMobile ? s.btnFull : {}), border:'none', fontFamily:'inherit', fontSize:'1.05rem' }}
                      onMouseEnter={() => setDownloadHovered(true)}
                      onMouseLeave={() => setDownloadHovered(false)}
                    >
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                      Download
                    </button>
                  </div>
                  <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'center', ...(isMobile ? { width: '100%', justifyContent: 'flex-start' } : {}) }}>
                    <WatchlistButton contentType="movie" contentId={movie.id} title={movie.title} />
                    <ShareButton title={movie.title} url={`${window.location.origin}/movies/${movie.id}`} />
                    {isAdmin && (
                      <Link to={`/admin/content/${movie.id}/edit`} style={{
                        display: 'inline-flex', alignItems: 'center', gap: '8px',
                        padding: '10px 20px', borderRadius: '10px',
                        background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.12)',
                        color: '#fff', fontWeight: '700', fontSize: '0.85rem',
                        textDecoration: 'none', transition: 'all 180ms ease',
                      }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(0, 255, 255, 0.12)'; e.currentTarget.style.borderColor = 'var(--accent-cyan)'; e.currentTarget.style.color = 'var(--accent-cyan)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'; e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)'; e.currentTarget.style.color = '#fff'; }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /></svg>
                        Edit
                      </Link>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </section>

      {/* ── Details section ── */}
      <div style={s.body}>
        <div style={{ ...s.detailGrid, ...(isMobile ? s.detailGridMobile : {}) }}>

          {/* Stats */}
          <section style={s.card}>
            <h2 style={s.cardTitle}>Details</h2>
            <div style={{ ...s.statGrid, ...(isMobile ? s.statGridMobile : {}) }}>
              {[
                { label: 'Released', value: formatReleaseDate(movie.releasedAt) || movie.year || '—' },
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

        {/* Similar content mini poster row */}
        {related.length >= 3 && (
          <div style={s.similarSection}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ color: '#ffffff', fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>More Like This</h3>
              <Link to={`/browse?genre=${genres[0] || ''}`} style={s.viewAllLink}>View All →</Link>
            </div>
            <div style={s.similarRow}>
              {related.slice(0, 6).map((item) => (
                <Link key={item.id} to={`/movies/${item.id}`} style={s.similarCard}>
                  <div style={s.similarPosterWrap}>
                    <img
                      src={item.poster || posterFallback}
                      alt={item.title}
                      style={s.similarPoster}
                      loading="lazy"
                    />
                  </div>
                  <p style={s.similarTitle}>{item.title}</p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
      {playerSrc && (
        <VideoPlayerModal src={playerSrc} title={movie?.title || ''} onClose={() => setPlayerSrc(null)} />
      )}
      <ConfirmDialog
        isOpen={showDownloadConfirm}
        onClose={() => setShowDownloadConfirm(false)}
        onConfirm={() => { window.location.href = `${(import.meta.env.VITE_API_URL || '/portal-api').replace(/\/$/, '')}/api/player/download/movie/${movie.id}`; setShowDownloadConfirm(false); }}
        title="Download Movie"
        message={`Download "${movie?.title}"? This may use significant data.`}
        confirmText="Download"
        cancelText="Cancel"
      />
      {related.length >= 6 && (
        <ContentRail
          title="You May Also Like"
          subtitle="Similar picks"
          items={related.slice(6)}
          viewAllLink={`/browse?genre=${genres[0] || ''}`}
        />
      )}
    </>
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
s.similarSection = {
  marginTop: '32px',
};
s.viewAllLink = {
  color: 'var(--accent-cyan, #7df9ff)',
  fontSize: '0.85rem',
  fontWeight: '700',
  textDecoration: 'none',
  transition: 'opacity 150ms ease',
  letterSpacing: '0.02em',
};
s.similarRow = {
  display: 'flex',
  gap: '14px',
  overflowX: 'auto',
  paddingBottom: '8px',
  scrollbarWidth: 'thin',
};
s.similarCard = {
  flex: '0 0 auto',
  width: '150px',
  textDecoration: 'none',
  transition: 'transform 180ms ease',
};
s.similarPosterWrap = {
  width: '150px',
  height: '215px',
  borderRadius: '12px',
  overflow: 'hidden',
  background: 'rgba(255,255,255,0.04)',
};
s.similarPoster = {
  width: '100%',
  height: '100%',
  objectFit: 'cover',
  display: 'block',
};
s.similarTitle = {
  color: '#c8d0da',
  fontSize: '0.8rem',
  fontWeight: 600,
  marginTop: '8px',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};
