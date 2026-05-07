function normalizeTitleKey(value) {
  const normalized = String(value || '')
    .toLowerCase()
    .replace(/\b(19|20)\d{2}\b/g, '')
    .replace(/\b(1080p|720p|480p|2160p|web[- ]?dl|bluray|brrip|x264|x265|hdrip|dvdrip|proper|uncut)\b/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return normalized || String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
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
    titleKey: item.titleKey || normalizeTitleKey(item.title),
    duplicateCandidates: Array.isArray(item.duplicateCandidates) ? item.duplicateCandidates : [],
    duplicateCount: Number(item.duplicateCount || 0),
    trendingScore,
    collection: item.collection || '',
    tags: normalizeStringList(item.tags),
    adminNotes: item.adminNotes || '',
    editorialScore: Number(item.editorialScore || 0),
    featuredOrder: Number(item.featuredOrder || 0),
  };
}

function attachDuplicateMetadata(item, groups) {
  const key = `${item.type}:${item.titleKey || normalizeTitleKey(item.title)}`;
  const matches = (groups.get(key) || [])
    .filter((candidate) => candidate.id !== item.id)
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

module.exports = {
  normalizeTitleKey,
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
  attachDuplicateMetadata,
};
