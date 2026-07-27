#!/usr/bin/env node
/**
 * Fix script for item 31614 (Rangbaaz Phirse 2019 Hindi Complete)
 * 
 * Usage: node scripts/fix-rangbaaz-phirse.js
 * 
 * This script:
 * 1. Connects to the database
 * 2. Fetches item 31614
 * 3. Cleans title properly (strips "Complete", "Hindi", "2019")
 * 4. Searches TMDb with cleaned title "Rangbaaz Phirse"
 * 5. Fetches full metadata (poster, backdrop, description, genres, rating, episodes)
 * 6. Updates the item in database
 * 7. Sets status to "published"
 */

require('dotenv').config();
const { db, ensureContentStore } = require('../src/data/store/base');
const { updateItem, getItemById } = require('../src/data/store/content');

const TMDB_API_BASE = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

const ITEM_ID = 31614;

async function tmdbFetch(pathname, params = {}) {
  const url = new URL(`${TMDB_API_BASE}${pathname}`);
  url.searchParams.set('api_key', process.env.TMDB_API_KEY);
  url.searchParams.set('include_adult', 'false');
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`TMDb ${res.status}: ${res.statusText}`);
  return res.json();
}

function buildImg(path, size = 'w780') {
  return path ? `${TMDB_IMAGE_BASE}/${size}${path}` : '';
}

async function main() {
  console.log(`=== Fixing item ${ITEM_ID} (Rangbaaz Phirse) ===\n`);

  // 1. Ensure DB connected
  await ensureContentStore();
  console.log('[1/5] Database connected');

  // 2. Fetch current item
  const item = await getItemById(ITEM_ID);
  if (!item) {
    console.error('ERROR: Item not found in database');
    process.exit(1);
  }
  console.log(`[2/5] Current title: "${item.title}"`);
  console.log(`       Current status: ${item.status}`);
  console.log(`       Current metadataStatus: ${item.metadataStatus}`);

  // 3. Search TMDb
  console.log('\n[3/5] Searching TMDb for "Rangbaaz Phirse"...');
  const searchResult = await tmdbFetch('/search/tv', {
    query: 'Rangbaaz Phirse',
    first_air_date_year: 2019,
  });

  let match = null;
  if (searchResult.results && searchResult.results.length > 0) {
    // Find best match
    match = searchResult.results.find(r => 
      r.name && r.name.toLowerCase().includes('rangbaaz phirse')
    ) || searchResult.results[0];
    console.log(`       Found: "${match.name}" (ID: ${match.id}, Year: ${(match.first_air_date || '').slice(0,4)})`);
  } else {
    // Try without year filter
    const retry = await tmdbFetch('/search/tv', { query: 'Rangbaaz Phirse' });
    if (retry.results && retry.results.length > 0) {
      match = retry.results[0];
      console.log(`       Found (no year filter): "${match.name}" (ID: ${match.id})`);
    }
  }

  if (!match) {
    console.error('ERROR: No TMDb match found');
    process.exit(1);
  }

  // 4. Fetch full details
  console.log('\n[4/5] Fetching TMDb details...');
  const details = await tmdbFetch(`/tv/${match.id}`, {
    append_to_response: 'external_ids,content_ratings',
  });

  const poster = buildImg(details.poster_path, 'w500');
  const backdrop = buildImg(details.backdrop_path, 'w1280');
  const genres = (details.genres || []).map(g => g.name).filter(Boolean);
  const rating = details.vote_average ? Number(details.vote_average.toFixed(1)) : null;
  const imdbId = details.external_ids?.imdb_id || '';
  const langCode = (details.original_language || '').toLowerCase();
  const languageMap = { hi: 'Hindi', bn: 'Bengali', en: 'English' };
  const language = languageMap[langCode] || 'Hindi';
  const year = Number((details.first_air_date || '').slice(0, 4)) || 2019;
  const numberOfSeasons = Number(details.number_of_seasons || 1);

  console.log(`       Title: ${details.name}`);
  console.log(`       Poster: ${poster ? 'YES' : 'NO'}`);
  console.log(`       Backdrop: ${backdrop ? 'YES' : 'NO'}`);
  console.log(`       Genres: ${genres.join(', ')}`);
  console.log(`       Rating: ${rating}`);
  console.log(`       Seasons: ${numberOfSeasons}`);
  console.log(`       Language: ${language}`);

  // 5. Fetch season 1 episodes
  let tmdbEpisodes = [];
  try {
    const seasonData = await tmdbFetch(`/tv/${match.id}/season/1`);
    tmdbEpisodes = (seasonData.episodes || []).map(ep => ({
      id: ep.id || `${match.id}-1-${ep.episode_number}`,
      number: ep.episode_number,
      title: ep.name || '',
      description: ep.overview || '',
      runtime: ep.runtime || null,
      airDate: ep.air_date || '',
      still: buildImg(ep.still_path, 'w780'),
    }));
    console.log(`       Season 1 episodes: ${tmdbEpisodes.length}`);
  } catch (err) {
    console.log(`       Could not fetch season data: ${err.message}`);
  }

  // 6. Build updated item
  const existingSeasons = item.seasons || [];
  const mergedSeasons = existingSeasons.map((season, idx) => {
    const tmdbSeason = { number: 1, title: details.name || `Season 1`, episodes: tmdbEpisodes };
    return {
      ...season,
      title: season.title || tmdbSeason.title,
      episodes: (season.episodes || []).map((ep, epIdx) => {
        const epNum = ep.number || epIdx + 1;
        const tmdbEp = tmdbEpisodes.find(e => e.number === epNum);
        if (!tmdbEp) return ep;
        return {
          ...ep,
          title: tmdbEp.title || ep.title || `Episode ${epNum}`,
          description: tmdbEp.description || ep.description || details.overview || '',
          runtime: ep.runtime || tmdbEp.runtime || null,
          runtimeMinutes: ep.runtimeMinutes || tmdbEp.runtime || null,
          airDate: ep.airDate || tmdbEp.airDate || '',
          still: ep.still || tmdbEp.still || '',
        };
      }),
    };
  });

  const updated = {
    ...item,
    title: details.name || item.title,
    description: item.description || details.overview || '',
    poster: item.poster || poster,
    backdrop: item.backdrop || backdrop,
    genre: item.genre || genres.join(', '),
    genres: Array.isArray(item.genres) && item.genres.length ? item.genres : genres,
    rating: item.rating || rating,
    language: language,
    originalLanguage: details.original_language || '',
    originalTitle: details.original_name || '',
    year: year,
    tmdbId: match.id,
    imdbId: imdbId,
    seasons: mergedSeasons.length ? mergedSeasons : existingSeasons,
    status: 'published',
    metadataStatus: 'matched',
    metadataProvider: 'tmdb',
    metadataConfidence: 95,
    metadataError: '',
    metadataUpdatedAt: new Date().toISOString(),
    releasedAt: details.first_air_date || item.releasedAt || '',
    seasonCount: numberOfSeasons,
    episodeCount: tmdbEpisodes.length || item.episodeCount || 0,
  };

  // 7. Update in database
  console.log('\n[5/5] Updating database...');
  await updateItem(ITEM_ID, updated);
  console.log('       DONE!');

  // Verify
  const verify = await getItemById(ITEM_ID);
  console.log(`\n=== Verification ===`);
  console.log(`Title: ${verify.title}`);
  console.log(`Status: ${verify.status}`);
  console.log(`Poster: ${verify.poster ? 'YES' : 'NO'}`);
  console.log(`Backdrop: ${verify.backdrop ? 'YES' : 'NO'}`);
  console.log(`Description: ${(verify.description || '').slice(0, 100)}...`);
  console.log(`Genres: ${(verify.genres || []).join(', ')}`);
  console.log(`Rating: ${verify.rating}`);
  console.log(`Language: ${verify.language}`);
  console.log(`Metadata: ${verify.metadataStatus} (confidence: ${verify.metadataConfidence})`);

  await db.getPool().then(p => p.end());
  console.log('\nDone! Item 31614 is now published with full metadata.');
}

main().catch(err => {
  console.error('FATAL:', err.message);
  process.exit(1);
});
