const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const MEDIA_ROOT = '/var/www/html';
const NAS_BASE = 'http://198.20.20.20';
const videoExts = ['.mkv', '.mp4', '.avi', '.mov'];

const missing = [
  { nasPath: '/NAS1/New_Collection/2026/01.[2026] January/Akhanda 2 - Thaandavam (2025) 1080p [Dual Audio]/', name: 'Akhanda 2' },
  { nasPath: '/NAS1/New_Collection/2026/01.[2026] January/Bindiya Ke Bahubali (TV Series 2025– )/', name: 'Bindiya Ke Bahubali' },
  { nasPath: '/NAS1/New_Collection/2026/01.[2026] January/Dominic and the Ladies\' Purse (2025) 1080p [Dual Audio]/', name: 'Dominic and the Ladies Purse' },
  { nasPath: '/NAS1/New_Collection/2026/01.[2026] January/Feludar Goyendagiri (TV Series 2025– )/', name: 'Feludar Goyendagiri' },
  { nasPath: '/NAS1/New_Collection/2026/01.[2026] January/Kalamkaval (2025) 1080p [Dual Audio]/', name: 'Kalamkaval' },
  { nasPath: '/NAS1/New_Collection/2026/01.[2026] January/Vijaynagar\'er Hirey (2026)/', name: 'Vijaynagarer Hirey' },
  { nasPath: '/NAS1/New_Collection/2026/02.[2026] February/28 Years Later-The Bone Temple (2026) 1080p AMZN [Dual Audio]/', name: '28 Years Later The Bone Temple' },
  { nasPath: '/NAS1/New_Collection/2026/02.[2026] February/O\' Romeo (2026) 1080p HDTC V2/', name: 'O Romeo' },
  { nasPath: '/NAS1/New_Collection/2026/02.[2026] February/The Strangers-Chapter 2 (2025) 1080p [Dual Audio]/', name: 'The Strangers Chapter 2' },
  { nasPath: '/NAS1/New_Collection/2026/03.[2026]March/Kaliyugam 2064 (2025) 1080p [Dual Audio]/', name: 'Kaliyugam 2064' },
  { nasPath: '/NAS1/New_Collection/2026/03.[2026]March/The Strangers-Chapter 3 (2026) 1080p AMZN/', name: 'The Strangers Chapter 3' },
  { nasPath: '/NAS1/New_Collection/2026/04.[2025]April/Bhabiji Ghar Par Hain-Fun on the Run (2026) 1080p/', name: 'Bhabiji Ghar Par Hain Fun on the Run' },
  { nasPath: '/NAS1/New_Collection/2026/05.[2026]May/Krishnavataram - Part 1: The Heart (Hridayam) (2026)/', name: 'Krishnavataram Part 1' },
  { nasPath: '/NAS1/New_Collection/2026/05.[2026]May/Lee Cronin\'s The Mummy (2026) 1080p AMZN [Dual Audio]/', name: 'Lee Cronins The Mummy' },
  { nasPath: '/NAS1/New_Collection/2026/05.[2026]May/Notun Premer Gaan (2026)/', name: 'Notun Premer Gaan' },
  { nasPath: '/NAS1/New_Collection/2026/05.[2026]May/Panda Plan 2: The Magical Tribe (2026) 1080p [Dual Audio]/', name: 'Panda Plan 2' },
  { nasPath: '/NAS1/New_Collection/2026/05.[2026]May/The Great Grand Superhero-Aliens Ka Aagman (2026) 1080p HDTC/', name: 'The Great Grand Superhero Aliens Ka Aagman' },
  { nasPath: '/NAS1/New_Collection/2026/05.[2026]May/Tom Clancy\'s Jack Ryan-Ghost War (2026) 1080p AMZN [Dual Audio]/', name: 'Tom Clancys Jack Ryan Ghost War' },
  { nasPath: '/NAS1/New_Collection/2026/05.[2026]May/Top Cop (2026) 1080p [Punjabi]/', name: 'Top Cop' },
  { nasPath: '/NAS1/New_Collection/2026/06.[2026]June/Brown (TV Series 2026– ) 1080p/', name: 'Brown' },
  { nasPath: '/NAS1/New_Collection/2026/06.[2026]June/Margao Files - The Unsolved Case (TV Mini Series)/', name: 'Margao Files' },
  { nasPath: '/NAS1/New_Collection/2026/07.[2026]July/Mukhbir: The Story of a Spy – The Movie (2026) 1080p [Dual Audio]/', name: 'Mukhbir The Story of a Spy' },
  { nasPath: '/NAS1/New_Collection/2026/07.[2026]July/Parimala and Co (2026) 1080p [Dual Audio]/', name: 'Parimala and Co' },
];

function log(msg) { console.log(msg); }
function getDiskFreeGB() { try { return parseInt(execSync("df -BG / | tail -1 | awk '{print $4}'", { timeout: 5000 }).toString().trim()); } catch (e) { return 0; } }

function encodeUrl(s) {
  return s.replace(/ /g, '%20').replace(/\(/g, '%28').replace(/\)/g, '%29')
    .replace(/\[/g, '%5B').replace(/\]/g, '%5D').replace(/'/g, '%27')
    .replace(/–/g, '%E2%80%93').replace(/&/g, '%26');
}

function findVideo(nasPath) {
  const url = NAS_BASE + encodeUrl(nasPath);
  try {
    const html = execSync(`curl -s -H 'User-Agent: Mozilla/5.0' "${url}" 2>&1`, { timeout: 15000 }).toString();
    const regex = /href="([^"]+)"/g;
    let m;
    while ((m = regex.exec(html)) !== null) {
      const href = m[1];
      if (href.includes('_h5ai') || href === '..' || href.startsWith('//') || href.startsWith('http://')) continue;
      const decoded = decodeURIComponent(href);
      if (videoExts.includes(path.extname(decoded).toLowerCase())) {
        return { href: href, name: path.basename(decoded) };
      }
    }
  } catch (e) {}
  return null;
}

function download(href, dest) {
  try {
    execSync(`curl -L -g -H 'User-Agent: Mozilla/5.0' --max-time 3600 -o "${dest}" "${NAS_BASE}${href}" 2>&1`, { timeout: 3610000 });
    return fs.existsSync(dest) && fs.statSync(dest).size > 100000;
  } catch (e) { return false; }
}

log(`=== Remaining 23 NAS items ===`);

// First check which already exist on disk
const existing = fs.readdirSync(path.join(MEDIA_ROOT, 'Requested', 'Movies')).filter(f => videoExts.includes(path.extname(f).toLowerCase()));
log(`Files already on disk: ${existing.length}`);

let toDownload = [];
let alreadyOnDisk = [];

for (const item of missing) {
  const cleanName = item.name.toLowerCase().replace(/[^a-z0-9]/g, '');
  const foundOnDisk = existing.some(f => {
    const fileClean = path.basename(f, path.extname(f)).toLowerCase().replace(/[^a-z0-9]/g, '');
    return fileClean.includes(cleanName) || cleanName.includes(fileClean);
  });
  
  if (foundOnDisk) {
    alreadyOnDisk.push(item.name);
  } else {
    toDownload.push(item);
  }
}

log(`Already on disk: ${alreadyOnDisk.length}`);
alreadyOnDisk.forEach(n => log(`  ✅ ${n}`));
log(`\nNeed download: ${toDownload.length}`);

let ok = 0, fail = 0;
for (const item of toDownload) {
  const freeGB = getDiskFreeGB();
  if (freeGB < 3) { log('DISK FULL'); break; }
  
  log(`\n--- ${item.name} [${freeGB}GB free] ---`);
  const video = findVideo(item.nasPath);
  if (!video) { log('  No video file'); fail++; continue; }
  log(`  Found: ${video.name}`);
  
  const dest = path.join(MEDIA_ROOT, 'Requested', 'Movies', `${item.name}.mkv`);
  if (fs.existsSync(dest)) { log('  Exists'); continue; }
  
  log(`  Downloading...`);
  if (download(video.href, dest)) {
    const size = (fs.statSync(dest).size / 1024 / 1024).toFixed(0);
    log(`  OK: ${size}MB`);
    ok++;
  } else {
    log('  FAILED'); fail++;
    try { fs.unlinkSync(dest); } catch(e) {}
  }
}

log(`\n=== DONE: ${ok} downloaded, ${fail} failed ===`);
