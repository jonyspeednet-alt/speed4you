import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { moviesService } from '../services/moviesService';
import { useBreakpoint } from '../hooks';
import { useRecentlyViewed } from '../hooks';
import ShareButton from '../components/ui/ShareButton';
import WatchlistButton from '../components/ui/WatchlistButton';
import VideoPlayerModal from '../components/player/VideoPlayerModal';
import ConfirmDialog from '../components/overlays/ConfirmDialog';
import PlaybackHelpCard from '../components/ui/PlaybackHelpCard';
import { toPlayableSrc } from '../utils/mediaUrl';
import { triggerDownload } from '../utils/download';
import { DETAIL_STYLES, posterFallbackUrl } from '../styles/detailPage';

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
  return <div className="catalog-message" role="status">Loading details…</div>;
}

// ── Main component ───────────────────────────────────────────────────────────
export default function MovieDetailsPage({ adminPreview, contentData }) {
  const { isMobile, isTablet } = useBreakpoint();
  const { slug } = useParams();
  const { addItem: trackView } = useRecentlyViewed();
  const [movie, setMovie] = useState(() => adminPreview ? contentData : readMovieCache(slug));
  const [loading, setLoading] = useState(() => !adminPreview && !readMovieCache(slug));
  const [error, setError] = useState('');
  const [descExpanded, setDescExpanded] = useState(false);
  const [posterError, setPosterError] = useState(false);
  const [downloadHovered, setDownloadHovered] = useState(false);
  const [playHovered, setPlayHovered] = useState(false);
  const [playerSrc, setPlayerSrc] = useState(null);
  const [showDownloadConfirm, setShowDownloadConfirm] = useState(false);
  const isAdmin = useMemo(() => {
    try { const u = JSON.parse(localStorage.getItem('user') || 'null'); return ['admin', 'super_admin'].includes(u?.role); } catch { return false; }
  }, []);

  useEffect(() => {
    // If admin preview with content data, skip API call
    if (adminPreview && contentData) {
      setMovie(contentData);
      setLoading(false);
      return;
    }

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
  }, [slug, trackView, adminPreview, contentData]);


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
    <div style={s.page} className="simple-details">

      {/* ── Hero ── */}
      <section style={s.hero} className="detail-hero">
        {/* Backdrop */}

        {/* Content */}
        <div className="simple-detail-inner" style={{ ...s.heroInner, ...(isMobile ? s.heroInnerMobile : isTablet ? s.heroInnerTablet : {}) }}>

          {/* Poster */}
          <div style={{ ...s.posterWrap, ...(isMobile ? s.posterWrapMobile : {}) }}>
            <img
              src={posterError ? posterFallback : (movie.poster || posterFallback)}
              alt={movie.title}
              style={s.poster}
              loading="lazy"
              onError={() => setPosterError(true)}
            />

          </div>

          {/* Info */}
          <div style={{ ...s.infoPanel, ...(isMobile ? s.infoPanelMobile : {}) }}>
            <div style={s.eyebrowRow}>
              <span style={s.eyebrow}>Spotlight</span>
              {movie.quality && <span style={s.qualityBadge}>{movie.quality}</span>}
              {isAdmin && movie.status === 'draft' && (
                <span style={s.draftBadge}>Draft</span>
              )}
            </div>

            <h1 style={{ ...s.title, ...(isMobile ? s.titleMobile : {}) }}>{movie.title}</h1>

            {movie.originalTitle && movie.originalTitle !== movie.title && (
              <p style={s.originalTitle}>{movie.originalTitle}</p>
            )}

            {/* Meta row */}
            <div style={s.metaRow}>
              <div style={s.ratingBox}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--accent-secondary)"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
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
              const videoUrl = movie.videoUrl;
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
                border: h ? '1px solid var(--accent-secondary)' : '1px solid rgba(0, 200, 255, 0.25)',
                color: h ? 'var(--accent-secondary)' : '#ffffff',
                boxShadow: h ? '0 0 20px rgba(0, 255, 255, 0.15)' : 'none',
              });
              const getDlBtnStyle = (h) => ({
                ...btnBase,
                background: h ? 'rgba(0, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.05)',
                border: h ? '1px solid var(--accent-secondary)' : '1px solid rgba(255, 255, 255, 0.12)',
                color: h ? 'var(--accent-secondary)' : '#ffffff',
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
                    {!adminPreview && <WatchlistButton contentType="movie" contentId={movie.id} title={movie.title} />}
                    {!adminPreview && <ShareButton title={movie.title} url={`${window.location.origin}/movies/${movie.id}`} />}
                    {isAdmin && movie.status === 'draft' && (
                      <button
                        onClick={async () => {
                          try {
                            const { adminService } = await import('../services/adminService');
                            await adminService.publishContent(movie.id);
                            window.location.reload();
                          } catch (err) {
                            alert(`Publish failed: ${err.message}`);
                          }
                        }}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: '8px',
                          padding: '10px 20px', borderRadius: '10px',
                          background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.35)',
                          color: '#4ade80', fontWeight: '700', fontSize: '0.85rem',
                          textDecoration: 'none', transition: 'all 180ms ease', cursor: 'pointer',
                        }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4Z"/></svg>
                        Publish
                      </button>
                    )}
                    {isAdmin && (
                      <Link to={`/admin/content/${movie.id}/edit`} style={{
                        display: 'inline-flex', alignItems: 'center', gap: '8px',
                        padding: '10px 20px', borderRadius: '10px',
                        background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.12)',
                        color: '#fff', fontWeight: '700', fontSize: '0.85rem',
                        textDecoration: 'none', transition: 'all 180ms ease',
                      }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(0, 255, 255, 0.12)'; e.currentTarget.style.borderColor = 'var(--accent-secondary)'; e.currentTarget.style.color = 'var(--accent-secondary)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'; e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)'; e.currentTarget.style.color = '#fff'; }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /></svg>
                        Edit
                      </Link>
                    )}
                  </div>
                  <PlaybackHelpCard style={{ marginTop: '20px' }} />
                </div>
              );
            })()}
          </div>
        </div>
      </section>

    </div>
      {playerSrc && (
        <VideoPlayerModal src={playerSrc} title={movie?.title || ''} onClose={() => setPlayerSrc(null)} contentType="movie" contentId={movie?.id} />
      )}
      <ConfirmDialog
        isOpen={showDownloadConfirm}
        onClose={() => setShowDownloadConfirm(false)}
        onConfirm={() => { triggerDownload(`${(import.meta.env.VITE_API_URL || '/portal-api').replace(/\/$/, '')}/api/player/download/movie/${movie.id}`); setShowDownloadConfirm(false); }}
        title="Download Movie"
        message={`Download "${movie?.title}"? This may use significant data.`}
        confirmText="Download"
        cancelText="Cancel"
      />

    </>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
const s = { ...DETAIL_STYLES };
s.qualityBadge = {
  padding: '6px 12px', borderRadius: '8px',
  background: 'rgba(255,255,255,0.08)',
  border: '1px solid rgba(255,255,255,0.12)', color: '#ffffff',
  fontSize: '0.78rem', fontWeight: '700', letterSpacing: '0.08em',
  textTransform: 'uppercase',
};
s.draftBadge = {
  padding: '6px 12px', borderRadius: '8px',
  background: 'rgba(234,179,8,0.15)',
  border: '1px solid rgba(234,179,8,0.35)', color: '#facc15',
  fontSize: '0.78rem', fontWeight: '700', letterSpacing: '0.08em',
  textTransform: 'uppercase',
};
