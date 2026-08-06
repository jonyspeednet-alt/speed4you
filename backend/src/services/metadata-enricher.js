const TMDB_API_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';
const NOISE_PATTERNS = [
  /\b(480p|720p|1080p|2160p|4k)\b/gi,
  /\bhdwebmovies?\b/gi,
  /\bh\s*\.?\s*264\b/gi,
  /\b(web[- ]?dl|webrip|bluray|brrip|hdrip|dvdrip|x264|x265|h\.?264|h\.?265|hevc)\b/gi,
  /\b(dual audio|multi audio|english|hindi|bangla|bengali|japanese|korean|french|spanish|dubbed|subbed|esub|msub|engsub|subs?|eng|hin)\b/gi,
  /\b(complete|full|uncut|uncensored|extended|directors?\.?\s*cut)\b/gi,
  /\b(complete|full)\s+(series|season)\b/gi,
  /\bseason\s*\d{1,2}\b/gi,
  /\bs\d{1,2}\s*[-_. ]*e\d{1,3}\b/gi,
  /\bs\d{1,2}\b/gi,
  /\be\d{1,3}\b/gi,
  /\b\d{1,2}x\d{1,3}\b/gi,
  /\bepisode\s*\d{1,3}\b/gi,
  /\bTV\s*(Mini\s*)?Series\b/gi,
  /\([^)]*\bTV\s*(Mini\s*)?Series\b[^)]*\)/gi,
  /\b(nf|netflix|hdtv|hdtvrip|bdrip|10bit|10-bit|8bit|hdr10?|hdr|sdr)\b/gi,
  /\b(ddp?[+-]?\d([.\s]*\d)?|ddp?|dolby|atmos|ac3|dts|aac|mp3|truehd|he-aac)\b/gi,
  /\b(katmoviehd|psa|yts|yify|rarbg|fgt|pahe|galaxyrg|tgx|qxr|sartre|tomboc|joy|etrg|juggs|axxo|shaanig)\b/gi,
  /\b(old|repack|proper|v\d+|temp|sample|copy)\b/gi,
  /\[[^\]]+\]/g,
  /\{[^}]+\}/g,
];

function hasTmdbKey() {
  return Boolean(process.env.TMDB_API_KEY);
}

function hasOmdbKey() {
  return Boolean(process.env.OMDB_API_KEY);
}

function isGoodUrl(url) {
  if (!url) return false;
  // Only remote http(s) URLs and uploaded files are reliably servable from anywhere.
  // Local-web-root relative paths (e.g. /Hindi_Movies/...) exist on the server
  // filesystem but are NOT good — we want to replace them with proper TMDB URLs.
  return url.startsWith('http') || url.startsWith('/portal/uploads') || url.startsWith('/uploads');
}

// Extract the 4-digit year embedded in a raw title string (e.g. "Movie Name (2019)..." → 2019)
function extractYearFromRawTitle(raw) {
  const match = String(raw || '').match(/\b(19|20)\d{2}\b/);
  return match ? Number(match[0]) : null;
}

// Return just the "core" title — everything before the first '(' or '['
function extractCoreTitle(raw) {
  const cleaned = String(raw || '')
    .replace(/\.[a-z0-9]{2,4}$/i, '')
    .replace(/[._]/g, ' ')
    .replace(/\[.*/, '')
    .replace(/\(.*/, '')
    .trim();
  return cleaned;
}

function cleanSearchTitle(value) {
  let normalized = String(value || '').replace(/\.[a-z0-9]{2,4}$/i, '');
  normalized = normalized.replace(/[._]/g, ' ');
  normalized = normalized
    .replace(/\bnormalizing\s+\d+\s+[a-f0-9]{6,}\b/gi, ' ')
    .replace(/\bpre[- ]normalize\s+\d+\b/gi, ' ')
    .replace(/\b[a-f0-9]{7,}\b/gi, ' ');

  for (const pattern of NOISE_PATTERNS) {
    normalized = normalized.replace(pattern, ' ');
  }

  normalized = normalized.replace(/([a-z])([A-Z])/g, '$1 $2');

  let cleaned = normalized
    .replace(/\((19|20)\d{2}\)/g, ' ')
    .replace(/\b(19|20)\d{2}\b/g, ' ')
    // Don't remove colons at all - they might be part of the title (e.g., "13:14")
    .replace(/\s*[-–—]+\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // If the cleaned title is empty or contains no letters/numbers (e.g. only punctuation like "( - )"),
  // fall back to taking the part before the first parenthesis
  if (!cleaned || !/(\p{L}|\p{N})/u.test(cleaned)) {
    const parts = String(value || '').split('(');
    if (parts[0].trim()) {
      cleaned = parts[0].trim();
    } else {
      cleaned = String(value || '').trim();
    }
    // Remove dots/underscores/file extension
    cleaned = cleaned.replace(/\.[a-z0-9]{2,4}$/i, '').replace(/[._]/g, ' ').trim();
  }

  return cleaned;
}

function detectLanguageFromText(text) {
  const normalized = String(text || '').toLowerCase();
  if (/\b(bangla|bengali)\b/i.test(normalized)) return 'bn';
  if (/\b(hindi)\b/i.test(normalized)) return 'hi';
  if (/\b(tamil)\b/i.test(normalized)) return 'ta';
  if (/\b(telugu)\b/i.test(normalized)) return 'te';
  if (/\b(malayalam)\b/i.test(normalized)) return 'ml';
  if (/\b(kannada)\b/i.test(normalized)) return 'kn';
  if (/\b(japanese|anime)\b/i.test(normalized)) return 'ja';
  if (/\b(korean)\b/i.test(normalized)) return 'ko';
  return null;
}

function inferOriginalLanguage(item) {
  // 1. Try to detect from item title or source path
  let detected = detectLanguageFromText(item.title) || detectLanguageFromText(item.sourcePath);
  if (detected) return detected;

  // 2. Try to detect from episodes (if any exist)
  if (Array.isArray(item.seasons)) {
    for (const season of item.seasons) {
      if (Array.isArray(season.episodes)) {
        for (const episode of season.episodes) {
          detected = detectLanguageFromText(episode.title) || detectLanguageFromText(episode.sourcePath);
          if (detected) return detected;
        }
      }
    }
  }

  // 3. Fall back to existing root-based/category-based mapping
  const categoryText = `${item.category || ''} ${item.sourceRootLabel || ''}`.toLowerCase();
  const languageText = String(item.language || '').toLowerCase();

  if (languageText.includes('bengali') || categoryText.includes('bangla')) return 'bn';
  if (languageText.includes('hindi')) return 'hi';
  if (languageText.includes('japanese') || categoryText.includes('animation')) return 'ja';
  if (languageText.includes('korean')) return 'ko';
  return 'en';
}


function scoreCandidate(candidate, item) {
  const searchTitle = cleanSearchTitle(item.title).toLowerCase();
  const candidateTitle = cleanSearchTitle(String(candidate.title || candidate.name || '')).toLowerCase();
  const candidateOriginalTitle = String(candidate.original_title || candidate.original_name || '').toLowerCase();
  const targetYear = Number(item.year) || null;
  const candidateYear = Number((candidate.release_date || candidate.first_air_date || '').slice(0, 4)) || null;
  const targetLanguage = inferOriginalLanguage(item);
  let score = 0;

  console.log('[scoreCandidate] searchTitle:', searchTitle);
  console.log('[scoreCandidate] candidateTitle:', candidateTitle);
  console.log('[scoreCandidate] candidateOriginalTitle:', candidateOriginalTitle);
  console.log('[scoreCandidate] targetYear:', targetYear, 'candidateYear:', candidateYear);

  if (candidateTitle === searchTitle || candidateOriginalTitle === searchTitle) {
    score += 55;
    console.log('[scoreCandidate] Exact match +55');
  } else if (candidateTitle.includes(searchTitle) || searchTitle.includes(candidateTitle)) {
    score += 35;
    console.log('[scoreCandidate] Partial match +35');
  }

  if (targetYear && candidateYear) {
    const delta = Math.abs(targetYear - candidateYear);
    if (delta === 0) score += 25;
    else if (delta === 1) score += 15;
    else if (delta === 2) score += 6;
    console.log('[scoreCandidate] Year delta:', delta, 'points added:', delta === 0 ? 25 : delta === 1 ? 15 : delta === 2 ? 6 : 0);
  }

  if (candidate.original_language === targetLanguage) score += 12;
  score += Math.min(Number(candidate.popularity || 0) / 10, 8);
  
  console.log('[scoreCandidate] Final score:', score);
  return Math.round(score);
}

async function tmdbFetchJson(pathname, params = {}) {
  const url = new URL(`${TMDB_API_BASE_URL}${pathname}`);
  url.searchParams.set('api_key', process.env.TMDB_API_KEY);
  url.searchParams.set('include_adult', 'false');

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`TMDb request failed with status ${response.status}`);
  }

  return response.json();
}

function buildImageUrl(path, size = 'w780') {
  return path ? `${TMDB_IMAGE_BASE_URL}/${size}${path}` : '';
}

async function fetchTmdbDetails(resultId, mediaType) {
  const appendToResponse = mediaType === 'tv' ? 'external_ids,content_ratings' : 'external_ids';
  const payload = await tmdbFetchJson(`/${mediaType}/${resultId}`, {
    append_to_response: appendToResponse,
  });

  const releaseDate = (payload.release_date || payload.first_air_date || '').trim();
  return {
    tmdbId: payload.id || null,
    title: payload.title || payload.name || '',
    imdbId: payload.external_ids?.imdb_id || '',
    originalTitle: payload.original_title || payload.original_name || '',
    overview: payload.overview || '',
    poster: buildImageUrl(payload.poster_path, 'w500'),
    backdrop: buildImageUrl(payload.backdrop_path, 'w1280'),
    genres: Array.isArray(payload.genres) ? payload.genres.map((entry) => entry.name).filter(Boolean) : [],
    genre: Array.isArray(payload.genres) ? payload.genres.map((entry) => entry.name).filter(Boolean).join(', ') : '',
    rating: payload.vote_average ? Number(payload.vote_average.toFixed(1)) : null,
    runtime: payload.runtime || null,
    originalLanguage: payload.original_language || '',
    year: Number(releaseDate.slice(0, 4)) || null,
    releaseDate,
    numberOfSeasons: Number(payload.number_of_seasons || 0),
  };
}

async function fetchTvSeasonEpisodes(tmdbId, seasonNumber) {
  const payload = await tmdbFetchJson(`/tv/${tmdbId}/season/${seasonNumber}`);
  const episodes = Array.isArray(payload.episodes) ? payload.episodes : [];

  return episodes.map((episode) => ({
    id: episode.id || `${tmdbId}-${seasonNumber}-${episode.episode_number}`,
    number: Number(episode.episode_number || 0),
    title: episode.name || '',
    description: episode.overview || '',
    runtime: Array.isArray(episode.runtime) ? episode.runtime[0] || null : episode.runtime || null,
    airDate: episode.air_date || '',
    still: buildImageUrl(episode.still_path, 'w780'),
  }));
}

async function fetchTvSeasons(tmdbId, seasonCount) {
  if (!Number.isFinite(seasonCount) || seasonCount <= 0) {
    return [];
  }

  const seasons = [];
  for (let seasonNumber = 1; seasonNumber <= seasonCount; seasonNumber += 1) {
    const episodes = await fetchTvSeasonEpisodes(tmdbId, seasonNumber);
    if (!episodes.length) {
      continue;
    }

    seasons.push({
      id: `${tmdbId}-season-${seasonNumber}`,
      number: seasonNumber,
      title: `Season ${seasonNumber}`,
      episodes,
    });
  }

  return seasons;
}

async function fetchMetadataFromOmdb(imdbId) {
  const url = new URL('https://www.omdbapi.com/');
  url.searchParams.set('i', imdbId);
  url.searchParams.set('apikey', process.env.OMDB_API_KEY);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`OMDB request failed with status ${response.status}`);
  }

  const data = await response.json();
  if (data.Response === 'False') {
    throw new Error(`OMDB error: ${data.Error}`);
  }

  const isSeries = data.Type === 'series';
  const omdbReleased = data.Released !== 'N/A' ? data.Released : '';
  return {
    type: isSeries ? 'series' : 'movie',
    title: data.Title || '',
    description: data.Plot !== 'N/A' ? data.Plot : '',
    year: parseInt(data.Year, 10) || null,
    releaseDate: omdbReleased,
    releasedAt: omdbReleased,
    genre: data.Genre !== 'N/A' ? data.Genre : '',
    genres: data.Genre !== 'N/A' ? data.Genre.split(',').map((g) => g.trim()) : [],
    poster: data.Poster !== 'N/A' ? data.Poster : '',
    backdrop: data.Poster !== 'N/A' ? data.Poster : '',
    tmdbId: null,
    imdbId: data.imdbID || imdbId,
    originalTitle: data.Title || '',
    originalLanguage: data.Language && data.Language !== 'N/A' ? data.Language.split(',')[0].trim() : 'en',
    rating: data.imdbRating !== 'N/A' ? parseFloat(data.imdbRating) : null,
    runtime: data.Runtime && data.Runtime !== 'N/A' ? parseInt(data.Runtime, 10) : null,
    seasons: [], // OMDB doesn't provide rich episode lists in the base call
    metadataStatus: 'matched',
    metadataProvider: 'omdb',
    metadataConfidence: 100,
    metadataUpdatedAt: new Date().toISOString(),
    metadataError: '',
    parsedTitle: cleanSearchTitle(data.Title),
  };
}

async function fetchMetadataByTmdbId(tmdbId, mediaType = 'movie') {
  if (!hasTmdbKey()) {
    throw new Error('TMDB_API_KEY is not configured.');
  }

  const normalizedType = mediaType === 'series' || mediaType === 'tv' ? 'tv' : 'movie';
  const details = await fetchTmdbDetails(tmdbId, normalizedType);
  const seasons = normalizedType === 'tv'
    ? await fetchTvSeasons(details.tmdbId, details.numberOfSeasons)
    : [];

  return {
    type: normalizedType === 'tv' ? 'series' : 'movie',
    title: details.title,
    description: details.overview,
    year: details.year,
    releaseDate: details.releaseDate,
    releasedAt: details.releaseDate,
    genre: details.genre,
    genres: details.genres,
    poster: details.poster,
    backdrop: details.backdrop,
    tmdbId: details.tmdbId,
    imdbId: details.imdbId,
    originalTitle: details.originalTitle,
    originalLanguage: details.originalLanguage,
    rating: details.rating,
    runtime: details.runtime,
    seasons,
    metadataStatus: 'matched',
    metadataProvider: 'tmdb',
    metadataConfidence: 100,
    metadataUpdatedAt: new Date().toISOString(),
    metadataError: '',
    parsedTitle: cleanSearchTitle(details.title),
  };
}

async function fetchMetadataByImdbId(imdbId, mediaType = 'movie') {
  const normalizedType = mediaType === 'series' || mediaType === 'tv' ? 'tv' : 'movie';

  // First try TMDb's find endpoint to get the TMDb ID
  if (hasTmdbKey()) {
    try {
      const found = await tmdbFetchJson(`/find/${imdbId}`, { external_source: 'imdb_id' });
      const results = found?.movie_results || found?.tv_results || [];
      const tmdbResults = normalizedType === 'tv' ? (found?.tv_results || []) : results;
      if (tmdbResults.length > 0) {
        const tmdbId = tmdbResults[0].id;
        return fetchMetadataByTmdbId(tmdbId, normalizedType);
      }
    } catch {}
  }

  // Fallback to OMDB
  if (hasOmdbKey()) {
    try {
      return await fetchMetadataFromOmdb(imdbId);
    } catch {}
  }

  const hint = !hasOmdbKey()
    ? ' TMDb does not have this title and OMDB_API_KEY is not configured. Add OMDB_API_KEY to server .env for IMDb fallback.'
    : '';
  throw Object.assign(new Error(`No metadata found for ${imdbId}. Try a different ID.${hint}`), { statusCode: 404 });
}

async function enrichItemWithMetadata(item) {
  const parsedTitle = cleanSearchTitle(item.title);

  // Skip re-enrichment for items already matched with complete metadata
  if (
    item.metadataStatus === 'matched' &&
    isGoodUrl(item.poster) &&
    item.description &&
    item.description.trim().length > 0
  ) {
    return { ...item, parsedTitle };
  }

  // If OMDB key is available and IMDb ID is provided, try OMDB first for items not found on TMDb
  if (item.imdbId && hasOmdbKey()) {
    try {
      const omdbData = await fetchMetadataFromOmdb(item.imdbId);
      return {
        ...item,
        description: item.description || omdbData.description,
        poster: isGoodUrl(item.poster) ? item.poster : omdbData.poster,
        backdrop: isGoodUrl(item.backdrop) ? item.backdrop : omdbData.backdrop,
        genre: item.genre || omdbData.genre,
        genres: Array.isArray(item.genres) && item.genres.length ? item.genres : omdbData.genres,
        rating: item.rating || omdbData.rating,
        runtime: item.runtime || omdbData.runtime,
        imdbId: omdbData.imdbId,
        title: omdbData.title,
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
    const mediaType = item.type === 'series' ? 'tv' : 'movie';

    // Also try to pull year from raw title if item.year is missing
    const rawYear = item.year || extractYearFromRawTitle(item.title);
    const enrichedItem = rawYear && !item.year ? { ...item, year: rawYear } : item;

    // Strategy 1: search with cleaned title + year filter
    let results = [];
    let response = await tmdbFetchJson(`/search/${mediaType}`, {
      query: parsedTitle,
      year: mediaType === 'movie' ? rawYear : undefined,
      first_air_date_year: mediaType === 'tv' ? rawYear : undefined,
    });
    results = Array.isArray(response.results) ? response.results : [];

    // Strategy 2: if no results with year, retry WITHOUT year filter
    if (!results.length && rawYear) {
      response = await tmdbFetchJson(`/search/${mediaType}`, { query: parsedTitle });
      results = Array.isArray(response.results) ? response.results : [];
    }

    // Strategy 3: if still no results, retry with core title (text before first paren/bracket)
    if (!results.length) {
      const coreTitle = extractCoreTitle(item.title);
      if (coreTitle && coreTitle !== parsedTitle) {
        response = await tmdbFetchJson(`/search/${mediaType}`, { query: coreTitle });
        results = Array.isArray(response.results) ? response.results : [];
      }
    }

    // Strategy 4: try multi-search as a last resort
    if (!results.length) {
      const coreTitle = extractCoreTitle(item.title) || parsedTitle;
      const multiResp = await tmdbFetchJson('/search/multi', { query: coreTitle });
      const multiResults = Array.isArray(multiResp.results) ? multiResp.results : [];
      results = multiResults.filter((r) => r.media_type === mediaType || r.media_type === (mediaType === 'movie' ? 'movie' : 'tv'));
    }

    // Strategy 5: Try searching TMDb with language=bn-BD or language=hi-IN if language is Bengali/Hindi
    if (!results.length) {
      const lang = inferOriginalLanguage(item);
      if (lang === 'bn' || lang === 'hi') {
        try {
          const langResp = await tmdbFetchJson(`/search/${mediaType}`, {
            query: parsedTitle,
            language: lang === 'bn' ? 'bn-BD' : 'hi-IN'
          });
          results = Array.isArray(langResp.results) ? langResp.results : [];
        } catch {}
      }
    }

    // Strategy 6: Try searching OMDB by title if TMDb found no results and OMDB key is set
    if (!results.length && hasOmdbKey()) {
      try {
        const omdbSearchUrl = new URL('https://www.omdbapi.com/');
        omdbSearchUrl.searchParams.set('s', parsedTitle);
        if (rawYear) omdbSearchUrl.searchParams.set('y', String(rawYear));
        omdbSearchUrl.searchParams.set('apikey', process.env.OMDB_API_KEY);
        const omdbRes = await fetch(omdbSearchUrl);
        if (omdbRes.ok) {
          const omdbData = await omdbRes.json();
          if (omdbData.Response === 'True' && Array.isArray(omdbData.Search) && omdbData.Search.length > 0) {
            const topMatch = omdbData.Search[0];
            if (topMatch.imdbID) {
              const fullOmdb = await fetchMetadataFromOmdb(topMatch.imdbID);
              return {
                ...enrichedItem,
                ...fullOmdb,
                metadataStatus: 'matched',
                metadataProvider: 'omdb',
                metadataConfidence: 85,
                metadataUpdatedAt: new Date().toISOString()
              };
            }
          }
        }
      } catch {}
    }

    // Strategy 7: Try searching with parent folder name from sourcePath if file title is non-English or failed
    if (!results.length && item.sourcePath) {
      const pathParts = String(item.sourcePath).split(/[/\\]/).filter(Boolean);
      if (pathParts.length >= 2) {
        const parentFolder = pathParts[pathParts.length - 2];
        const cleanParent = cleanSearchTitle(parentFolder);
        // Skip if parent folder is a year-only name or a category/label name
        const isYearFolder = /^\d{4}$/.test(parentFolder.trim());
        const isCategoryFolder = /\b(movies|series|dubbed|hindi|bangla|english|tamil|telugu|malayalam|korean|japanese|animation|3d)\b/i.test(parentFolder);
        if (cleanParent && cleanParent !== parsedTitle && !isYearFolder && !isCategoryFolder) {
          try {
            const parentResp = await tmdbFetchJson(`/search/${mediaType}`, { query: cleanParent });
            results = Array.isArray(parentResp.results) ? parentResp.results : [];
          } catch {}
        }
      }
    }

    // Strategy 8: Try colon/number pattern variations (e.g., "13 14" → "13:14", "13-14")
    if (!results.length && /\b\d+\s+\d+\b/.test(parsedTitle)) {
      try {
        const colonVariation = parsedTitle.replace(/\b(\d+)\s+(\d+)\b/g, '$1:$2');
        if (colonVariation !== parsedTitle) {
          const colonResp = await tmdbFetchJson(`/search/${mediaType}`, { query: colonVariation });
          results = Array.isArray(colonResp.results) ? colonResp.results : [];
        }
      } catch {}
    }

    // Strategy 9: Try dash/number pattern variations (e.g., "13 14" → "13-14")
    if (!results.length && /\b\d+\s+\d+\b/.test(parsedTitle)) {
      try {
        const dashVariation = parsedTitle.replace(/\b(\d+)\s+(\d+)\b/g, '$1-$2');
        if (dashVariation !== parsedTitle) {
          const dashResp = await tmdbFetchJson(`/search/${mediaType}`, { query: dashVariation });
          results = Array.isArray(dashResp.results) ? dashResp.results : [];
        }
      } catch {}
    }

    if (!results.length) {
      return {
        ...enrichedItem,
        metadataStatus: 'not_found',
        metadataProvider: 'tmdb',
        metadataConfidence: 0,
        metadataUpdatedAt: new Date().toISOString(),
        metadataError: 'No TMDb match found after multiple search strategies.',
        parsedTitle,
      };
    }

    const rankedResults = results
      .map((candidate) => ({ candidate, score: scoreCandidate(candidate, enrichedItem) }))
      .sort((left, right) => right.score - left.score);
    const bestMatch = rankedResults[0];
    const candidateMediaType = bestMatch.candidate.media_type || mediaType;
    const resolvedMediaType = (candidateMediaType === 'tv' || candidateMediaType === 'series') ? 'tv' : 'movie';
    const details = await fetchTmdbDetails(bestMatch.candidate.id, resolvedMediaType);
    const seasons = resolvedMediaType === 'tv'
      ? await fetchTvSeasons(details.tmdbId, details.numberOfSeasons)
      : [];
    const confidence = Math.max(0, Math.min(bestMatch.score, 100));

    const langCode = String(details.originalLanguage || '').toLowerCase();
    const languageMap = {
      hi: 'Hindi',
      bn: 'Bengali',
      en: 'English',
      ta: 'South Indian',
      te: 'South Indian',
      ml: 'South Indian',
      kn: 'South Indian'
    };
    const resolvedLanguage = languageMap[langCode] || enrichedItem.language || 'English';

    const applyTmdb = confidence >= 40;
    return {
      ...enrichedItem,
      description: enrichedItem.description || (applyTmdb ? details.overview : ''),
      poster: isGoodUrl(enrichedItem.poster) ? enrichedItem.poster : (applyTmdb ? details.poster : ''),
      backdrop: isGoodUrl(enrichedItem.backdrop) ? enrichedItem.backdrop : (applyTmdb ? (details.backdrop || details.poster) : ''),
      genre: applyTmdb ? (enrichedItem.genre || details.genre) : enrichedItem.genre,
      genres: applyTmdb ? (Array.isArray(enrichedItem.genres) && enrichedItem.genres.length ? enrichedItem.genres : details.genres) : enrichedItem.genres,
      rating: enrichedItem.rating || details.rating,
      runtime: enrichedItem.runtime || details.runtime,
      seasons: enrichedItem.type === 'series' && seasons.length ? mergeEpisodeMetadata(enrichedItem.seasons || [], seasons) : enrichedItem.seasons,
      tmdbId: applyTmdb ? details.tmdbId : null,
      imdbId: applyTmdb ? details.imdbId : null,
      title: confidence >= 60 ? details.title : enrichedItem.title,
      originalTitle: applyTmdb ? details.originalTitle : '',
      originalLanguage: applyTmdb ? details.originalLanguage : '',
      language: resolvedLanguage,
      // If TMDb match confidence is 70% or greater, auto-publish directly to website
      status: confidence >= 70 ? 'published' : 'draft',
      metadataStatus: confidence >= 25 ? 'matched' : (applyTmdb ? 'needs_review' : 'not_found'),
      metadataProvider: 'tmdb',
      metadataConfidence: confidence,
      metadataUpdatedAt: new Date().toISOString(),
      metadataError: '',
      parsedTitle,
    };
  } catch (error) {
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

function mergeEpisodeMetadata(existingSeasons = [], tmdbSeasons = []) {
  return (existingSeasons || []).map((season, seasonIndex) => {
    const seasonNumber = Number(season.number || season.id || seasonIndex + 1);
    const tmdbSeason = tmdbSeasons.find((candidate) => Number(candidate.number) === seasonNumber);

    if (!tmdbSeason) {
      return season;
    }

    return {
      ...season,
      title: season.title || tmdbSeason.title || `Season ${seasonNumber}`,
      episodes: (season.episodes || []).map((episode, episodeIndex) => {
        const episodeNumber = Number(episode.number || episode.id || episodeIndex + 1);
        const tmdbEpisode = (tmdbSeason.episodes || []).find((candidate) => Number(candidate.number) === episodeNumber);

        if (!tmdbEpisode) {
          return episode;
        }

        return {
          ...episode,
          title: tmdbEpisode.title || episode.title,
          description: tmdbEpisode.description || episode.description,
          runtime: episode.runtime || tmdbEpisode.runtime || null,
          runtimeMinutes: episode.runtimeMinutes || tmdbEpisode.runtime || null,
          airDate: episode.airDate || tmdbEpisode.airDate || '',
          still: episode.still || tmdbEpisode.still || '',
        };
      }),
    };
  });
}

module.exports = {
  cleanSearchTitle,
  enrichItemWithMetadata,
  fetchMetadataByTmdbId,
  fetchMetadataByImdbId,
  fetchMetadataFromOmdb,
  hasTmdbKey,
  hasOmdbKey,
  inferOriginalLanguage,
  detectLanguageFromText,
};
