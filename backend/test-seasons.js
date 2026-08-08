const { buildSeriesSeasons } = require('./src/services/scanner-series-parser');
const fs = require('fs');
const path = require('path');

const seriesPath = '/var/www/html/Requested/Series/Musafir Cafe (2026)';
const seriesFolderName = 'Musafir Cafe (2026)';

const listFiles = (dir) => fs.readdirSync(dir);
const listDirectories = (dir) => {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.filter(entry => entry.isDirectory()).map(entry => entry.name);
};
const listVideoFiles = (files, dir, type) => {
  const videoExtensions = ['.mkv', '.mp4', '.avi', '.mov', '.webm'];
  return files.filter(file => 
    videoExtensions.some(ext => file.toLowerCase().endsWith(ext))
  );
};
const toPublicUrl = (root, absolutePath) => {
  const relativePath = path.relative(root.scanPath, absolutePath).split(path.sep).join('/');
  return 'https://data.speed4you.net/Requested/Series/' + relativePath;
};
const findSubtitleFile = (root, videoPath) => '';

console.log('=== Testing buildSeriesSeasons for Musafir Cafe ===');

const result = buildSeriesSeasons(
  { scanPath: '/var/www/html/Requested/Series', publicBaseUrl: 'https://data.speed4you.net/Requested/Series' },
  seriesFolderName,
  seriesPath,
  { listFiles, listDirectories, listVideoFiles, toPublicUrl, findSubtitleFile }
);

console.log('Seasons count:', result.seasons.length);
console.log('Total files:', result.seriesFiles.length);
console.log('Seasons:', JSON.stringify(result.seasons, null, 2));

process.exit(0);
