const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const MEDIA_ROOT = '/var/www/html';
const NAS_BASE = 'http://198.20.20.20';
const videoExts = ['.mkv', '.mp4', '.avi', '.mov'];

const downloads = JSON.parse(fs.readFileSync('/tmp/nas-download-list.json', 'utf8'));

function log(msg) { console.log(`[${new Date().toISOString()}] ${msg}`); }

function getDiskFreeGB() {
  try { return parseInt(execSync("df -BG / | tail -1 | awk '{print $4}'", { timeout: 5000 }).toString().trim()); }
  catch (e) { return 0; }
}

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
    const url = NAS_BASE + href;
    execSync(`curl -L -g -H 'User-Agent: Mozilla/5.0' --max-time 3600 -o "${dest}" "${url}" 2>&1`, { timeout: 3610000 });
    return fs.existsSync(dest) && fs.statSync(dest).size > 100000;
  } catch (e) { return false; }
}

log(`=== NAS Bulk Downloader v3 ===`);
log(`${downloads.length} items`);

let ok = 0, fail = 0, skip = 0;

for (const item of downloads) {
  if (getDiskFreeGB() < 3) { log('DISK FULL, stopping.'); break; }

  log(`\n--- ${item.name} (${item.month}) [${getDiskFreeGB()}GB free] ---`);

  const video = findVideo(item.nasPath);
  if (!video) { log('  No video'); fail++; continue; }

  log(`  Found: ${video.name}`);

  const cleanTitle = item.name
    .replace(/\s*\(\d{4}[-–]\s*\)/g, '').replace(/\s*\(\d{4}\)/g, '')
    .replace(/\s*\d{4}\s*/g, '').replace(/\s*1080p.*/g, '').replace(/\s*720p.*/g, '')
    .replace(/\s*HDTC.*/g, '').replace(/\s*AMZN.*/g, '').replace(/\s*\[Dual Audio\]/g, '')
    .replace(/\s*\(Hindi Dubbed\)/g, '').replace(/\s*HQ-HDTC/g, '').replace(/\s*V\d+/g, '')
    .replace(/\s*-\s*/g, ' ').trim();

  const ext = path.extname(video.name);
  const dest = path.join(MEDIA_ROOT, 'Requested', 'Movies', `${cleanTitle}${ext}`);

  if (fs.existsSync(dest)) { log(`  Exists`); skip++; continue; }

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

log(`\n=== DONE: ${ok} downloaded, ${skip} skipped, ${fail} failed, ${getDiskFreeGB()}GB free ===`);
