const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const MEDIA_ROOT = '/var/www/html';
const NAS_BASE = 'http://198.20.20.20';
const videoExts = ['.mkv', '.mp4', '.avi', '.mov'];

const series = [
  { name: 'Bindiya Ke Bahubali', seasonPath: '/NAS1/New_Collection/2026/01.[2026] January/Bindiya Ke Bahubali (TV Series 2025%E2%80%93 )/Season.02/' },
  { name: 'Feludar Goyendagiri', seasonPath: '/NAS1/New_Collection/2026/01.[2026] January/Feludar Goyendagiri (TV Series 2025%E2%80%93 )/Season.03/' },
  { name: 'Brown', seasonPath: '/NAS1/New_Collection/2026/06.[2026]June/Brown (TV Series 2026%E2%80%93 ) 1080p/Season.01/' },
];

function log(msg) { console.log(msg); }
function getDiskFreeGB() { try { return parseInt(execSync("df -BG / | tail -1 | awk '{print $4}'", { timeout: 5000 }).toString().trim()); } catch (e) { return 0; } }

function encodeUrl(s) {
  return s.replace(/ /g, '%20').replace(/\(/g, '%28').replace(/\)/g, '%29')
    .replace(/\[/g, '%5B').replace(/\]/g, '%5D').replace(/'/g, '%27')
    .replace(/–/g, '%E2%80%93').replace(/&/g, '%26');
}

function listDir(url) {
  try {
    const html = execSync(`curl -s -H 'User-Agent: Mozilla/5.0' "${url}" 2>&1`, { timeout: 15000 }).toString();
    const regex = /href="([^"]+)"/g;
    let m;
    const items = [];
    while ((m = regex.exec(html)) !== null) {
      const href = m[1];
      if (href.includes('_h5ai') || href === '..' || href.startsWith('//') || href.startsWith('http://')) continue;
      items.push({ href: href, decoded: decodeURIComponent(href) });
    }
    return items;
  } catch (e) { return []; }
}

function download(href, dest) {
  try {
    execSync(`curl -L -g -H 'User-Agent: Mozilla/5.0' --max-time 3600 -o "${dest}" "${NAS_BASE}${href}" 2>&1`, { timeout: 3610000 });
    return fs.existsSync(dest) && fs.statSync(dest).size > 100000;
  } catch (e) { return false; }
}

let totalOk = 0, totalFail = 0;

for (const s of series) {
  const freeGB = getDiskFreeGB();
  if (freeGB < 3) { log('DISK FULL'); break; }
  
  log(`\n=== ${s.name} ===`);
  const url = NAS_BASE + encodeUrl(s.seasonPath);
  const items = listDir(url);
  
  const videos = items.filter(i => videoExts.includes(path.extname(i.decoded).toLowerCase()));
  const subdirs = items.filter(i => !videoExts.includes(path.extname(i.decoded).toLowerCase()) && i.decoded !== '');
  
  log(`  Videos: ${videos.length}, Subdirs: ${subdirs.length}`);
  
  // Download videos directly
  for (const v of videos) {
    const filename = path.basename(v.decoded);
    const dest = path.join(MEDIA_ROOT, 'Requested', 'TV_Series', s.name, filename);
    const destDir = path.dirname(dest);
    if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
    
    if (fs.existsSync(dest)) { log(`  Exists: ${filename}`); continue; }
    
    log(`  Downloading: ${filename}...`);
    if (download(v.href, dest)) {
      const size = (fs.statSync(dest).size / 1024 / 1024).toFixed(0);
      log(`  OK: ${size}MB`);
      totalOk++;
    } else {
      log('  FAILED'); totalFail++;
    }
  }
  
  // Check subdirs for more videos
  for (const sub of subdirs) {
    const subUrl = NAS_BASE + sub.href;
    if (!subUrl.endsWith('/')) continue;
    const subItems = listDir(subUrl);
    const subVideos = subItems.filter(i => videoExts.includes(path.extname(i.decoded).toLowerCase()));
    
    for (const v of subVideos) {
      const filename = path.basename(v.decoded);
      const dest = path.join(MEDIA_ROOT, 'Requested', 'TV_Series', s.name, path.basename(sub.decoded), filename);
      const destDir = path.dirname(dest);
      if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
      
      if (fs.existsSync(dest)) { log(`  Exists: ${filename}`); continue; }
      
      log(`  Downloading ${path.basename(sub.decoded)}/${filename}...`);
      if (download(v.href, dest)) {
        const size = (fs.statSync(dest).size / 1024 / 1024).toFixed(0);
        log(`  OK: ${size}MB`);
        totalOk++;
      } else {
        log('  FAILED'); totalFail++;
      }
    }
  }
}

log(`\n=== DONE: ${totalOk} downloaded, ${totalFail} failed ===`);
