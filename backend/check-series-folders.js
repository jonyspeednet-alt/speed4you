const fs = require('fs');
const path = require('path');

const seriesPath = '/var/www/html/Requested/Series';

const listDirectories = (dir) => {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.filter(entry => entry.isDirectory()).map(entry => entry.name);
};

function cleanTitle(name, type = 'series') {
  let cleaned = String(name || '')
    .replace(/\.[a-z0-9]{2,5}$/i, '')
    .replace(/_/g, ' ')
    .replace(/\.(?=\s|[0-9]|[A-Z])/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2');

  cleaned = cleaned
    .replace(/\b(\d{3,4}p|bluray|bdrip|brrip|web-?dl|webrip|dvdrip|hdrip|hdtv|camrip|telesync)\b/i, '')
    .replace(/\b(x264|x265|hevc|h264|h265|aac|dts|dd5\.1|ac3|mp3|esub|sub|dual|dual-audio|multi|multi-audio|hindi-dubbed)\b/i, '')
    .replace(/\b(yify|yts|psa|qxr|rarbg|tigole|galaxyrg|megusta|mkvca?c?)\b/i, '');

  if (type === 'movie') {
    cleaned = cleaned
      .replace(/\[[^\]]*\]/g, '')
      .replace(/\([^)]*\)/g, '');
  }

  cleaned = cleaned
    .replace(/[^\w\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return cleaned;
}

function stripSeasonSuffix(folderName) {
  const cleaned = cleanTitle(folderName);
  return cleaned
    .replace(/\s+[-_]?\s*S(?:eason)?\s*\d{1,3}\s*$/i, '')
    .replace(/\s+[-_]?\s*Season\s*\d{1,3}\s*$/i, '')
    .replace(/\s+[-_]?\s*Series\s*\d{1,3}\s*$/i, '')
    .trim();
}

const rawFolders = listDirectories(seriesPath);

console.log('Total folders in Series directory:', rawFolders.length);
console.log('\n=== Folder Grouping Analysis ===');

const folderGroups = new Map();
for (const folderName of rawFolders) {
  const baseName = stripSeasonSuffix(folderName);
  if (!folderGroups.has(baseName)) {
    folderGroups.set(baseName, []);
  }
  folderGroups.get(baseName).push(folderName);
}

console.log('Number of groups:', folderGroups.size);

// Check for Musafir Cafe specifically
const musafirGroups = [];
for (const [baseName, groupFolders] of folderGroups.entries()) {
  if (baseName.toLowerCase().includes('musafir')) {
    musafirGroups.push({ baseName, folders: groupFolders });
  }
}

console.log('\n=== Musafir Cafe Groups ===');
if (musafirGroups.length > 0) {
  musafirGroups.forEach(group => {
    console.log('Base name:', group.baseName);
    console.log('Folders:', group.folders);
  });
} else {
  console.log('No Musafir Cafe groups found');
}

process.exit(0);
