const test = require('node:test');
const assert = require('node:assert/strict');

const {
  clearAllCache,
  fetchWithRateLimitAndCache,
  getCachedMetadata,
  setCachedMetadata,
} = require('../src/services/scanner-cache');
const { retryAsync } = require('../src/services/scanner-error-handler');

test('metadata cache handles Windows-unsafe characters in cache keys', () => {
  clearAllCache();
  const params = { query: 'Movie: Name / Test', year: 2024, empty: '' };
  const payload = { ok: true, title: 'Movie Name Test' };

  setCachedMetadata('tmdb', params, payload, 60_000);
  assert.deepEqual(getCachedMetadata('tmdb', params), payload);

  clearAllCache();
});

test('fetchWithRateLimitAndCache reuses cached metadata results', async () => {
  clearAllCache();
  let calls = 0;
  const params = { query: 'Cached Movie', mediaType: 'movie' };

  const first = await fetchWithRateLimitAndCache('tmdb', async () => {
    calls += 1;
    return { title: 'Cached Movie' };
  }, params, 60_000);

  const second = await fetchWithRateLimitAndCache('tmdb', async () => {
    calls += 1;
    return { title: 'Should Not Be Used' };
  }, params, 60_000);

  assert.equal(first.fromCache, false);
  assert.equal(second.fromCache, true);
  assert.equal(calls, 1);
  assert.deepEqual(second.data, { title: 'Cached Movie' });

  clearAllCache();
});

test('retryAsync retries transient failures', async () => {
  let attempts = 0;

  const result = await retryAsync(async () => {
    attempts += 1;
    if (attempts < 2) {
      const error = new Error('temporary timeout');
      error.code = 'ETIMEDOUT';
      throw error;
    }
    return 'ok';
  }, { maxAttempts: 3, baseDelay: 1, maxDelay: 2 });

  assert.equal(result, 'ok');
  assert.equal(attempts, 2);
});
