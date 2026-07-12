import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import HeroCarousel from '../features/home/components/HeroCarousel';
import ContentRail from '../features/home/components/ContentRail';
import TrendingBento from '../features/home/components/TrendingBento';
import ContinueWatchingRail from '../features/continueWatching/components/ContinueWatchingRail';
import { HeroBannerSkeleton, RailSkeleton } from '../components/feedback/Skeleton';
import EmptyState from '../components/feedback/EmptyState';
import BackToTop from '../components/ui/BackToTop';
import { contentService } from '../services';
import { progressService } from '../services/apiClient';
import { useBreakpoint, useRecentlyViewed, useTVMode } from '../hooks';

const posterFallback = `${import.meta.env.BASE_URL}assets/poster-placeholder.svg`;
const RAIL_SIZE = 10;
const HOMEPAGE_POOL_LIMIT = 40;
const HOMEPAGE_CACHE_KEY = 'portal-homepage-cache-v2'; // Cache key updated

// ... (rest of the helper functions remain the same) ...

function normalizeItem(item) {
  return {
    ...item,
    poster: item.poster || posterFallback,
    backdrop: item.backdrop || item.poster || posterFallback,
    genre: item.genre || 'Featured',
    description: item.description || 'Freshly published on the portal.',
    year: item.year || 'Unknown',
    releasedAt: item.releasedAt || null,
    rating: item.rating || 'N/A',
    type: item.type || 'movie',
    language: item.language || item.originalLanguage || 'Mixed',
  };
}

function uniqueById(items) {
  const seen = new Set();
  return (items || []).filter((item) => {
    const key = String(item?.id || '');
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function createRotationSeed(namespace) {
  const now = new Date();
  const rotationSlot = Math.floor(now.getHours() / 4); // Rotate more frequently
  return `${namespace}-${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}-${rotationSlot}`;
}

function hashSeed(value) {
  return Array.from(String(value || '')).reduce((acc, char) => {
    acc = (acc * 31 + char.charCodeAt(0));
    return acc % 2147483647;
  }, 7);
}

function rotateItems(items, seed, pinnedCount = 0) {
  const safeItems = uniqueById(items);
  if (safeItems.length <= pinnedCount + 1) return safeItems;
  const pinned = safeItems.slice(0, pinnedCount);
  const rotating = safeItems.slice(pinnedCount);
  const offset = hashSeed(seed) % rotating.length;
  return [...pinned, ...rotating.slice(offset), ...rotating.slice(0, offset)];
}

function buildRail(items, { seed, size = RAIL_SIZE, excludeIds = [], pinnedCount = 0 } = {}) {
  const blocked = new Set((excludeIds || []).map((id) => String(id)));
  const rotatedItems = rotateItems(items, seed, pinnedCount);
  const selected = [];

  rotatedItems.forEach((item) => {
    const key = String(item?.id || '');
    if (!key || blocked.has(key) || selected.length >= size) return;
    blocked.add(key);
    selected.push(item);
  });

  return selected;
}

function mergePools(...collections) {
  return uniqueById(collections.flat().filter(Boolean));
}

function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = shuffled[i];
    shuffled[i] = shuffled[j];
    shuffled[j] = temp;
  }
  return shuffled;
}

function pickFeatured(explicitFeatured, latestItems, popularItems, trendingItems) {
  const featuredSource = mergePools(latestItems, trendingItems, popularItems);
  const featuredCandidate = explicitFeatured && explicitFeatured.id ? normalizeItem(explicitFeatured) : null;

  const filtered = featuredSource.filter(
    item => item.poster || item.backdrop || item.description
  );

  const shuffled = shuffleArray(filtered);

  let finalItems = shuffled;
  if (featuredCandidate?.id && featuredCandidate?.featured === true) {
    finalItems = [
      featuredCandidate,
      ...shuffled.filter(item => String(item.id) !== String(featuredCandidate.id))
    ];
  }

  return finalItems.slice(0, 30);
}


function buildHomepageContent({
  featured, latest, popular, trending, series,
  recommendations, localTrending
}) {
  const latestItems = (latest || []).map(normalizeItem);
  const popularItems = (popular || []).map(normalizeItem);
  const trendingItems = (trending || []).map(normalizeItem);
  const homepageSeriesItems = (series || []).map(normalizeItem);
  const recommendationsItems = (recommendations || []).map(normalizeItem);
  const localTrendingItems = (localTrending || []).map(normalizeItem);

  const moviePool = mergePools(
    latestItems.filter(item => item.type !== 'series'),
    trendingItems.filter(item => item.type !== 'series'),
    popularItems.filter(item => item.type !== 'series'),
  );
  const seriesPool = mergePools(
    homepageSeriesItems,
    latestItems.filter(item => item.type === 'series'),
    trendingItems.filter(item => item.type === 'series'),
    popularItems.filter(item => item.type === 'series'),
  );
  const bengaliPool = mergePools(
    latestItems.filter(item => item.language === 'Bengali'),
    trendingItems.filter(item => item.language === 'Bengali'),
    popularItems.filter(item => item.language === 'Bengali'),
  );

  const featuredPool = mergePools(latestItems, trendingItems, popularItems, homepageSeriesItems);
  const featuredItems = Array.isArray(featured) && featured.length
    ? shuffleArray(featured.map(normalizeItem))
    : pickFeatured(featured, featuredPool, [], []);
  const featuredIds = featuredItems.slice(0, 5).map(item => item.id);

  let seenIds = [...featuredIds];

  function dedupedRail(items, opts) {
    const rail = buildRail(items, { ...opts, excludeIds: seenIds });
    const ids = (rail || []).map((item) => String(item.id)).filter(Boolean);
    seenIds = [...new Set([...seenIds, ...ids])];
    return rail;
  }

  return {
    featured: featuredItems,
    recommendations: dedupedRail(recommendationsItems, { seed: createRotationSeed('recommendations'), size: RAIL_SIZE }),
    localTrending: dedupedRail(localTrendingItems, { seed: createRotationSeed('local-trending'), size: RAIL_SIZE, pinnedCount: 2 }),
    trending: dedupedRail(trendingItems, { seed: createRotationSeed('trending'), size: RAIL_SIZE, pinnedCount: 3 }),
    latest: dedupedRail(latestItems, { seed: createRotationSeed('latest'), size: RAIL_SIZE, pinnedCount: 4 }),
    popular: dedupedRail(popularItems, { seed: createRotationSeed('popular'), size: RAIL_SIZE, pinnedCount: 2 }),
    movies: dedupedRail(moviePool, { seed: createRotationSeed('movies'), size: RAIL_SIZE, pinnedCount: 2 }),
    series: dedupedRail(seriesPool, { seed: createRotationSeed('series'), size: RAIL_SIZE, pinnedCount: 2 }),
    bengali: dedupedRail(bengaliPool, { seed: createRotationSeed('bengali'), size: RAIL_SIZE, pinnedCount: 2 }),
  };
}

function readHomepageCache() {
  if (typeof sessionStorage === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(HOMEPAGE_CACHE_KEY);
    if (!raw) return null;
    const cache = JSON.parse(raw);
    // Basic cache validation (30 min TTL)
    if (Date.now() - new Date(cache.generatedAt).getTime() > 30 * 60 * 1000) {
      sessionStorage.removeItem(HOMEPAGE_CACHE_KEY);
      return null;
    }
    return cache;
  } catch {
    return null;
  }
}

function writeHomepageCache(value) {
  if (typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.setItem(HOMEPAGE_CACHE_KEY, JSON.stringify(value));
  } catch (e) {
    console.warn('Failed to write to homepage cache:', e);
  }
}

function HomePage() {
  const { isMobile } = useBreakpoint();
  const isTVMode = useTVMode();
  const { items: recentlyViewed } = useRecentlyViewed();
  const [content, setContent] = useState(() => readHomepageCache()?.content || {});
  const [loading, setLoading] = useState(() => !readHomepageCache());
  const [error, setError] = useState(null);
  const [continueWatching, setContinueWatching] = useState([]);
  const [cwLoading, setCwLoading] = useState(false);
  const isLoggedIn = typeof localStorage !== 'undefined' && !!localStorage.getItem('token');

  // Invalidate cache on auth state change
  useEffect(() => {
    const cache = readHomepageCache();
    if (cache && 'isLoggedIn' in cache && cache.isLoggedIn !== isLoggedIn) {
      sessionStorage.removeItem(HOMEPAGE_CACHE_KEY);
      setContent({});
      setLoading(true);
      fetchHomepageData();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn]);

  const fetchHomepageData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const seedContentId = recentlyViewed?.[0]?.id || '';

      const [homepageResponse, recommendations, localTrending] = await Promise.all([
        contentService.getHomepage(HOMEPAGE_POOL_LIMIT).catch(() => ({})),
        seedContentId ? contentService.getRecommendations(seedContentId).catch(() => ({ items: [] })) : Promise.resolve({ items: [] }),
        contentService.getLocalTrending().catch(() => ({ items: [] })),
      ]);

      const nextContent = buildHomepageContent({
        ...homepageResponse,
        recommendations: recommendations?.items,
        localTrending: localTrending?.items,
      });

      setContent(nextContent);
      writeHomepageCache({ content: nextContent, generatedAt: new Date().toISOString(), isLoggedIn });
    } catch (err) {
      console.error('Failed to fetch homepage data:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchHomepageData();
  }, [fetchHomepageData]);

  useEffect(() => {
    document.title = 'Home — Speed4You Portal';
  }, []);

  useEffect(() => {
    if (!isLoggedIn) return;
    setCwLoading(true);
    progressService.getContinueWatching()
      .then(res => setContinueWatching(res?.items || []))
      .catch(() => setContinueWatching([]))
      .finally(() => setCwLoading(false));
  }, [isLoggedIn]);

  const hasFeaturedHero = Array.isArray(content.featured) && content.featured.length > 0;

  const hasAnyContent = hasFeaturedHero ||
    content.movies?.length > 0 ||
    content.series?.length > 0 ||
    content.latest?.length > 0 ||
    content.popular?.length > 0 ||
    content.bengali?.length > 0 ||
    content.trending?.length > 0 ||
    content.recommendations?.length > 0 ||
    content.localTrending?.length > 0;

  if (loading) {
    return (
      <div style={styles.page}>
        <HeroBannerSkeleton />
        <div style={{ ...styles.content, ...(isTVMode ? styles.contentTV : {}), ...(isMobile ? styles.contentMobile : {}) }}>
          <RailSkeleton count={isMobile ? 4 : 6} />
          <RailSkeleton count={isMobile ? 4 : 6} />
          <RailSkeleton count={isMobile ? 4 : 6} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.errorPage}>
        <div style={styles.errorBox}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <p style={styles.errorText}>Could not load content. Check your connection.</p>
          <button onClick={fetchHomepageData} style={styles.retryBtn}>Try again</button>
        </div>
      </div>
    );
  }

  if (!loading && !error && !hasAnyContent) {
    return (
      <div style={{ ...styles.page, ...styles.pageWithoutHero }}>
        <div style={styles.emptyPage}>
          <EmptyState
            icon="content"
            title="Welcome to the Portal"
            message="No content is available right now. Check back soon or browse our library."
            actionLabel="Browse Library"
            actionHref="/browse"
            size="large"
          />
        </div>
      </div>
    );
  }

  return (
    <div style={{ ...styles.page, ...(!hasFeaturedHero ? styles.pageWithoutHero : {}) }}>
      {hasFeaturedHero ? <HeroCarousel items={content.featured} /> : null}

      {(isLoggedIn && (cwLoading || continueWatching.length > 0)) ? (
        <div style={{ padding: '0 max(48px, calc((100vw - 1720px) / 2))', marginTop: hasFeaturedHero ? '-20px' : '0' }}>
          <ContinueWatchingRail items={[...continueWatching].sort((a, b) => (b.updatedAt || b.progress || 0) - (a.updatedAt || a.progress || 0))} isLoading={cwLoading} />
        </div>
      ) : null}

      <div style={{ ...styles.content, ...(isTVMode ? styles.contentTV : {}), ...(isMobile ? styles.contentMobile : {}) }}>
        {content.movies?.length >= 3 ? (
          <ContentRail title="Movies" subtitle="Lean-back movie night" items={content.movies} viewAllLink="/movies" />
        ) : null}

        {content.series?.length >= 1 ? (
          <ContentRail title="Series" subtitle="Binge-ready stories" items={content.series} type="series" viewAllLink="/series" />
        ) : null}

        {content.latest?.length >= 1 ? (
          <ContentRail title="Latest Releases" subtitle="Just added" items={content.latest} viewAllLink="/browse?sort=latest" priorityCount={4} />
        ) : null}

        {content.popular?.length >= 3 ? (
          <ContentRail title="Portal Favorites" subtitle="Strong local demand" items={content.popular} viewAllLink="/browse?sort=popular" priorityCount={3} />
        ) : null}

        {content.bengali?.length >= 2 ? (
          <ContentRail title="Bengali Picks" subtitle="Local language highlights" items={content.bengali} viewAllLink="/browse?language=Bengali" />
        ) : null}

        {recentlyViewed?.length >= 2 ? (
          <ContentRail
            title="Recently Viewed"
            subtitle="Pick up where you left off"
            items={recentlyViewed
              .filter(item => !continueWatching.some(cw => String(cw.id) === String(item.id)))
              .map(item => ({
                ...item,
                poster: item.poster || `${import.meta.env.BASE_URL}assets/poster-placeholder.svg`,
                genre: item.genre || 'Featured',
                language: item.language || 'Mixed',
              }))}
          />
        ) : null}

        {content.recommendations?.length > 0 ? (
          <ContentRail
            title="Because you watched..."
            subtitle="More of what you like"
            items={content.recommendations}
          />
        ) : null}

        {content.localTrending?.length > 3 ? (
          <ContentRail
            title="Trending Near You"
            subtitle="Popular in your area"
            items={content.localTrending}
          />
        ) : null}

        {content.trending?.length >= 5 ? (
          <TrendingBento items={content.trending} />
        ) : content.trending?.length >= 3 ? (
          <ContentRail title="Trending Right Now" subtitle="Most watched this week" items={content.trending} viewAllLink="/browse?sort=trending" priorityCount={4} />
        ) : null}

      </div>

      {!isLoggedIn ? (
        <div style={styles.guestPrompt}>
          <div style={styles.guestPromptContent}>
            <h3 style={styles.guestPromptTitle}>Sign in for a better experience</h3>
            <p style={styles.guestPromptText}>Track your progress, get recommendations, and pick up where you left off.</p>
            <div style={styles.guestPromptActions}>
              <Link to="/login" style={styles.guestPromptBtn}>Sign In</Link>
              <Link to="/register" style={styles.guestPromptBtnSecondary}>Create Account</Link>
            </div>
          </div>
        </div>
      ) : null}

      <BackToTop />
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
  },
  pageWithoutHero: {
    paddingTop: 'calc(var(--nav-occupied-mobile) + 16px)',
  },
  errorPage: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 'var(--nav-occupied-desktop)',
  },
  errorBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '20px',
    textAlign: 'center',
    padding: '48px 32px',
    borderRadius: '24px',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.07)',
    maxWidth: '360px',
  },
  errorText: {
    color: 'var(--text-secondary)',
    fontSize: '0.95rem',
    lineHeight: '1.5',
  },
  retryBtn: {
    padding: '12px 32px',
    borderRadius: '999px',
    background: 'var(--accent-cyan)',
    color: '#050c16',
    fontSize: '0.9rem',
    fontWeight: '900',
    cursor: 'pointer',
    border: 'none',
    letterSpacing: '0.04em',
  },
  content: {
    position: 'relative',
    zIndex: 1,
    paddingBottom: 'var(--spacing-3xl)',
    display: 'grid',
    gap: 'var(--spacing-2xl)',
    marginTop: '-60px',
  },
  contentTV: {
    gap: '60px',
    paddingBottom: '120px',
  },
  contentMobile: {
    gap: 'var(--spacing-xl)',
    marginTop: '-30px',
  },
  emptyPage: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 'var(--nav-occupied-desktop)',
  },
  guestPrompt: {
    padding: '60px max(48px, calc((100vw - 1720px) / 2))',
    textAlign: 'center',
  },
  guestPromptContent: {
    maxWidth: '480px',
    margin: '0 auto',
    padding: '40px 32px',
    borderRadius: '24px',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.07)',
  },
  guestPromptTitle: {
    color: 'var(--text-primary)',
    fontSize: '1.4rem',
    fontWeight: '800',
    marginBottom: '12px',
  },
  guestPromptText: {
    color: 'var(--text-secondary)',
    fontSize: '0.95rem',
    lineHeight: '1.6',
    marginBottom: '24px',
  },
  guestPromptActions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  guestPromptBtn: {
    padding: '12px 32px',
    borderRadius: '999px',
    background: 'var(--accent-cyan)',
    color: '#050c16',
    fontSize: '0.9rem',
    fontWeight: '900',
    textDecoration: 'none',
    letterSpacing: '0.04em',
  },
  guestPromptBtnSecondary: {
    padding: '12px 32px',
    borderRadius: '999px',
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.15)',
    color: '#fff',
    fontSize: '0.9rem',
    fontWeight: '700',
    textDecoration: 'none',
    letterSpacing: '0.04em',
  },
};

export default HomePage;
