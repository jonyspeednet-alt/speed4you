const test = require('node:test');
const assert = require('node:assert/strict');

const { cleanSearchTitle, extractYearFromRawTitle, isPlausibleReleaseYear } = require('../src/services/metadata-enricher');

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
