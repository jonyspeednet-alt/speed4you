const test = require('node:test');
const assert = require('node:assert/strict');

const { cleanSearchTitle } = require('../src/services/metadata-enricher');

test('removes common season and episode tokens from series search titles', () => {
  const result = cleanSearchTitle('Dark.Complete.Series.S01-S03.1080p.BluRay');

  assert.equal(result, 'Dark');
});

test('removes year and episode tokens from noisy series filenames', () => {
  const result = cleanSearchTitle('Money.Heist.2017.S01E01.720p.NF.WEB-DL');

  assert.equal(result, 'Money Heist NF');
});
