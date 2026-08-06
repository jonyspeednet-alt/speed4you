import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { seriesService } from '../services/seriesService';
import { contentService } from '../services/contentService';
import { useBreakpoint } from '../hooks';
import { useRecentlyViewed } from '../hooks';
import ShareButton from '../components/ui/ShareButton';
import WatchlistButton from '../components/ui/WatchlistButton';
import VideoPlayerModal from '../components/player/VideoPlayerModal';
import ConfirmDialog from '../components/overlays/ConfirmDialog';
import ContentRail from '../features/home/components/ContentRail';
import { toPlayableSrc } from '../utils/mediaUrl';
import { triggerDownload } from '../utils/download';
import { DETAIL_STYLES, DETAIL_SKELETON, posterFallbackUrl } from '../styles/detailPage';

const posterFallback = posterFallbackUrl;
const SERIES_CACHE_PREFIX = 'portal-series-details-v1:';

function formatReleaseDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function toPositiveInt(value, fallback) {
  const n = Number(value);
  if (Number.isFinite(n) && n > 0) return Math.floor(n);
  const m = String(value || '').match(/(\d+)/);
  if (m) { const p = Number(m[1]); if (Number.isFinite(p) && p > 0) return Math.floor(p); }
  return fallback;
}

function readCache(slug) {
  if (typeof sessionStorage === 'undefined' || !slug) return null;
  try { const r = sessionStorage.getItem(`${SERIES_CACHE_PREFIX}${slug}`); return r ? JSON.parse(r) : null; }
  catch { return null; }
}

function writeCache(slug, data) {
  if (typeof sessionStorage === 'undefined' || !slug || !data) return;
  try { sessionStorage.setItem(`${SERIES_CACHE_PREFIX}${slug}`, JSON.stringify(data)); } catch { /* ignore */ }
}

// ── Skeleton ─────────────────────────────────────────────────────────────────
function SeriesDetailsSkeleton() {
  const sk = DETAIL_SKELETON;
  return (
    <div style={sk.page}>
      <div style={sk.hero}>
        <div style={{ ...sk.skeletonBlock, position: 'absolute', inset: 0 }} />
        <div style={sk.heroGradient} />
        <div style={sk.heroInner}>
          <div style={{ ...sk.skeletonBlock, width: 220, height: 330, borderRadius: 20, flexShrink: 0 }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ ...sk.skeletonLine, width: 100, height: 12 }} />
            <div style={{ ...sk.skeletonLine, width: '55%', height: 52 }} />
            <div style={{ ...sk.skeletonLine, width: '80%', height: 16 }} />
            <div style={{ ...sk.skeletonLine, width: '70%', height: 16 }} />
            <div style={{ ...sk.skeletonLine, width: '60%', height: 16 }} />
            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              {[150, 52].map((w, i) => (
                <div key={i} style={{ ...sk.skeletonLine, width: w, height: 50, borderRadius: 999 }} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Episode card ──────────────────────────────────────────────────────────────
function EpisodeCard({ episode, index, seriesId, seasonParam, episodeParam, isMobile }) {
  const [hovered, setHovered] = useState(false);
  const [downloadHovered, setDownloadHovered] = useState(false);
  const [playHovered, setPlayHovered] = useState(false);
  const [playerSrc, setPlayerSrc] = useState(null);
  const [showDownloadConfirm, setShowDownloadConfirm] = useState(false);

  const apiBase = (import.meta.env.VITE_API_URL || '/portal-api').replace(/\/$/, '');
  const downloadUrl = `${apiBase}/api/player/download/series/${seriesId}?season=${seasonParam}&episode=${episodeParam}`;

  const downloadBtnStyle = {
    width: '44px',
    height: '44px',
    borderRadius: '14px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    display: 'grid',
    placeItems: 'center',
    color: downloadHovered ? 'var(--accent-cyan)' : 'rgba(255, 255, 255, 0.7)',
    background: downloadHovered ? 'rgba(0, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.04)',
    borderColor: downloadHovered ? 'var(--accent-cyan)' : 'rgba(255, 255, 255, 0.1)',
    boxShadow: downloadHovered ? '0 0 12px rgba(0, 255, 255, 0.25)' : 'none',
    transition: 'all 180ms ease',
    cursor: 'pointer',
    flexShrink: 0,
  };

  return (
    <>
    <div
      style={{
        ...s.episodeCard,
        ...(isMobile ? s.episodeCardMobile : {}),
        ...(hovered ? s.episodeCardHover : {}),
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Episode number badge */}
      <div style={{ ...s.epNumBadge, ...(isMobile ? s.epNumBadgeMobile : {}) }}>
        <span style={s.epNum}>{episodeParam}</span>
      </div>

      {/* Info */}
      <div style={s.epInfo}>
        <div style={s.epTitleRow}>
          <h4 style={s.epTitle}>{episode.title || `Episode ${index + 1}`}</h4>
          {episode.duration && <span style={s.epDuration}>{episode.duration}</span>}
        </div>
        {episode.description && (
          <p style={s.epDesc}>{episode.description}</p>
        )}
      </div>

      {/* Action buttons */}
      <div style={{ ...s.epActions, ...(isMobile ? s.epActionsMobile : {}) }} onClick={(e) => e.stopPropagation()}>
        {/* Play button */}
        {episode.videoUrl && (() => {
          return (
            <button
              onClick={() => setPlayerSrc(toPlayableSrc(episode.videoUrl))}
              style={{
                ...downloadBtnStyle,
                background: playHovered ? 'rgba(0, 255, 255, 0.12)' : 'rgba(0, 200, 255, 0.08)',
                borderColor: playHovered ? 'var(--accent-cyan)' : 'rgba(0, 200, 255, 0.25)',
              }}
              onMouseEnter={() => setPlayHovered(true)}
              onMouseLeave={() => setPlayHovered(false)}
              title="Play Episode"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden="true">
                <polygon points="8,5 19,12 8,19" />
              </svg>
            </button>
          );
        })()}
        {/* Download button */}
        <button
          onClick={() => setShowDownloadConfirm(true)}
          style={{ ...downloadBtnStyle, border:'none', cursor:'pointer' }}
          onMouseEnter={() => setDownloadHovered(true)}
          onMouseLeave={() => setDownloadHovered(false)}
          title="Download Episode"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        </button>

      </div>
    </div>
      {playerSrc && (
        <VideoPlayerModal src={playerSrc} title={episode.name || `Episode ${episode.episode_number || index + 1}`} onClose={() => setPlayerSrc(null)} />
      )}
      <ConfirmDialog
        isOpen={showDownloadConfirm}
        onClose={() => setShowDownloadConfirm(false)}
        onConfirm={() => { triggerDownload(downloadUrl); setShowDownloadConfirm(false); }}
        title="Download Episode"
        message={`Download Episode ${episodeParam}${episode.title ? ` — ${episode.title}` : ''}?`}
        confirmText="Download"
        cancelText="Cancel"
      />
    </>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function SeriesDetailsPage({ adminPreview, contentData }) {
  const { isMobile, isTablet } = useBreakpoint();
  const { slug } = useParams();
  const { addItem: trackView } = useRecentlyViewed();
  const [series, setSeries] = useState(() => adminPreview ? contentData : readCache(slug));
  const [loading, setLoading] = useState(() => !adminPreview && !readCache(slug));
  const [error, setError] = useState('');
  const [activeSeason, setActiveSeason] = useState(0);
  const [descExpanded, setDescExpanded] = useState(false);
  const [posterError, setPosterError] = useState(false);
  const [backdropError, setBackdropError] = useState(false);
  const [related, setRelated] = useState([]);
  const activeTabRef = useRef(null);
  const seasonTabsRef = useRef(null);
  const isAdmin = useMemo(() => {
    try { const u = JSON.parse(localStorage.getItem('user') || 'null'); return ['admin', 'super_admin'].includes(u?.role); } catch { return false; }
  }, []);

  useEffect(() => {
    // If admin preview with content data, skip API call
    if (adminPreview && contentData) {
      setSeries(contentData);
      setActiveSeason(0);
      setLoading(false);
      return;
    }

    let cancelled = false;
    async function load() {
      try {
        const cached = readCache(slug);
        if (!cached) setLoading(true);
        setError('');
        const res = await seriesService.getById(slug);
        if (!cancelled) {
          setSeries(res);
          setActiveSeason(0);
          writeCache(slug, res);
          trackView({ id: res.id, title: res.title, poster: res.poster, type: 'series', year: res.year, genre: res.genre });
        }
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load series details.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [slug, trackView, adminPreview, contentData]);

  useEffect(() => {
    if (!series?.id) return;
    contentService.getRecommendations(series.id, 10)
      .then(res => setRelated((res?.items || []).filter(i => i.id !== series.id)))
      .catch(() => {});
  }, [series?.id]);

  // Scroll active season tab into view
  useEffect(() => {
    if (activeTabRef.current && seasonTabsRef.current) {
      activeTabRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [activeSeason]);

  if (loading && !series) return <SeriesDetailsSkeleton />;
  if (error || !series) {
    return (
      <div style={s.errorState}>
        <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" aria-hidden="true">
          <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <p style={{ color: 'var(--text-muted)', marginTop: 12 }}>{error || 'Series not found.'}</p>
        <Link to="/series" style={s.backLink}>← Browse series</Link>
      </div>
    );
  }

  const seasons = Array.isArray(series.seasons) ? series.seasons : [];
  const currentSeason = seasons[activeSeason] || null;
  const firstSeason = seasons[0] || null;
  const firstEpisode = firstSeason?.episodes?.[0] || null;
  const lastSeason = seasons[seasons.length - 1] || firstSeason;
  const lastEpisode = lastSeason?.episodes?.[lastSeason?.episodes?.length - 1] || firstEpisode;
  const firstSeasonNum = toPositiveInt(firstSeason?.number ?? firstSeason?.id, 1);
  const firstEpNum = toPositiveInt(firstEpisode?.number ?? firstEpisode?.id, 1);
  const lastSeasonNum = toPositiveInt(lastSeason?.number ?? lastSeason?.id, seasons.length || 1);
  const lastEpNum = toPositiveInt(lastEpisode?.number ?? lastEpisode?.id, 1);
  const showContinueLatest = lastEpisode && (lastSeasonNum !== firstSeasonNum || lastEpNum !== firstEpNum);
  const genres = Array.isArray(series.genres) && series.genres.length
    ? series.genres
    : String(series.genre || '').split(',').map((g) => g.trim()).filter(Boolean);
  const totalEpisodes = seasons.reduce((acc, s) => acc + (s.episodes?.length || 0), 0);
  const descLong = (series.description || '').length > 180;

  return (
    <div style={s.page}>
      <div style={{ ...s.auroraOrb, top: '-5%', left: '-10%', background: 'radial-gradient(circle, var(--accent-cyan), transparent 70%)' }} />
      <div style={{ ...s.auroraOrb, bottom: '30%', right: '-10%', background: 'radial-gradient(circle, var(--accent-pink), transparent 70%)' }} />

      {/* ── Hero ── */}
      <section style={s.hero}>
        <div style={s.backdropWrap}>
          <img
            src={backdropError ? posterFallback : (series.backdrop || series.poster || posterFallback)}
            alt=""
            style={s.backdropImg}
            loading="lazy"
            onError={() => setBackdropError(true)}
          />
          <div style={s.backdropOverlay} />
          <div style={s.heroGradient} />
        </div>

        <div style={{ ...s.heroInner, ...(isMobile ? s.heroInnerMobile : isTablet ? s.heroInnerTablet : {}) }}>

          {/* Poster */}
          <div style={{ ...s.posterWrap, ...(isMobile ? s.posterWrapMobile : {}) }}>
            <img
              src={posterError ? posterFallback : (series.poster || posterFallback)}
              alt={series.title}
              style={s.poster}
              loading="lazy"
              onError={() => setPosterError(true)}
            />
            <div style={s.posterGlow} />
          </div>

          {/* Info */}
          <div style={{ ...s.infoPanel, ...(isMobile ? s.infoPanelMobile : {}) }}>
            <div style={s.eyebrowRow}>
              <span style={s.eyebrow}>Original Series</span>
              <span style={s.seasonsBadge}>{seasons.length} Season{seasons.length !== 1 ? 's' : ''}</span>
              {isAdmin && series.status === 'draft' && (
                <span style={s.draftBadge}>Draft</span>
              )}
            </div>

            <h1 style={{ ...s.title, ...(isMobile ? s.titleMobile : {}) }}>{series.title}</h1>

            {/* Meta */}
            <div style={s.metaRow}>
              <div style={s.ratingBox}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--accent-cyan)"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                <span style={s.ratingVal}>{series.rating || 'N/A'}</span>
              </div>
              {(series.releasedAt || series.year) && <span style={s.metaChip}>{formatReleaseDate(series.releasedAt) || series.year}</span>}
              {totalEpisodes > 0 && <span style={s.metaChip}>{totalEpisodes} Episodes</span>}
              {(series.language || series.originalLanguage) && (
                <span style={s.metaChip}>{series.language || series.originalLanguage}</span>
              )}
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
                {series.description || 'No description available.'}
              </p>
              {isMobile && descLong && (
                <button style={s.readMore} onClick={() => setDescExpanded((v) => !v)} aria-expanded={descExpanded}>
                  {descExpanded ? 'Show less ↑' : 'Read more ↓'}
                </button>
              )}
            </div>

            {/* Actions */}
            <div style={{ ...s.actions, ...(isMobile ? s.actionsMobile : {}) }}>
              <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
                <WatchlistButton contentType="series" contentId={series.id} title={series.title} />
                <ShareButton title={series.title} url={`${window.location.origin}/series/${series.id}`} />
                {isAdmin && series.status === 'draft' && (
                  <button
                    onClick={async () => {
                      try {
                        const { adminService } = await import('../services/adminService');
                        await adminService.publishContent(series.id);
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
                  <Link to={`/admin/content/${series.id}/edit`} style={{
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
          </div>
        </div>
      </section>

      {/* ── Season & Episodes ── */}
      <div style={s.body}>

        {/* Overview */}
        <div style={{ ...s.detailTopGrid, ...(isMobile ? s.detailTopGridMobile : {}) }}>
          <section style={s.card}>
            <h2 style={s.cardTitle}>Series details</h2>
            <div style={{ ...s.statGrid, ...(isMobile ? s.statGridMobile : {}) }}>
              {[
                { label: 'Released', value: formatReleaseDate(series.releasedAt) || series.year || '—' },
                { label: 'Seasons', value: seasons.length || '—' },
                { label: 'Episodes', value: totalEpisodes || '—' },
                { label: 'Language', value: series.language || series.originalLanguage || '—' },
                { label: 'Rating', value: series.rating ? `${series.rating} / 10` : '—' },
                { label: 'Genre', value: genres.slice(0, 2).join(', ') || '—' },
              ].map(({ label, value }) => (
                <div key={label} style={s.statItem}>
                  <span style={s.statLabel}>{label}</span>
                  <strong style={s.statValue}>{value}</strong>
                </div>
              ))}
            </div>
          </section>

          {series.description && (
            <section style={s.card}>
              <h2 style={s.cardTitle}>Synopsis</h2>
              <p style={s.synopsisText}>{series.description}</p>
            </section>
          )}
        </div>

        {/* Season tabs */}
        {seasons.length > 1 && (
          <div style={{ ...s.seasonTabsWrap, ...(isMobile ? s.seasonTabsWrapMobile : {}) }} ref={seasonTabsRef}>
            <div style={s.seasonTabs}>
              {seasons.map((season, idx) => {
                const active = activeSeason === idx;
                const label = season.title || `Season ${toPositiveInt(season.number ?? season.id, idx + 1)}`;
                const epCount = season.episodes?.length || 0;
                return (
                  <button
                    key={season.id || idx}
                    ref={active ? activeTabRef : null}
                    style={{ ...s.seasonTab, ...(active ? s.seasonTabActive : {}) }}
                    onClick={() => setActiveSeason(idx)}
                    aria-pressed={active}
                  >
                    <span style={s.seasonTabLabel}>{label}</span>
                    {epCount > 0 && (
                      <span style={{ ...s.seasonTabCount, ...(active ? s.seasonTabCountActive : {}) }}>
                        {epCount} ep
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Episode list */}
        {currentSeason ? (
          <section style={s.episodeSection}>
            <div style={s.episodeSectionHeader}>
              <div>
                <h2 style={s.episodeSectionTitle}>
                  {currentSeason.title || `Season ${toPositiveInt(currentSeason.number ?? currentSeason.id, activeSeason + 1)}`}
                </h2>
                <p style={s.episodeSectionMeta}>
                  {(currentSeason.episodes || []).length} episodes
                  {currentSeason.year ? ` · ${currentSeason.year}` : ''}
                </p>
              </div>
            </div>

            <div style={{ ...s.episodeList, ...(isMobile ? s.episodeListMobile : {}) }}>
              {(currentSeason.episodes || []).length === 0 ? (
                <div style={s.emptyEpisodes}>No episodes available for this season.</div>
              ) : (
                (currentSeason.episodes || []).map((episode, idx) => {
                  const seasonParam = toPositiveInt(currentSeason.number ?? currentSeason.id, activeSeason + 1);
                  const episodeParam = toPositiveInt(episode?.number ?? episode?.id, idx + 1);
                  return (
                    <EpisodeCard
                      key={episode.id || `${currentSeason.id || activeSeason}-${idx}`}
                      episode={episode}
                      index={idx}
                      seriesId={series.id}
                      seasonParam={seasonParam}
                      episodeParam={episodeParam}
                      isMobile={isMobile}
                    />
                  );
                })
              )}
            </div>
          </section>
        ) : (
          <div style={s.emptyEpisodes}>No episodes available yet.</div>
        )}

        {/* Browse more */}
        <div style={s.browseMore}>
          {genres[0] && (
            <Link to={`/browse?genre=${genres[0]}`} style={s.browseBtn}>More {genres[0]} →</Link>
          )}
          <Link to="/series" style={s.browseBtn}>Browse all series →</Link>
        </div>
      </div>

      {related.length >= 3 && (
        <ContentRail
          title="You May Also Like"
          subtitle="Similar series"
          items={related}
          type="series"
          viewAllLink={`/browse?genre=${genres[0] || ''}&type=series`}
        />
      )}
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = DETAIL_STYLES;
s.seasonsBadge = {
  padding: '6px 12px', borderRadius: '8px',
  background: 'rgba(0, 255, 255, 0.1)',
  border: '1px solid rgba(0, 255, 255, 0.3)',
  color: 'var(--accent-cyan)', fontSize: '0.78rem',
  fontWeight: '900', letterSpacing: '0.05em',
};
s.draftBadge = {
  padding: '6px 12px', borderRadius: '8px',
  background: 'rgba(234,179,8,0.15)',
  border: '1px solid rgba(234,179,8,0.35)', color: '#facc15',
  fontSize: '0.78rem', fontWeight: '700', letterSpacing: '0.08em',
  textTransform: 'uppercase',
};
s.primaryActions = { display: 'flex', flexWrap: 'wrap', gap: '14px', alignItems: 'center' };
s.secondaryBtn = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  padding: '16px 30px', borderRadius: '14px',
  background: 'rgba(255,255,255,0.08)',
  border: '1px solid rgba(255,255,255,0.12)', color: '#ffffff',
  fontWeight: '800', fontSize: '0.95rem', textTransform: 'uppercase',
  letterSpacing: '0.05em', textDecoration: 'none', cursor: 'pointer',
  transition: 'background 180ms ease, transform 180ms ease',
};
s.seasonTabsWrap = {
  position: 'sticky', top: 96, zIndex: 3,
  background: 'rgba(5,12,22,0.92)', backdropFilter: 'blur(18px)',
  border: '1px solid rgba(255,255,255,0.08)', borderRadius: '22px',
  padding: '10px 12px', marginBottom: '24px', overflowX: 'auto',
};
s.seasonTabsWrapMobile = {
  position: 'static', background: 'transparent', border: 'none',
  padding: '0', marginBottom: '16px',
};
s.seasonTabs = { display: 'flex', gap: '12px', alignItems: 'center' };
s.seasonTab = {
  display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-start',
  minWidth: '130px', padding: '14px 18px', borderRadius: '16px',
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  color: 'rgba(255,255,255,0.82)', cursor: 'pointer',
  transition: 'transform 180ms ease, border-color 180ms ease, background 180ms ease',
  textAlign: 'left',
};
s.seasonTabActive = {
  background: 'rgba(0, 255, 255, 0.16)', borderColor: 'var(--accent-cyan)',
  color: '#ffffff', transform: 'translateY(-1px)',
  boxShadow: '0 18px 40px rgba(0, 255, 255, 0.12)',
};
s.seasonTabLabel = { fontSize: '0.95rem', fontWeight: '800', letterSpacing: '0.02em' };
s.seasonTabCount = { marginTop: '6px', fontSize: '0.8rem', color: 'rgba(255,255,255,0.65)' };
s.seasonTabCountActive = { color: 'var(--accent-cyan)' };
s.episodeSection = { display: 'flex', flexDirection: 'column', gap: '18px' };
s.episodeSectionHeader = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '18px', flexWrap: 'wrap' };
s.episodeSectionTitle = { margin: 0, fontSize: 'clamp(1.8rem, 3vw, 2.5rem)', fontWeight: '900', letterSpacing: '-0.04em' };
s.episodeSectionMeta = { margin: 0, color: 'var(--text-muted)', fontSize: '0.95rem' };
s.episodeList = { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '18px' };
s.episodeListMobile = { gridTemplateColumns: '1fr' };
s.emptyEpisodes = { padding: '32px', borderRadius: '18px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-muted)', textAlign: 'center' };
s.episodeCard = {
  display: 'flex', alignItems: 'center', gap: '16px', padding: '18px',
  borderRadius: '22px', background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)', color: '#ffffff',
  textDecoration: 'none',
  transition: 'transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease',
};
s.episodeCardMobile = { flexDirection: 'row' };
s.epActions = { display: 'flex', gap: '10px', alignItems: 'center', flexShrink: 0 };
s.epActionsMobile = { gap: '8px' };
s.epNumBadge = {
  width: '54px', minWidth: '54px', height: '54px', borderRadius: '18px',
  background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
  color: '#ffffff', display: 'grid', placeItems: 'center', fontWeight: '900',
  fontSize: '0.95rem',
};
s.epNumBadgeMobile = { width: '44px', height: '44px', borderRadius: '14px' };
s.epNum = { fontSize: '0.95rem', fontWeight: '900' };
s.epInfo = { flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' };
s.epTitleRow = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' };
s.epTitle = { margin: 0, fontSize: '1rem', fontWeight: '900' };
s.epDuration = { color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: '700' };
s.epDesc = { margin: 0, color: 'rgba(255,255,255,0.7)', lineHeight: 1.6 };
s.epPlay = {
  width: '48px', height: '48px', borderRadius: '16px',
  border: '1px solid rgba(255,255,255,0.1)', display: 'grid', placeItems: 'center',
  color: 'rgba(255,255,255,0.9)', background: 'rgba(255,255,255,0.04)',
  transition: 'all 180ms ease',
};
s.epPlayHover = {
  background: 'var(--accent-cyan)', borderColor: 'var(--accent-cyan)',
  color: '#050c16', boxShadow: '0 0 15px rgba(0, 255, 255, 0.4)',
};
s.detailTopGrid = {
  display: 'grid', gridTemplateColumns: 'minmax(280px, 1fr) minmax(320px, 1.1fr)', gap: '24px',
};
s.detailTopGridMobile = { gridTemplateColumns: '1fr' };
