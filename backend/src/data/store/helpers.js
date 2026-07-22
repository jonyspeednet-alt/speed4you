function normalizeTitleKey(value, year) {
  const normalized = String(value || '')
    .toLowerCase()
    .replace(/\b(1080p|720p|480p|2160p|4k|8k)\b/g, '')
    .replace(/\b(web[- ]?dl|webrip|bluray|brrip|dvdrip|hdrip|hdtc|hdcam|cam|hqrip|dvdscr|screener|ts|tc)\b/g, '')
    .replace(/\b(x264|x265|h264|h265|hevc|avc|aac|10bit|dts|ddp5[\.\s]?1|ddp|atmos|truehd|flac|mp3)\b/g, '')
    .replace(/\b(hdhub4u|cinevood|hdhub|ds4k|imax|line|hc|esubs?|esub|dual|multi)\b/g, '')
    .replace(/\b(v2|v3|fhd|hq|proper|uncut|extended|unrated|directors?[\s-]?cut)\b/g, '')
    .replace(/\b(zee5|netflix|amazon|hotstar|disney|sony|jio|aha|mx)\b/g, '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const key = normalized || String(value || '').toLowerCase().replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (year) return `${key}-${year}`;
  return key;
}

// Levenshtein distance for fuzzy string matching
function levenshteinDistance(a, b) {
  const matrix = [];
  const aLen = a.length;
  const bLen = b.length;

  if (aLen === 0) return bLen;
  if (bLen === 0) return aLen;

  // Initialize matrix
  for (let i = 0; i <= bLen; i++) matrix[i] = [i];
  for (let j = 0; j <= aLen; j++) matrix[0][j] = j;

  // Fill matrix
  for (let i = 1; i <= bLen; i++) {
    for (let j = 1; j <= aLen; j++) {
      const cost = b.charAt(i - 1) === a.charAt(j - 1) ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // deletion
        matrix[i][j - 1] + 1,      // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return matrix[bLen][aLen];
}

// Check if two titles are similar enough to be considered the same content
// Returns a similarity score between 0 (no match) and 1 (exact match)
function titleSimilarity(title1, title2) {
  const t1 = String(title1 || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const t2 = String(title2 || '').toLowerCase().replace(/[^a-z0-9]/g, '');

  if (t1 === t2) return 1;
  if (!t1 || !t2) return 0;

  const maxLen = Math.max(t1.length, t2.length);
  if (maxLen === 0) return 1;

  const distance = levenshteinDistance(t1, t2);
  return 1 - (distance / maxLen);
}

// Check if two titles match with fuzzy logic
// Considers titles matching if:
// 1. Exact match after normalization
// 2. One title contains the other
// 3. Levenshtein similarity > threshold (0.8 = 80% similar)
function titlesFuzzyMatch(title1, title2, threshold = 0.8) {
  const t1 = String(title1 || '').toLowerCase().trim();
  const t2 = String(title2 || '').toLowerCase().trim();

  if (t1 === t2) return true;
  if (!t1 || !t2) return false;

  // Check containment
  if (t1.includes(t2) || t2.includes(t1)) return true;

  // Check similarity
  return titleSimilarity(t1, t2) >= threshold;
}

function clampNumber(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function parseISODate(value) {
  if (!value) return null;
  const s = String(value).trim();
  if (!/^\d{4}-\d{2}-\d{2}/.test(s)) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function extractTypedColumns(item) {
  return {
    status:           item.status           || 'draft',
    content_type:     item.type             || 'movie',
    title:            item.title            || '',
    title_key:        item.titleKey         || '',
    language:         item.language         || '',
    category:         item.category         || '',
    collection:       item.collection       || '',
    source_type:      item.sourceType       || 'manual',
    source_root_id:   item.sourceRootId     || '',
    last_scan_run_id: item.lastScanRunId    || '',
    year:             item.year   ? Number(item.year)   : null,
    rating:           item.rating ? Number(item.rating) : null,
    featured:         Boolean(item.featured),
    featured_order:   Number(item.featuredOrder  || 0),
    trending_score:   Number(item.trendingScore  || 0),
    view_count:       Number(item.viewCount     || 0),
    duplicate_count:  Number(item.duplicateCount || 0),
    metadata_status:  item.metadataStatus  || 'pending',
    published_at:     parseISODate(item.publishedAt),
    released_at:      parseISODate(item.releasedAt),
  };
}

function rowToScannerRun(row) {
  const completedAt = row.completed_at ? row.completed_at.toISOString() : null;
  const created = Number(row.total_created || 0);
  const updated = Number(row.total_updated || 0);
  const deleted = Number(row.total_deleted || 0);

  return {
    id:              row.id,
    status:          row.status,
    startedAt:       row.started_at   ? row.started_at.toISOString()   : null,
    completedAt,
    endedAt:         completedAt,
    rootIds:         row.root_ids     || [],
    rootsRequested:  row.roots_requested,
    rootsScanned:    row.roots_scanned,
    created,
    createdCount:    created,
    updated,
    updatedCount:    updated,
    deleted,
    deletedCount:    deleted,
    unchanged:       row.total_unchanged,
    duplicateDrafts: row.total_duplicate_drafts,
    skipped:         row.skipped      || [],
    errors:          row.errors       || [],
    rootResults:     row.root_results || [],
    error:           row.error        || null,
  };
}


function toSafeInteger(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function rowToScannerRoot(row) {
  return {
    id:            row.id,
    label:         row.label,
    scanPath:      row.scan_path,
    publicBaseUrl: row.public_base_url,
    type:          row.type,
    language:      row.language,
    category:      row.category,
    maxDepth:      row.max_depth  ?? undefined,
    batchSize:     row.batch_size ?? undefined,
    enabled:       row.enabled,
    discovered:    row.discovered,
  };
}

function normalizeRuntimeMinutes(value, fallbackSeconds = null) {
  const numericValue = Number(value);
  if (Number.isFinite(numericValue) && numericValue > 0) {
    return numericValue > 400 ? Math.max(1, Math.round(numericValue / 60)) : Math.round(numericValue);
  }
  const fallbackValue = Number(fallbackSeconds);
  return (Number.isFinite(fallbackValue) && fallbackValue > 0) ? Math.max(1, Math.round(fallbackValue / 60)) : null;
}

function normalizeDurationSeconds(value, fallbackMinutes = null) {
  const numericValue = Number(value);
  if (Number.isFinite(numericValue) && numericValue > 0) {
    return numericValue <= 400 ? Math.round(numericValue * 60) : Math.round(numericValue);
  }
  const fallbackValue = Number(fallbackMinutes);
  return (Number.isFinite(fallbackValue) && fallbackValue > 0) ? Math.round(fallbackValue * 60) : 0;
}

function normalizeEpisodes(episodes = []) {
  if (!Array.isArray(episodes)) return [];
  return episodes.map((episode, index) => {
    const durationSeconds = normalizeDurationSeconds(episode.duration, episode.runtimeMinutes || episode.runtime || null);
    const runtimeMinutes = normalizeRuntimeMinutes(episode.runtimeMinutes || episode.runtime || episode.duration, durationSeconds);
    return {
      ...episode,
      id: episode.id || index + 1,
      number: Number(episode.number || episode.id || index + 1),
      durationSeconds,
      runtimeMinutes,
    };
  });
}

function normalizeSeasons(seasons = []) {
  if (!Array.isArray(seasons)) return [];
  return seasons.map((season, index) => ({
    ...season,
    id: season.id || index + 1,
    number: Number(season.number || season.id || index + 1),
    episodes: normalizeEpisodes(season.episodes || []),
  }));
}

function resolveDisplayGenres(item) {
  if (Array.isArray(item.genres) && item.genres.length) return item.genres;
  if (typeof item.genre === 'string' && item.genre.trim()) {
    return item.genre.split(',').map((entry) => entry.trim()).filter(Boolean);
  }
  return [];
}

function normalizeStringList(value) {
  if (Array.isArray(value)) return value.map((entry) => String(entry || '').trim()).filter(Boolean);
  if (typeof value === 'string') return value.split(',').map((entry) => entry.trim()).filter(Boolean);
  return [];
}

function normalizeItem(item) {
  const genres = resolveDisplayGenres(item);
  const updatedAt = item.updatedAt || item.metadataUpdatedAt || item.createdAt || '';
  const metadataConfidence = Number(item.metadataConfidence || 0);
  const rating = item.rating ? Number(item.rating) : null;
  const recencyDate = updatedAt ? new Date(updatedAt) : null;
  const recencyDays = recencyDate && !Number.isNaN(recencyDate.getTime()) ? Math.max(0, (Date.now() - recencyDate.getTime()) / (1000 * 60 * 60 * 24)) : 999;
  const recencyBoost = clampNumber(30 - recencyDays, 0, 30);
  const ratingBoost = rating ? rating * 8 : 0;
  const confidenceBoost = metadataConfidence / 5;
  const duplicatePenalty = Number(item.duplicateCount || 0) > 0 ? 12 : 0;
  const reviewPenalty = item.metadataStatus === 'needs_review' ? 18 : item.metadataStatus === 'not_found' ? 28 : 0;
  const trendingScore = Math.round(Math.max(0, recencyBoost + ratingBoost + confidenceBoost - duplicatePenalty - reviewPenalty));
  const runtimeMinutes = normalizeRuntimeMinutes(item.runtime, item.duration);
  const durationSeconds = normalizeDurationSeconds(item.duration, runtimeMinutes);

  return {
    ...item,
    genres,
    genre: item.genre || genres.join(', '),
    type: item.type || 'movie',
    status: item.status || 'draft',
    featured: Boolean(item.featured),
    year: item.year ? Number(item.year) : null,
    rating: item.rating ? Number(item.rating) : null,
    runtime: runtimeMinutes,
    runtimeMinutes,
    durationSeconds,
    seasonCount: item.seasonCount ? Number(item.seasonCount) : 0,
    episodeCount: item.episodeCount ? Number(item.episodeCount) : 0,
    seasons: normalizeSeasons(item.seasons || []),
    description: item.description || '',
    tmdbId: item.tmdbId ? Number(item.tmdbId) : null,
    imdbId: item.imdbId || '',
    originalTitle: item.originalTitle || '',
    originalLanguage: item.originalLanguage || '',
    metadataStatus: item.metadataStatus || 'pending',
    metadataProvider: item.metadataProvider || '',
    metadataConfidence,
    metadataUpdatedAt: item.metadataUpdatedAt || '',
    metadataError: item.metadataError || '',
    parsedTitle: item.parsedTitle || '',
    titleKey: item.titleKey || normalizeTitleKey(item.title, item.year),
    duplicateCandidates: Array.isArray(item.duplicateCandidates) ? item.duplicateCandidates : [],
    duplicateCount: Number(item.duplicateCount || 0),
    trendingScore: item.trendingScore || trendingScore,
    viewCount: Number(item.viewCount || 0),
    collection: item.collection || '',
    tags: normalizeStringList(item.tags),
    adminNotes: item.adminNotes || '',
    editorialScore: Number(item.editorialScore || 0),
    featuredOrder: Number(item.featuredOrder || 0),
  };
}

function attachDuplicateMetadata(item, groups) {
  const key = `${item.type}:${item.titleKey || normalizeTitleKey(item.title, item.year)}`;
  const itemRoot = String(item.sourceRootId || '').trim();
  const matches = (groups.get(key) || [])
    .filter((candidate) => candidate.id !== item.id)
    .filter((candidate) => !itemRoot || String(candidate.sourceRootId || '').trim() !== itemRoot)
    .map((candidate) => ({
      id: candidate.id,
      title: candidate.title,
      status: candidate.status,
      year: candidate.year,
      sourceType: candidate.sourceType,
      sourcePath: candidate.sourcePath || '',
    }));

  return {
    ...item,
    duplicateCandidates: matches,
    duplicateCount: matches.length,
  };
}

function toCardItem(item) {
  const genres = resolveDisplayGenres(item);
  return {
    id: item.id,
    title: item.title || '',
    type: item.type || 'movie',
    poster: item.poster || '',
    backdrop: item.backdrop || '',
    thumbnail: item.thumbnail || '',
    genre: item.genre || genres.join(', '),
    genres,
    year: item.year ? Number(item.year) : null,
    rating: item.rating ? Number(item.rating) : null,
    language: item.language || '',
    description: item.description || '',
    runtime: item.runtime || item.runtimeMinutes || null,
    seasonCount: item.seasonCount ? Number(item.seasonCount) : 0,
    episodeCount: item.episodeCount ? Number(item.episodeCount) : 0,
    featured: Boolean(item.featured),
    trendingScore: Number(item.trendingScore || 0),
    viewCount: Number(item.viewCount || 0),
    slug: item.slug || '',
    status: item.status || 'published',
    category: item.category || '',
    collection: item.collection || '',
    tags: normalizeStringList(item.tags),
    videoUrl: item.videoUrl || '',
    createdAt: item.createdAt || '',
    updatedAt: item.updatedAt || '',
    publishedAt: item.publishedAt || '',
    releasedAt: item.releasedAt || '',
  };
}

module.exports = {
  normalizeTitleKey,
  levenshteinDistance,
  titleSimilarity,
  titlesFuzzyMatch,
  clampNumber,
  parseISODate,
  extractTypedColumns,
  rowToScannerRun,
  toSafeInteger,
  rowToScannerRoot,
  normalizeRuntimeMinutes,
  normalizeDurationSeconds,
  normalizeEpisodes,
  normalizeSeasons,
  resolveDisplayGenres,
  normalizeStringList,
  normalizeItem,
  toCardItem,
  attachDuplicateMetadata,
};
