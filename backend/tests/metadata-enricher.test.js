const test = require('node:test');
const assert = require('node:assert/strict');

const {
  cleanSearchTitle,
  extractYearFromRawTitle,
  isPlausibleReleaseYear,
  extractAkaAlternative,
  buildTrimmedQueries,
  matchesTrimmedQuery,
} = require('../src/services/metadata-enricher');
const { cleanTitle } = require('../src/services/scanner-series-parser');

test('removes common season and episode tokens from series search titles', () => {
  const result = cleanSearchTitle('Dark.Complete.Series.S01-S03.1080p.BluRay');

  assert.equal(result, 'Dark');
});

test('removes year and episode tokens from noisy series filenames', () => {
  const result = cleanSearchTitle('Money.Heist.2017.S01E01.720p.NF.WEB-DL');

  assert.equal(result, 'Money Heist');
});

test('removes common release-group and audio noise from movie search titles', () => {
  const result = cleanSearchTitle('Mortal.Kombat.II.2026.Hindi.5.1.English.5.1.HDHub4u.Ms.mkv');

  assert.equal(result, 'Mortal Kombat II');
});

test('uses a plausible release year instead of a codec-like future number', () => {
  assert.equal(isPlausibleReleaseYear(2064), false);
  assert.equal(extractYearFromRawTitle('Kaliyugam 2064 2025 AMZN'), 2025);
});

// --- Regression tests for the drafts that were stuck in "not_found" ---------
// Every case below was a real catalog item that TMDb could not be asked about
// because release-tag noise survived title cleaning.

test('strips audio-provenance tags left behind after the language word', () => {
  assert.equal(cleanSearchTitle('Dumbo 2019 Hindi Dubbed Blu Ray'), 'Dumbo');
  assert.equal(cleanSearchTitle('Annabelle Comes Home 2019 Hindi Dubbed Blu Ray'), 'Annabelle Comes Home');
  assert.equal(cleanSearchTitle('Falling Inn Love 2019 Hindi Dubbed'), 'Falling Inn Love');
  assert.equal(cleanSearchTitle('Use Me 2019 Hindi Dub Audio Moviez Flix'), 'Use Me');
});

test('strips disc/source leftovers', () => {
  assert.equal(cleanSearchTitle('Shaft 2019 Blu Ray Audio Hindi DD 5 1 English BD 5 1'), 'Shaft');
  assert.equal(cleanSearchTitle('S P Chauhan 2019 DVD'), 'S P Chauhan');
});

test('leaves a dangling resolution number to the fallback windows, not to a global rule', () => {
  // "\b720\b" must not be stripped globally, otherwise the real title
  // "720 Degrees" would collapse to "Degrees".
  assert.equal(cleanSearchTitle('720 Degrees'), '720 Degrees');

  // The dangling number is instead removed by the trimming windows.
  const windows = buildTrimmedQueries('Movie Link BD com siccin 2026 1080');
  assert.ok(windows.includes('siccin'), `expected a window for "siccin", got ${JSON.stringify(windows)}`);
});

test('strips release-site brands including a split domain', () => {
  assert.equal(
    cleanSearchTitle('Movie Link BD com Prahaar 2026 Hindi HDTC'),
    'Movie Link Prahaar',
    'the "BD com" half of MovieLinkBD.com must not stay in the query',
  );
  assert.ok(!cleanSearchTitle('Once Upon a Time In Hollywood 2019 Hindi Audio Moviez Flix Co').includes('Flix'));
});

test('does not strip legitimate words that look like release tags', () => {
  assert.equal(cleanSearchTitle("Charlotte's Web"), "Charlotte's Web");
  assert.equal(cleanSearchTitle('The Net'), 'The Net');
  assert.equal(cleanSearchTitle('Dan in Real Life'), 'Dan in Real Life');
  assert.equal(cleanSearchTitle('Dublin'), 'Dublin');
  // "com" is only a domain leftover, never a word inside a real title.
  assert.equal(cleanSearchTitle('Fear Dot Com'), 'Fear Dot Com');
  assert.equal(cleanSearchTitle('Kadhal Dot Com'), 'Kadhal Dot Com');
});

test('splits "AKA" release names and exposes the alternative title', () => {
  assert.equal(cleanSearchTitle('El Hoyo AKA The Platform SPA 2019'), 'El Hoyo');
  assert.ok(extractAkaAlternative('El Hoyo AKA The Platform SPA (2019)').startsWith('The Platform'));
  // The alternative name is trimmed as well, so the stray "SPA" tag still clears.
  assert.ok(buildTrimmedQueries(extractAkaAlternative('El Hoyo AKA The Platform SPA (2019)')).includes('The Platform'));
});

test('offers degraded fallback queries that can still reach the real title', () => {
  const windows = buildTrimmedQueries('Movie Link BD com Prahaar 2026 Hindi HDTC');
  assert.ok(windows.includes('Prahaar'));

  // The real title must be tried before the generic leading token, so a short
  // junk window cannot win the search first.
  assert.ok(windows.includes('Movie Link'));
  assert.ok(windows.indexOf('Prahaar') < windows.indexOf('Movie'),
    `expected Prahaar before Movie, got ${JSON.stringify(windows)}`);

  // Windows can drop tokens from both sides at once.
  assert.ok(buildTrimmedQueries('Movie Link siccin 1080').includes('siccin'));

  assert.ok(buildTrimmedQueries('Once Upon a Time In Hollywood 2019 Hindi Audio Moviez Flix Co')
    .includes('Once Upon a Time In Hollywood'));
});

test('fallback results are only accepted on a title prefix plus year match', () => {
  const itemYear = 2026;

  assert.equal(matchesTrimmedQuery({ title: 'Prahaar: The Untold Story of Ujjwal Nikam', release_date: '2026-01-01' }, 'Prahaar', itemYear), true);
  assert.equal(matchesTrimmedQuery({ title: 'Dumbo', release_date: '2019-03-29' }, 'Dumbo', 2019), true);

  // An unrelated film TMDb returns for a degraded query must be rejected.
  assert.equal(matchesTrimmedQuery({ title: 'Movie 43', release_date: '2013-01-25' }, 'Movie', itemYear), false);
  assert.equal(matchesTrimmedQuery({ title: 'Jailer', release_date: '2023-08-10' }, 'The Jailer', itemYear), false);
  assert.equal(matchesTrimmedQuery({ title: 'Dumbo', release_date: '1941-10-31' }, 'Dumbo', 2019), false);
  assert.equal(matchesTrimmedQuery({ title: 'Mumbai Xpress', release_date: '2004-04-30' }, 'vs Mumbai', itemYear), false);

  // Without a known year a degraded query has no corroboration at all.
  assert.equal(matchesTrimmedQuery({ title: 'Movie 43', release_date: '2013-01-25' }, 'Movie', null), false);
  // An undated candidate cannot corroborate a year either.
  assert.equal(matchesTrimmedQuery({ title: 'Movie' }, 'Movie', itemYear), false);
});

test('scanner title cleaning keeps Indic combining marks (matras/virama)', () => {
  // Item 35372 was stored as "మ జర" because \p{M} was treated as a special char.
  assert.equal(cleanTitle('మేజర్ (2022).mkv', 'movie'), 'మేజర్');
  assert.equal(cleanTitle('एक विलेन रिटर्न्स (2022)', 'movie'), 'एक विलेन रिटर्न्स');
});
