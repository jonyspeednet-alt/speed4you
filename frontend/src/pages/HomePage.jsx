import { useEffect, useState } from 'react';
import HeroCarousel from '../features/home/components/HeroCarousel';
import ContentRail from '../features/home/components/ContentRail';
import TrendingBento from '../features/home/components/TrendingBento';
import { contentService } from '../services';
import { useBreakpoint, useRecentlyViewed, useTVMode } from '../hooks';

const posterFallback = '/portal/assets/poster-placeholder.svg';
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

  const excludeIds = [...featuredIds];

  return {
    featured: featuredItems,
    recommendations: buildRail(recommendationsItems, { seed: createRotationSeed('recommendations'), size: RAIL_SIZE, excludeIds }),
    localTrending: buildRail(localTrendingItems, { seed: createRotationSeed('local-trending'), size: RAIL_SIZE, excludeIds, pinnedCount: 2 }),
    trending: buildRail(trendingItems, { seed: createRotationSeed('trending'), size: RAIL_SIZE, excludeIds, pinnedCount: 3 }),
    latest: buildRail(latestItems, { seed: createRotationSeed('latest'), size: RAIL_SIZE, excludeIds, pinnedCount: 4 }),
    popular: buildRail(popularItems, { seed: createRotationSeed('popular'), size: RAIL_SIZE, excludeIds, pinnedCount: 2 }),
    movies: buildRail(moviePool, { seed: createRotationSeed('movies'), size: RAIL_SIZE, excludeIds, pinnedCount: 2 }),
    series: buildRail(seriesPool, { seed: createRotationSeed('series'), size: RAIL_SIZE, excludeIds, pinnedCount: 2 }),
    bengali: buildRail(bengaliPool, { seed: createRotationSeed('bengali'), size: RAIL_SIZE, excludeIds, pinnedCount: 2 }),
  };
}

function readHomepageCache() {
  if (typeof sessionStorage === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(HOMEPAGE_CACHE_KEY);
    if (!raw) return null;
    const cache = JSON.parse(raw);
    // Basic cache validation
    if (Date.now() - new Date(cache.generatedAt).getTime() > 4 * 60 * 60 * 1000) {
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

  useEffect(() => {
    let cancelled = false;

    async function fetchHomepageData() {
      if (cancelled) return;
      setLoading(true);

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

        if (!cancelled) {
          setContent(nextContent);
          writeHomepageCache({ content: nextContent, generatedAt: new Date().toISOString() });
        }
      } catch (error) {
        console.error('Failed to fetch homepage data:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchHomepageData();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasFeaturedHero = Array.isArray(content.featured) && content.featured.length > 0;

  return (
    <div style={{ ...styles.page, ...(!hasFeaturedHero ? styles.pageWithoutHero : {}) }}>
      {hasFeaturedHero ? <HeroCarousel items={content.featured} /> : null}

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
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
  },
  pageWithoutHero: {
    paddingTop: 'calc(var(--nav-occupied-desktop) + 24px)',
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
};

export default HomePage;
