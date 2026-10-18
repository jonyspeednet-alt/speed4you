/**
 * End-to-end enrichment tests with a mocked TMDb.
 *
 * These exercise the whole path — search strategies, degraded fallback windows,
 * the acceptance guard, scoring and the draft→published gate — using the real
 * production filenames that used to stay stuck as drafts.
 */
const test = require('node:test');
const assert = require('node:assert/strict');

const FALLBACK_FIXTURES = {
  // query (lowercased) -> TMDb /search/<media> results
  dumbo: [
    { id: 329996, title: 'Dumbo', release_date: '2019-03-29', poster_path: '/dumbo.jpg', backdrop_path: '/dumbo-b.jpg', overview: 'A young elephant with oversized ears learns to fly.', popularity: 45, original_language: 'en' },
  ],
  prahaar: [
    { id: 1081010, title: 'Prahaar: The Untold Story of Ujjwal Nikam', release_date: '2026-02-06', poster_path: '/prahaar.jpg', backdrop_path: '/prahaar-b.jpg', overview: 'The story of public prosecutor Ujjwal Nikam.', popularity: 30, original_language: 'hi' },
  ],
  // Baits: real films TMDb returns for the short junk windows.
  movie: [
    { id: 9001, title: 'Movie 43', release_date: '2013-01-25', poster_path: '/m43.jpg', overview: 'A series of interconnected short films.', popularity: 20, original_language: 'en' },
  ],
  delhi: [
    { id: 9002, title: 'Delhi Belly', release_date: '2011-07-01', poster_path: '/db.jpg', overview: 'Three friends get tangled with a crime boss.', popularity: 25, original_language: 'hi' },
  ],
  // The real production false positive: a 2012 documentary answered the
  // four-letter window "Demo" of "LG 3D Demo 2012".
  demo: [
    { id: 505135, title: 'Demo Dummies', release_date: '2012-01-01', poster_path: '/dd.jpg', overview: 'An in depth look at the insanity of hit-to-pass racing.', popularity: 5, original_language: 'en' },
  ],
};

const DETAIL_FIXTURES = {
  329996: { id: 329996, title: 'Dumbo', original_title: 'Dumbo', overview: 'A young elephant with oversized ears learns to fly.', poster_path: '/dumbo.jpg', backdrop_path: '/dumbo-b.jpg', release_date: '2019-03-29', genres: [{ name: 'Family' }], vote_average: 6.9, runtime: 112, original_language: 'en', popularity: 45, external_ids: { imdb_id: 'tt3861390' } },
  1081010: { id: 1081010, title: 'Prahaar: The Untold Story of Ujjwal Nikam', original_title: 'Prahaar', overview: 'The story of public prosecutor Ujjwal Nikam.', poster_path: '/prahaar.jpg', backdrop_path: '/prahaar-b.jpg', release_date: '2026-02-06', genres: [{ name: 'Drama' }], vote_average: 7.1, runtime: 140, original_language: 'hi', popularity: 30, external_ids: { imdb_id: 'tt1081010' } },
  9001: { id: 9001, title: 'Movie 43', original_title: 'Movie 43', overview: 'A series of interconnected short films.', poster_path: '/m43.jpg', release_date: '2013-01-25', genres: [], vote_average: 4.5, runtime: 94, original_language: 'en', popularity: 20, external_ids: { imdb_id: 'tt1706620' } },
  9002: { id: 9002, title: 'Delhi Belly', original_title: 'दिल्ली बेली', overview: 'Three friends get tangled with a crime boss.', poster_path: '/db.jpg', release_date: '2011-07-01', genres: [], vote_average: 7, runtime: 96, original_language: 'hi', popularity: 25, external_ids: { imdb_id: 'tt1934231' } },
  505135: { id: 505135, title: 'Demo Dummies', original_title: 'Demo Dummies', overview: 'An in depth look at the insanity of hit-to-pass racing.', poster_path: '/dd.jpg', release_date: '2012-01-01', genres: [{ name: 'Documentary' }], vote_average: 6, runtime: 88, original_language: 'en', popularity: 5, external_ids: { imdb_id: 'tt1884287' } },
};

const requestedQueries = [];
const originalFetch = global.fetch;

function jsonResponse(payload) {
  return { ok: true, status: 200, json: async () => payload };
}

global.fetch = async (input) => {
  const url = new URL(String(input));
  const pathname = url.pathname.replace(/^\/3/, '');

  if (pathname === '/search/movie' || pathname === '/search/tv') {
    const query = String(url.searchParams.get('query') || '').toLowerCase().trim();
    requestedQueries.push(query);
    return jsonResponse({ results: FALLBACK_FIXTURES[query] || [] });
  }

  const detailsMatch = pathname.match(/^\/(movie|tv)\/(\d+)$/);
  if (detailsMatch) {
    const details = DETAIL_FIXTURES[Number(detailsMatch[2])];
    return details ? jsonResponse(details) : jsonResponse({});
  }

  return jsonResponse({ results: [], episodes: [] });
};

process.env.TMDB_API_KEY = 'test-key';
process.env.SCANNER_AUTO_PUBLISH_CONFIDENCE = '60';

const { enrichItemWithMetadata, clearMetadataCache } = require('../src/services/scanner-enhanced-metadata');

function draftItem(id, title, sourcePath, year) {
  return { id, title, type: 'movie', status: 'draft', year, sourcePath, poster: '', backdrop: '', description: '', seasons: [], tags: [] };
}

test.beforeEach(() => {
  requestedQueries.length = 0;
  clearMetadataCache();
});

test.after(() => { global.fetch = originalFetch; });

test('noisy Hindi-dub filename is matched and published end to end', async () => {
  const item = draftItem(35246, 'Dumbo 2019 Hindi Dubbed Blu Ray', '/var/www/html/Hindi_Dubbed_Movies/2019/Dumbo (2019) Hindi Dubbed 720p BluRay x264/Dumbo Dubbed (2019).mkv', 2019);

  const result = await enrichItemWithMetadata(item);

  assert.equal(result.metadataStatus, 'matched');
  assert.equal(result.status, 'published');
  assert.equal(result.tmdbId, 329996);
  assert.equal(result.title, 'Dumbo');
  assert.match(result.poster, /^https:\/\/image\.tmdb\.org/);
  assert.ok(result.metadataConfidence >= 60);
  assert.ok(requestedQueries.includes('dumbo'), `queries tried: ${JSON.stringify(requestedQueries)}`);
});

test('site-brand prefixed filename is recovered through the fallback windows', async () => {
  const item = draftItem(35404, 'Movie Link BD com Prahaar 2026 Hindi HDTC', '/var/www/html/Requested/Movies/MovieLinkBD.com - Prahaar.2026.1080p.Hindi.AAC.HDTC.h264.mkv', 2026);

  const result = await enrichItemWithMetadata(item);

  assert.equal(result.metadataStatus, 'matched');
  assert.equal(result.status, 'published');
  assert.equal(result.tmdbId, 1081010);
  // The query that produced the hit was the degraded window, not the junk title.
  assert.ok(requestedQueries.includes('prahaar'), `queries tried: ${JSON.stringify(requestedQueries)}`);
  assert.ok(requestedQueries.includes('movie link prahaar'), 'the full cleaned title is tried first');
});

test('a degraded window that only matches a wrong-year film does NOT publish', async () => {
  // "Delhi" is a window of this title and TMDb does return "Delhi Belly" (2011)
  // for it; the guard must reject it because the item year is 2026.
  const item = draftItem(35368, 'Delhi vs Mumbai 2026', '/var/www/html/Requested/Series/Delhi vs Mumbai (2026)', 2026);

  const result = await enrichItemWithMetadata(item);

  assert.equal(result.metadataStatus, 'not_found');
  assert.equal(result.status, 'draft');
  assert.equal(result.tmdbId, null);
  assert.ok(requestedQueries.includes('delhi'), 'the risky window really was tried');
});

test('a junk window is never used when the item has no year to corroborate it', async () => {
  const item = draftItem(9999, 'Movie Link siccin', '/var/www/html/Requested/Movies/MovieLinkBD.com - siccin.mkv', null);

  const result = await enrichItemWithMetadata(item);

  assert.equal(result.metadataStatus, 'not_found');
  assert.equal(result.status, 'draft');
  // Only the primary cleaned title is attempted; degraded windows stay off.
  assert.deepEqual(requestedQueries, ['movie link siccin']);
});

test('a short single-word window cannot invent a match for a non-film file', async () => {
  // Production regression: this file was published as the 2012 documentary
  // "Demo Dummies" because the window "Demo" happened to be dated 2012.
  const item = draftItem(35253, 'LG 3D Demo 2012', '/var/www/html/3D_Movies/3D/LG 3D Demo (2012)', 2012);

  const result = await enrichItemWithMetadata(item);

  assert.equal(result.metadataStatus, 'not_found');
  assert.equal(result.status, 'draft');
  assert.equal(result.tmdbId || null, null);
  assert.equal(result.title, 'LG 3D Demo 2012');
  assert.ok(!requestedQueries.includes('demo'), `queries tried: ${JSON.stringify(requestedQueries)}`);
});
