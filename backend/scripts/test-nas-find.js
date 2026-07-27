const { execSync } = require('child_process');
const fs = require('fs');

// Test: list one NAS dir and find video
const url = 'http://198.20.20.20/NAS1/New_Collection/2026/01.%5B2026%5D%20January/120%20Bahadur%20(2025)/';
const html = execSync(`curl -s -H 'User-Agent: Mozilla/5.0' "${url}" 2>&1`, { timeout: 15000 }).toString();

// Find ALL hrefs
const allHrefs = [];
const regex = /href="([^"]+)"/g;
let m;
while ((m = regex.exec(html)) !== null) {
  allHrefs.push(m[1]);
}

console.log('All hrefs found:', allHrefs.length);
allHrefs.forEach(h => console.log('  ' + h));

// Filter for video files
const videoExts = ['.mkv', '.mp4', '.avi', '.mov'];
const videos = allHrefs.filter(h => {
  if (h.includes('_h5ai') || h === '..' || h.startsWith('//') || h.startsWith('http://')) return false;
  const decoded = decodeURIComponent(h);
  const ext = require('path').extname(decoded).toLowerCase();
  return videoExts.includes(ext);
});

console.log('\nVideo files:', videos.length);
videos.forEach(v => console.log('  ' + decodeURIComponent(v)));
