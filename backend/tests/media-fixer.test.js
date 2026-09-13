const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { EventEmitter } = require('events');

function load(name, mocks = {}) {
  const sandbox = {
    module: { exports: {} }, process: { env: {} }, console,
    setInterval: () => ({ unref() {} }), clearInterval() {},
    require: (id) => Object.hasOwn(mocks, id) ? mocks[id] : require(id),
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../src/services', name), 'utf8'), sandbox, { filename: name });
  return sandbox.module.exports;
}

const storeStub = { getItemById: async () => null, loadScannerRoots: () => [] };
const compat = load('media-compat.js', { '../data/store': storeStub });

test('explicit missing season and episode fail instead of selecting another episode', () => {
  const item = { id: 1, type: 'series', seasons: [{ number: 1, episodes: [{ number: 3 }] }] };
  assert.throws(() => compat.resolveTargets(item, { season: 9, episode: 99 }), { code: 'NO_MEDIA' });
  assert.throws(() => compat.resolveTargets(item, { season: 1, episode: 1 }), { code: 'NO_MEDIA' });
  assert.equal(compat.resolveTargets(item, { season: 1, episode: 3 })[0].key, 'series-1-s1e3');
});

test('default audio maps the selected input track, with a first-track fallback when no default exists', () => {
  const analysis = {
    filePath: 'test.mkv', video: { status: 'ok' }, subtitleCount: 0,
    audios: [
      { outputIndex: 0, codec: 'aac', status: 'ok', isDefault: false },
      { outputIndex: 1, codec: 'eac3', status: 'bad', isDefault: true },
    ],
  };
  const result = compat.buildTranscodeArgs(analysis, 'browser', { audioMode: 'default' });
  assert.ok(result.args.includes('0:a:1'));
  assert.ok(result.args.includes('0:V:0')); // Excludes attached cover art.
  assert.ok(result.args.includes('-c:a:0'));
  analysis.audios[1].isDefault = false;
  assert.ok(compat.buildTranscodeArgs(analysis, 'browser', { audioMode: 'default' }).args.includes('0:a:0'));
});

test('retry keeps an existing recorded source even when catalog entry was removed', async () => {
  const retry = load('media-retry.js', {
    fs: { statSync: () => ({ isFile: () => true }) }, '../data/store': storeStub,
    './media-compat': { resolveTargets: () => { throw new Error('Must not use another item'); }, analyzeTarget: async (t) => ({ ...t, exists: true }) },
  });
  const result = await retry.resolveRetry({ itemId: 55, itemTitle: 'Old item', sourcePath: '/media/exact.mkv', targetKey: 'movie-55' });
  assert.equal(result.analysis.filePath, '/media/exact.mkv');
  assert.equal(result.item.id, 55);
});

test('retry refuses unrelated targets when historical file and target are missing', async () => {
  const retry = load('media-retry.js', {
    fs: { statSync: () => { throw Object.assign(new Error('gone'), { code: 'ENOENT' }); } },
    '../data/store': { getItemById: async () => ({ type: 'series' }) },
    './media-compat': { resolveTargets: () => [{ key: 'series-1-s1e1' }] },
  });
  await assert.rejects(retry.resolveRetry({ itemId: 1, sourcePath: '/gone', targetKey: 'series-1-s9e99' }), { code: 'NO_MEDIA' });
});

function jobHarness() {
  const files = new Map();
  const children = [];
  let records = [];
  let autoClean = false;
  const saved = [];
  const fakeFs = {
    realpathSync: (p) => path.resolve(p), existsSync: (p) => files.has(p),
    statSync: (p) => {
      if (!files.has(p)) throw Object.assign(new Error('gone'), { code: 'ENOENT' });
      return { size: files.get(p), isFile: () => true, mode: 0o644 };
    },
    writeFileSync() {}, appendFileSync() {}, chmodSync() {},
    readFileSync: () => '',
    unlinkSync: (p) => { if (!files.delete(p)) throw Object.assign(new Error('gone'), { code: 'ENOENT' }); },
    renameSync: (a, b) => { fakeFs.statSync(a); files.set(b, files.get(a)); files.delete(a); },
  };
  const mediaStore = {
    ensureMediaTables: async () => {},
    saveJobRecord: async (j) => saved.push({ id: j.id, status: j.status }),
    updateJobRecord: async () => {},
    listJobHistory: async () => [],
    listBackupRecords: async () => records,
    getJobRecord: async (id) => records.find((r) => r.id === id),
    clearBackupPath: async (p) => { records.forEach((r) => { if (r.backupPath === p) r.backupPath = ''; }); },
    getSettings: async () => ({ autoCleanBackups: autoClean, backupRetentionDays: 7 }),
  };
  const service = load('transcode-jobs.js', {
    fs: fakeFs, './media-store': mediaStore, '../utils/logger': { info() {}, warn() {} },
    './media-compat': {
      buildTranscodeArgs: () => ({ args: [], plan: { video: 'copy', audio: [] }, preset: { id: 'browser', label: 'Browser' } }),
      probeMediaFile: async () => ({ streams: [{ codec_type: 'video' }], format: { duration: 60 } }),
    },
    child_process: { spawn: () => {
      const child = new EventEmitter(); child.stderr = new EventEmitter(); child.kill = () => {};
      children.push(child); return child;
    } },
  });
  function create(index) {
    const filePath = path.resolve('mock-media', `${index}.mkv`);
    files.set(filePath, 2000000);
    return service.createJob({ item: { id: index, title: `Movie ${index}` }, target: { key: `movie-${index}` }, analysis: { filePath, durationSec: 60 }, presetId: 'browser' });
  }
  return { service, create, files, children, saved, setRecords: (r) => { records = r; }, enableCleanup: () => { autoClean = true; } };
}

test('queue accepts many distinct files, includes all active jobs and rejects duplicate sources atomically', async () => {
  const h = jobHarness();
  for (let i = 1; i <= 60; i++) h.create(i);
  const list = await h.service.listJobs();
  assert.equal(list.length, 60);
  assert.equal(list.filter((j) => j.status === 'running').length, 1);
  assert.equal(list.filter((j) => j.status === 'queued').length, 59);
  assert.throws(() => h.create(1), { code: 'BUSY' });
  h.service.cancelJob(list[0].id);
  assert.equal((await h.service.getJob(list[1].id)).status, 'running');
});

test('repeat transcode preserves existing backup and records a new backup', async () => {
  const h = jobHarness();
  const job = h.create(1);
  const previous = `${job.sourcePath}.orig-bak`;
  h.files.set(previous, 3333333);
  h.files.set(job.tempPath, 2100000);
  h.children[0].emit('close', 0, null);
  await new Promise(setImmediate);
  assert.equal(job.status, 'done');
  assert.equal(h.files.get(previous), 3333333);
  assert.notEqual(job.backupPath, previous);
  assert.equal(h.files.get(job.backupPath), 2000000);
  assert.equal(h.saved.at(-1).status, 'done');
});

test('backup cleanup only removes expired completed backups and handles missing files', async () => {
  const h = jobHarness();
  await new Promise(setImmediate);
  const old = new Date(Date.now() - 9 * 86400000).toISOString();
  const fresh = new Date().toISOString();
  const make = (id, status, finishedAt) => {
    const sourcePath = path.resolve('mock-media', `${id}.mkv`);
    const backupPath = `${sourcePath}.orig-bak`;
    h.files.set(backupPath, 2000000);
    return { id, sourcePath, backupPath, status, finishedAt };
  };
  const records = [make('old', 'done', old), make('fresh', 'done', fresh), make('failed', 'failed', old), make('missing', 'done', old)];
  const paths = records.map((r) => r.backupPath);
  h.files.delete(paths[3]);
  h.setRecords(records); h.enableCleanup();
  await h.service.cleanupExpiredBackups();
  assert.equal(h.files.has(paths[0]), false);
  assert.equal(h.files.has(paths[1]), true);
  assert.equal(h.files.has(paths[2]), true);
  assert.equal(records[3].backupPath, '');
});

test('backup deletion refuses a source with an active job and deduplicates legacy paths', async () => {
  const h = jobHarness();
  const job = h.create(1);
  const backupPath = `${job.sourcePath}.orig-bak`;
  h.files.set(backupPath, 2000000);
  h.setRecords([
    { id: 'previous', sourcePath: job.sourcePath, backupPath, status: 'done' },
    { id: 'older', sourcePath: job.sourcePath, backupPath, status: 'done' },
  ]);
  assert.equal((await h.service.listBackups()).length, 1);
  await assert.rejects(h.service.deleteBackup('previous'), { code: 'BUSY' });
  assert.equal(h.files.has(backupPath), true);
});

test('API rejects invalid episode numbers and Retry preserves the historical preset/options', async () => {
  const routes = new Map();
  const router = {};
  for (const method of ['get', 'post', 'delete', 'put']) router[method] = (p, handler) => routes.set(`${method} ${p}`, handler);
  let created;
  const record = { id: 'old', status: 'interrupted', preset: 'browser-720p', options: { crf: 19, audioMode: 'default' } };
  load('../routes/media.js', {
    express: { Router: () => router }, '../data/store': storeStub,
    '../services/media-compat': { ...compat, analyzeContent: async () => { throw new Error('Invalid selection reached probe'); } },
    '../services/transcode-jobs': {
      getJob: async (id) => id === 'old' ? record : ({ id }),
      createJob: (args) => { created = args; return { id: 'new' }; },
    },
    '../services/media-store': {}, '../services/media-library-scan': {},
    '../services/media-retry': { resolveRetry: async () => ({ item: { id: 1 }, target: {}, analysis: {} }) },
  });
  const request = (route, body) => new Promise((resolve, reject) => {
    let status = 200;
    const res = { status: (s) => { status = s; return res; }, json: (data) => resolve({ status, data }) };
    routes.get(route)({ body, query: {}, params: { id: 'old' } }, res, reject);
  });
  assert.equal((await request('post /analyze', { input: '1', episode: -2 })).status, 400);
  assert.equal((await request('post /analyze', { input: '1', season: 1.5 })).status, 400);
  assert.equal((await request('post /jobs/:id/retry', {})).status, 201);
  assert.equal(created.presetId, 'browser-720p');
  assert.equal(created.options.crf, 19);
  assert.equal(created.options.audioMode, 'default');
});

test('full library scan checks beyond 5000 targets and returns more than 500 findings', async () => {
  let count = 0;
  let saved;
  const service = load('media-library-scan.js', {
    '../data/store': { listItems: async () => ({ total: 1, items: [{ id: 1, type: 'series' }] }) },
    './media-compat': {
      resolveTargets: () => Array.from({ length: 5001 }, (_, i) => ({ key: `episode-${i}` })),
      analyzeTarget: async () => { count++; return { verdict: 'audio_issue', audios: [] }; },
    },
    './media-store': { saveLastScanReport: async (r) => { saved = r; } },
    '../utils/logger': { info() {}, warn() {} },
  });
  await service.startLibraryScan();
  await new Promise(setImmediate);
  assert.equal(count, 5001);
  assert.equal(saved.found.length, 5001);
  assert.equal(saved.status, 'done');
});

test('cancel during the last series stops before the next episode and persists cancelled', async () => {
  let count = 0;
  let saved;
  let service;
  service = load('media-library-scan.js', {
    '../data/store': { listItems: async () => ({ total: 1, items: [{ id: 1, type: 'series' }] }) },
    './media-compat': {
      resolveTargets: () => [{ key: 'one' }, { key: 'two' }],
      analyzeTarget: async () => { count++; service.cancelLibraryScan(); return { verdict: 'compatible' }; },
    },
    './media-store': { saveLastScanReport: async (r) => { saved = r; } },
    '../utils/logger': { info() {}, warn() {} },
  });
  await service.startLibraryScan(); await new Promise(setImmediate);
  assert.equal(count, 1);
  assert.equal(saved.status, 'cancelled');
});
