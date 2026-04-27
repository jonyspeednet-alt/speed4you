const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const scannerService = require('../src/services/scanner');
const {
  buildSeriesSeasons,
  parseEpisodeIdentity,
} = require('../src/services/scanner-series-parser');

const { detectSeriesFolder, assignScannerTaxonomy, classifyAutoDiscoveredRoot } = scannerService.__test__;

test('detects direct episodic files inside a mixed library folder as series', () => {
  const result = detectSeriesFolder(
    { type: 'movie' },
    'D:\\Media\\Shows\\Breaking Bad',
    ['Breaking.Bad.S01E01.mkv', 'Breaking.Bad.S01E02.mkv'],
    [],
  );

  assert.equal(result, true);
});

test('detects nested season folders inside a movie root as series', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'scanner-series-'));
  const seriesPath = path.join(tempRoot, 'Dark');
  const seasonPath = path.join(seriesPath, 'Season 1');

  fs.mkdirSync(seasonPath, { recursive: true });
  fs.writeFileSync(path.join(seasonPath, 'Dark.S01E01.mkv'), 'episode');

  const result = detectSeriesFolder(
    { type: 'movie' },
    seriesPath,
    [],
    ['Season 1'],
  );

  assert.equal(result, true);
  fs.rmSync(tempRoot, { recursive: true, force: true });
});

test('detects numeric episodic files inside a mixed library folder as series', () => {
  const result = detectSeriesFolder(
    { type: 'movie' },
    'D:\\Media\\Shows\\Anime Pack',
    ['01.mkv', '02.mkv', '03.mkv'],
    [],
  );

  assert.equal(result, true);
});

test('detects numeric season folders inside a mixed library folder as series', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'scanner-series-numeric-'));
  const seriesPath = path.join(tempRoot, 'One Piece');
  const seasonPath = path.join(seriesPath, '1');

  fs.mkdirSync(seasonPath, { recursive: true });
  fs.writeFileSync(path.join(seasonPath, '[Anime] One Piece - 01.mkv'), 'episode');

  const result = detectSeriesFolder(
    { type: 'movie' },
    seriesPath,
    [],
    ['1'],
  );

  assert.equal(result, true);
  fs.rmSync(tempRoot, { recursive: true, force: true });
});

test('parses anime-style bracket episode numbers', () => {
  const parsed = parseEpisodeIdentity('[Judas] Frieren [14][1080p].mkv');
  assert.equal(parsed.season, null);
  assert.equal(parsed.episode, 14);
});

test('builds seasons from nested disc folders under season folders', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'scanner-series-disc-'));
  const seriesPath = path.join(tempRoot, 'Lost');
  const seasonPath = path.join(seriesPath, 'Season 1');
  const discPath = path.join(seasonPath, 'Disc 1');

  fs.mkdirSync(discPath, { recursive: true });
  fs.writeFileSync(path.join(discPath, 'Lost.S01E01.mkv'), 'episode');
  fs.writeFileSync(path.join(discPath, 'Lost.S01E02.mkv'), 'episode');

  const built = buildSeriesSeasons(
    { scanPath: tempRoot, publicBaseUrl: '/media' },
    'Lost',
    seriesPath,
    {
      listFiles: (targetPath) => fs.readdirSync(targetPath, { withFileTypes: true }).filter((entry) => entry.isFile()).map((entry) => entry.name),
      listDirectories: (targetPath) => fs.readdirSync(targetPath, { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name),
      listVideoFiles: (files) => files.filter((file) => path.extname(file).toLowerCase() === '.mkv'),
      toPublicUrl: (root, absolutePath) => `${root.publicBaseUrl}/${path.relative(root.scanPath, absolutePath).split(path.sep).join('/')}`,
    },
  );

  assert.equal(built.seasons.length, 1);
  assert.equal(built.seasons[0].episodes.length, 2);
  assert.equal(built.seasons[0].episodes[0].number, 1);
  assert.match(built.seasons[0].episodes[0].sourcePath, /Season 1[\\/]Disc 1[\\/]Lost\.S01E01\.mkv$/);
  fs.rmSync(tempRoot, { recursive: true, force: true });
});

test('merges duplicate season folders with same season number', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'scanner-series-merge-'));
  const seriesPath = path.join(tempRoot, 'Lucifer');
  const seasonPartOnePath = path.join(seriesPath, 'Lucifer S05 (2020)');
  const seasonPartTwoPath = path.join(seriesPath, 'Lucifer S05 (2021)');

  fs.mkdirSync(seasonPartOnePath, { recursive: true });
  fs.mkdirSync(seasonPartTwoPath, { recursive: true });
  fs.writeFileSync(path.join(seasonPartOnePath, 'Lucifer S05 E01.mkv'), 'episode');
  fs.writeFileSync(path.join(seasonPartOnePath, 'Lucifer S05 E08.mkv'), 'episode');
  fs.writeFileSync(path.join(seasonPartTwoPath, 'Lucifer S05 E09.mkv'), 'episode');
  fs.writeFileSync(path.join(seasonPartTwoPath, 'Lucifer S05 E16.mkv'), 'episode');

  const built = buildSeriesSeasons(
    { scanPath: tempRoot, publicBaseUrl: '/media' },
    'Lucifer',
    seriesPath,
    {
      listFiles: (targetPath) => fs.readdirSync(targetPath, { withFileTypes: true }).filter((entry) => entry.isFile()).map((entry) => entry.name),
      listDirectories: (targetPath) => fs.readdirSync(targetPath, { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name),
      listVideoFiles: (files) => files.filter((file) => path.extname(file).toLowerCase() === '.mkv'),
      toPublicUrl: (root, absolutePath) => `${root.publicBaseUrl}/${path.relative(root.scanPath, absolutePath).split(path.sep).join('/')}`,
    },
  );

  assert.equal(built.seasons.length, 1);
  assert.equal(built.seasons[0].number, 5);
  assert.deepEqual(built.seasons[0].episodes.map((episode) => episode.number), [1, 8, 9, 16]);
  fs.rmSync(tempRoot, { recursive: true, force: true });
});

test('assigns primary genre category and normalized collection for scanner items', () => {
  const item = assignScannerTaxonomy({
    type: 'series',
    category: 'TV Series',
    genres: ['Crime', 'Drama'],
  });

  assert.equal(item.category, 'Crime');
  assert.equal(item.collection, 'Series');
  assert.deepEqual(item.tags, ['Crime', 'Drama']);
});

test('classifies a season-bucket directory as a series root for auto discovery', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'scanner-autodiscover-series-'));
  const rootPath = path.join(tempRoot, 'TV Packs');
  const showPath = path.join(rootPath, 'Dark');
  const seasonPath = path.join(showPath, 'Season 1');

  fs.mkdirSync(seasonPath, { recursive: true });
  fs.writeFileSync(path.join(seasonPath, 'Dark.S01E01.mkv'), Buffer.alloc(40 * 1024 * 1024));

  const result = classifyAutoDiscoveredRoot(rootPath);
  assert.equal(result?.type, 'series');
  fs.rmSync(tempRoot, { recursive: true, force: true });
});

test('does not classify non-media directories as scanner roots', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'scanner-autodiscover-none-'));
  const rootPath = path.join(tempRoot, 'Random Docs');
  fs.mkdirSync(rootPath, { recursive: true });
  fs.writeFileSync(path.join(rootPath, 'readme.txt'), 'hello');

  const result = classifyAutoDiscoveredRoot(rootPath);
  assert.equal(result, null);
  fs.rmSync(tempRoot, { recursive: true, force: true });
});

test('does not classify blocked mixed-content utility directories as scanner roots', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'scanner-autodiscover-blocked-'));
  const rootPath = path.join(tempRoot, 'Cartoon,Documentary,Ebook,Software,Tutorial');
  const mediaPath = path.join(rootPath, 'Sample Show', 'Season 1');

  fs.mkdirSync(mediaPath, { recursive: true });
  fs.writeFileSync(path.join(mediaPath, 'Sample.Show.S01E01.mkv'), Buffer.alloc(40 * 1024 * 1024));

  const result = classifyAutoDiscoveredRoot(rootPath);
  assert.equal(result, null);
  fs.rmSync(tempRoot, { recursive: true, force: true });
});
