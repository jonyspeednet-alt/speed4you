/* global URL, FormData, AbortController, Response, Headers */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const bundle = await build({
  entryPoints: [fileURLToPath(new URL('../src/services/apiClient.js', import.meta.url))],
  bundle: true, write: false, format: 'iife', globalName: 'Api',
  define: { 'import.meta.env': '{}' },
});

function client(fetch, abortSupport = true) {
  const timers = new Map();
  let nextId = 0;
  const window = { location: { origin: 'https://example.test', pathname: '/', search: '', hash: '', replace() {} } };
  Object.defineProperty(window, 'localStorage', { get() { throw new Error('Storage blocked'); } });
  const context = vm.createContext({
    window, URL, FormData, fetch,
    AbortController: abortSupport ? AbortController : undefined,
    setTimeout: callback => { timers.set(++nextId, callback); return nextId; },
    clearTimeout: id => timers.delete(id),
  });
  vm.runInContext(bundle.outputFiles[0].text, context);
  return { api: context.Api.default, timers };
}

test('blocked storage still permits browsing with a stable guest identity', async () => {
  const requests = [];
  const { api, timers } = client(async (url, options) => {
    requests.push({ url, options });
    return new Response(JSON.stringify({ items: [], total: 0 }), { headers: { 'Content-Type': 'application/json' } });
  });
  const result = await api('/content/browse');
  await api('/movies/42');
  assert.equal(result.total, 0);
  assert.match(requests[0].options.headers['X-User-ID'], /^guest:/);
  assert.equal(requests[0].options.headers['X-User-ID'], requests[1].options.headers['X-User-ID']);
  assert.equal(timers.size, 0);
});

for (const abortSupport of [true, false]) {
  test('catalog body timeout works with AbortController=' + abortSupport, async () => {
    let signal;
    const { api, timers } = client(async (_, options) => {
      signal = options.signal;
      return { ok: true, status: 200, headers: new Headers({ 'Content-Type': 'application/json' }), text: () => new Promise(() => {}) };
    }, abortSupport);
    const pending = api('/content/browse');
    const check = assert.rejects(pending, error => error.code === 'TIMEOUT');
    await Promise.resolve();
    for (const callback of timers.values()) callback();
    await check;
    assert.equal(timers.size, 0);
    if (abortSupport) assert.equal(signal.aborted, true);
  });
}

test('mutations and scanner jobs do not inherit the catalog deadline', async () => {
  const { api, timers } = client(async () => new Response(null, { status: 204 }));
  await api('/content/42/view', { method: 'POST', body: '{}' });
  await api('/admin/scanner/status');
  assert.equal(timers.size, 0);
});

test('HTTP errors survive blocked storage and expose their status', async () => {
  const { api, timers } = client(async () => new Response(JSON.stringify({ error: 'Unavailable' }), { status: 503 }));
  await assert.rejects(api('/content/browse'), error => error.status === 503 && error.message === 'Unavailable');
  assert.equal(timers.size, 0);
});
