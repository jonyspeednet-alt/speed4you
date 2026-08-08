const fs = require('fs');
const path = require('path');

const {
  countEpisodeLikeFiles,
  parseEpisodeIdentity,
  cleanTitle,
  slugify,
  looksLikeSeasonFolder,
  parseSeasonNumber,
} = require('./src/services/scanner-series-parser');

const seriesPath = '/var/www/html/Requested/Series/Musafir Cafe (2026)';
const seasonPath = path.join(seriesPath, 'S1');

console.log('=== Musafir Cafe Episode Detection Test ===');

const files = fs.readdirSync(seasonPath);
console.log('Files in S1:', files);

console.log('=== Episode Detection Tests ===');

for (const file of files) {
  console.log('File: ' + file);
  
  const identity = parseEpisodeIdentity(file);
  console.log('Episode Identity:', JSON.stringify(identity, null, 2));
  
  const isEpisode = countEpisodeLikeFiles([file], seasonPath, 'series') > 0;
  console.log('Is Episode:', isEpisode);
  
  const cleaned = cleanTitle(file);
  console.log('Cleaned Title:', cleaned);
  console.log('');
}

console.log('=== Season Folder Detection ===');
const seasonName = 'S1';
const looksLikeSeason = looksLikeSeasonFolder(seasonName);
console.log('S1 looks like season folder:', looksLikeSeason);

const seasonNumber = parseSeasonNumber(seasonName, 1);
console.log('Season number:', seasonNumber);

console.log('=== Series Folder Name ===');
const folderName = 'Musafir Cafe (2026)';
const slug = slugify(folderName);
console.log('Series slug:', slug);

process.exit(0);
