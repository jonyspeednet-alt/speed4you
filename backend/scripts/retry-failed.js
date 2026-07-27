const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const { execSync } = require('child_process');

const MEDIA_ROOT = '/var/www/html';
const REQUESTED_DIR = path.join(MEDIA_ROOT, 'Requested');

function log(msg) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

function fetchPage(url) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const client = parsedUrl.protocol === 'https:' ? https : http;
    const req = client.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      timeout: 30000,
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        fetchPage(res.headers.location).then(resolve).catch(reject);
        return;
      }
      let data = '';
      res.on('data', (c) => { data += c; });
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

function extractVideoUrl(html) {
  const regex = /https?:\/\/(?:ftp|movie|data)\.ctgfun\.com\/[^\s"'<>\\]+?\.(mp4|mkv)/gi;
  let m;
  const allUrls = new Set();
  while ((m = regex.exec(html)) !== null) {
    const url = m[0];
    if (!url.includes('.hls/') && !url.includes('.audio.')) allUrls.add(url);
  }
  const urls = [...allUrls];
  urls.sort((a, b) => {
    const a720 = a.includes('720p') || a.includes('720');
    const b720 = b.includes('720p') || b.includes('720');
    if (a720 && !b720) return -1;
    if (!a720 && b720) return 1;
    return 0;
  });
  return urls[0] || null;
}

function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const client = parsedUrl.protocol === 'https:' ? https : http;
    const req = client.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      timeout: 3600000,
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        downloadFile(res.headers.location, destPath).then(resolve).catch(reject);
        return;
      }
      if (res.statusCode !== 200) { reject(new Error(`HTTP ${res.statusCode}`)); return; }
      const totalSize = parseInt(res.headers['content-length'] || '0', 10);
      let downloaded = 0;
      const startTime = Date.now();
      const dir = path.dirname(destPath);
      fs.mkdirSync(dir, { recursive: true });
      const fileStream = fs.createWriteStream(destPath);
      res.pipe(fileStream);
      res.on('data', (chunk) => {
        downloaded += chunk.length;
        if (totalSize > 0) {
          const pct = ((downloaded / totalSize) * 100).toFixed(1);
          const speed = (downloaded / ((Date.now() - startTime) / 1000) / 1024 / 1024).toFixed(1);
          process.stdout.write(`\r  ${pct}% (${(downloaded / 1024 / 1024).toFixed(0)}/${(totalSize / 1024 / 1024).toFixed(0)} MB) ${speed} MB/s  `);
        }
      });
      fileStream.on('finish', () => { process.stdout.write('\n'); resolve({ size: downloaded }); });
      fileStream.on('error', (err) => { fs.unlinkSync(destPath); reject(err); });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

const FAILED_ITEMS = [
  { slug: 'bharat-bhhagya-viddhaata', dbId: 28223, type: 'movie', title: 'Bharat Bhhagya Viddhaata' },
  { slug: 'the-india-story', dbId: 32309, type: 'movie', title: 'The India Story' },
  { slug: 'disclosure-day', dbId: 28242, type: 'movie', title: 'Disclosure Day' },
  { slug: 'do-deewane-seher-mein', dbId: 29325, type: 'movie', title: 'Do Deewane Seher Mein' },
];

async function processItem(item) {
  const pageUrl = item.type === 'movie'
    ? `https://ctgmovies.com/movies/${item.slug}`
    : `https://ctgmovies.com/tv/${item.slug}`;

  log(`Processing: ${item.title}`);

  try {
    const html = await fetchPage(pageUrl);
    const videoUrl = extractVideoUrl(html);
    if (!videoUrl) { log(`  No URL found`); return false; }
    log(`  URL: ${videoUrl.substring(0, 100)}...`);

    const parsedUrl = new URL(videoUrl);
    const decoded = decodeURIComponent(parsedUrl.pathname);
    const match = decoded.match(/\/([^/]+(?:720p|1080p)[^/]*)\//i);
    const folderName = match ? match[1] : item.slug;
    const filename = decodeURIComponent(parsedUrl.pathname.split('/').pop());
    const destDir = path.join(REQUESTED_DIR, 'Movies', folderName);
    const destPath = path.join(destDir, filename);

    if (fs.existsSync(destPath)) { log(`  Already exists`); return true; }

    log(`  Downloading...`);
    const result = await downloadFile(videoUrl, destPath);
    log(`  Done: ${(result.size / 1024 / 1024).toFixed(1)} MB`);

    // Update DB
    const sql = `UPDATE content_catalog SET payload = jsonb_set(payload, '{sourcePath}', to_jsonb('${destPath.replace('/var/www/html/', '/var/www/html/').replace(/'/g, "''")}'::text)), payload = jsonb_set(payload, '{fileSize}', '${result.size}'::jsonb) WHERE id = ${item.dbId};`;
    execSync(`echo '${Buffer.from(sql).toString('base64')}' | base64 -d | PGPASSWORD=postgres psql -U postgres -h localhost -d isp_entertainment -t -A 2>&1`, { encoding: 'utf8', timeout: 10000 });
    log(`  DB updated`);
    return true;
  } catch (err) {
    log(`  ERROR: ${err.message}`);
    return false;
  }
}

async function main() {
  log('=== Retrying failed items ===');
  for (const item of FAILED_ITEMS) {
    await processItem(item);
    await new Promise(r => setTimeout(r, 5000)); // 5 second delay between retries
  }
  log('=== Done ===');
}

main().catch(err => { log(`FATAL: ${err.message}`); process.exit(1); });
