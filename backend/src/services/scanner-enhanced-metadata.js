/**
 * Phase 1: Critical Fix - Enhanced Metadata Enrichment
 * 
 * Wraps the original metadata-enricher with caching and rate limiting
 * to improve performance and avoid API rate limits.
 */

const {
  cleanSearchTitle,
  enrichItemWithMetadata: originalEnrichItemWithMetadata,
  fetchMetadataByTmdbId,
  fetchMetadataFromOmdb,
  hasTmdbKey,
  hasOmdbKey,
} = require('./metadata-enricher');

const {
  fetchWithRateLimitAndCache,
  clearAllCache,
  getCacheStats,
} = require('./scanner-cache');
const { retryAsync } = require('./scanner-error-handler');


const DEFAULT_METADATA_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days for metadata
const METADATA_PATCH_FIELDS = [
  'description',
  'genre',
  'genres',
  'rating',
  'runtime',
  'tmdbId',
  'imdbId',
  'originalTitle',
  'originalLanguage',
  'metadataStatus',
  'metadataProvider',
  'metadataConfidence',
  'metadataUpdatedAt',
  'metadataError',
  'parsedTitle',
  'poster',
  'backdrop',
];

function extractMetadataPatch(enrichedItem, sourceItem) {
  const patch = {};
  for (const field of METADATA_PATCH_FIELDS) {
    if (enrichedItem[field] === undefined) continue;
    if ((field === 'poster' || field === 'backdrop') && sourceItem[field]) continue;
    patch[field] = enrichedItem[field];
  }
  return patch;
}

function applyMetadataPatch(item, patch, parsedTitle) {
  return {
    ...item,
    description: item.description || patch.description || '',
    poster: item.poster || patch.poster || '',
    backdrop: item.backdrop || patch.backdrop || item.poster || patch.poster || '',
    genre: item.genre || patch.genre || '',
    genres: Array.isArray(item.genres) && item.genres.length ? item.genres : (patch.genres || []),
    rating: item.rating || patch.rating || null,
    runtime: item.runtime || patch.runtime || null,
    tmdbId: patch.tmdbId || item.tmdbId || null,
    imdbId: patch.imdbId || item.imdbId || '',
    originalTitle: patch.originalTitle || item.originalTitle || '',
    originalLanguage: patch.originalLanguage || item.originalLanguage || '',
    metadataStatus: patch.metadataStatus || item.metadataStatus || 'skipped',
    metadataProvider: patch.metadataProvider || item.metadataProvider || '',
    metadataConfidence: patch.metadataConfidence ?? item.metadataConfidence ?? 0,
    metadataUpdatedAt: patch.metadataUpdatedAt || new Date().toISOString(),
    metadataError: patch.metadataError || '',
    parsedTitle: patch.parsedTitle || parsedTitle,
  };
}

// Cache hit/miss statistics
const cacheStats = {
  hits: 0,
  misses: 0,
  errors: 0,
};

/**
 * Enhanced metadata enrichment with caching
 */
async function enrichItemWithMetadata(item) {
  const parsedTitle = cleanSearchTitle(item.title);

  // If OMDB key is available and IMDb ID is provided, try OMDB first
  if (item.imdbId && hasOmdbKey()) {
    try {
      const { data: omdbData, fromCache } = await fetchWithRateLimitAndCache(
        'omdb',
        () => retryAsync(() => fetchMetadataFromOmdb(item.imdbId)),
        { imdbId: item.imdbId },
        DEFAULT_METADATA_TTL
      );

      if (fromCache) cacheStats.hits++;
      else cacheStats.misses++;

      return {
        ...item,
        description: item.description || omdbData.description,
        poster: item.poster || omdbData.poster,
        backdrop: item.backdrop || omdbData.backdrop,
        genre: item.genre || omdbData.genre,
        genres: Array.isArray(item.genres) && item.genres.length ? item.genres : omdbData.genres,
        rating: item.rating || omdbData.rating,
        runtime: item.runtime || omdbData.runtime,
        imdbId: omdbData.imdbId,
        originalTitle: omdbData.originalTitle,
        originalLanguage: omdbData.originalLanguage,
        metadataStatus: 'matched',
        metadataProvider: 'omdb',
        metadataConfidence: 100,
        metadataUpdatedAt: new Date().toISOString(),
        metadataError: '',
        parsedTitle,
      };
    } catch (omdbError) {
      cacheStats.errors++;
      if (!hasTmdbKey()) {
        return {
          ...item,
          metadataStatus: 'failed',
          metadataProvider: 'omdb',
          metadataConfidence: 0,
          metadataUpdatedAt: new Date().toISOString(),
          metadataError: omdbError.message || 'OMDB enrichment failed.',
          parsedTitle,
        };
      }
    }
  }

  if (!hasTmdbKey()) {
    return {
      ...item,
      metadataStatus: 'skipped',
      metadataProvider: '',
      metadataConfidence: 0,
      metadataUpdatedAt: new Date().toISOString(),
      metadataError: 'TMDB_API_KEY is not configured.',
      parsedTitle,
    };
  }

  if (!parsedTitle) {
    return {
      ...item,
      metadataStatus: 'skipped',
      metadataProvider: '',
      metadataConfidence: 0,
      metadataUpdatedAt: new Date().toISOString(),
      metadataError: 'Unable to parse a searchable title from scanner input.',
      parsedTitle,
    };
  }

  try {
    // Try to get from cache first
    const mediaType = item.type === 'series' ? 'tv' : 'movie';
    const cacheKey = {
      type: 'search',
      mediaType,
      query: parsedTitle,
      year: item.type === 'movie' ? item.year : undefined,
      language: item.language || '',
      category: item.category || '',
      sourceRootLabel: item.sourceRootLabel || '',
    };

    const { data: metadataPatch, fromCache } = await fetchWithRateLimitAndCache(
      'tmdb',
      async () => {
        const enriched = await retryAsync(() => originalEnrichItemWithMetadata(item));
        return extractMetadataPatch(enriched, item);
      },
      cacheKey,
      DEFAULT_METADATA_TTL
    );

    if (fromCache) cacheStats.hits++;
    else cacheStats.misses++;

    return applyMetadataPatch(item, metadataPatch, parsedTitle);
  } catch (error) {
    cacheStats.errors++;
    return {
      ...item,
      metadataStatus: 'failed',
      metadataProvider: 'tmdb',
      metadataConfidence: 0,
      metadataUpdatedAt: new Date().toISOString(),
      metadataError: error.message || 'Metadata enrichment failed.',
      parsedTitle,
    };
  }
}

/**
 * Batch enrich multiple items with parallel processing
 */
async function batchEnrichItems(items, concurrency = 5) {
  if (!Array.isArray(items) || items.length === 0) {
    return { enriched: [], errors: [] };
  }

  const enriched = [];
  const errors = [];
  
  // Process items in batches to control concurrency
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    const promises = batch.map(async (item) => {
      try {
        const enrichedItem = await enrichItemWithMetadata(item);
        return { success: true, item: enrichedItem };
      } catch (error) {
        errors.push({ item, error: error.message });
        return { success: false, item, error };
      }
    });

    const results = await Promise.all(promises);
    for (const result of results) {
      if (result.success) {
        enriched.push(result.item);
      }
    }
  }

  return { enriched, errors };
}

/**
 * Get cache statistics for monitoring
 */
function getEnhancedCacheStats() {
  return {
    ...getCacheStats(),
    ...cacheStats,
    hitRate: cacheStats.hits > 0 
      ? ((cacheStats.hits / (cacheStats.hits + cacheStats.misses)) * 100).toFixed(2) + '%'
      : '0%',
  };
}

/**
 * Reset cache statistics
 */
function resetCacheStats() {
  cacheStats.hits = 0;
  cacheStats.misses = 0;
  cacheStats.errors = 0;
}

/**
 * Clear all metadata cache
 */
function clearMetadataCache() {
  clearAllCache();
  resetCacheStats();
}

module.exports = {
  enrichItemWithMetadata,
  batchEnrichItems,
  getEnhancedCacheStats,
  resetCacheStats,
  clearMetadataCache,
  // Export original functions for backward compatibility
  cleanSearchTitle,
  fetchMetadataByTmdbId,
  fetchMetadataFromOmdb,
  hasTmdbKey,
  hasOmdbKey,
};
