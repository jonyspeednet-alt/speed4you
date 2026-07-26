#!/usr/bin/env node
/**
 * CTGMovies Downloader
 * Fetches download URLs from CTGMovies pages and downloads 720p files.
 * Usage: node ctg-downloader.js
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const MEDIA_ROOT = '/var/www/html';
const REQUESTED_DIR = path.join(MEDIA_ROOT, 'Requested');
const LOG_FILE = '/tmp/ctg-download.log';

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  fs.appendFileSync(LOG_FILE, line + '\n');
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
    if (!url.includes('.hls/') && !url.includes('.audio.')) {
      allUrls.add(url);
    }
  }

  // Prefer 720p, then smallest
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

function getDestPath(url, type) {
  try {
    const parsedUrl = new URL(url);
    const parts = parsedUrl.pathname.split('/').filter(Boolean);
    // The folder name is usually the second-to-last path component
    // e.g. /Indian/South Indian Movies/Con-City (2026).../Con-City...mp4
    // The folder name is the directory containing the file
    let folderName = null;
    if (url.includes('720p')) {
      // Find the 720p folder name from URL
      const decoded = decodeURIComponent(parsedUrl.pathname);
      const match = decoded.match(/\/([^/]+720p[^/]*)\//i);
      if (match) folderName = match[1];
    }
    if (!folderName) {
      // Use the second-to-last path component
      folderName = decodeURIComponent(parts[parts.length - 2] || parts[parts.length - 1]);
    }

    const filename = decodeURIComponent(parts[parts.length - 1]);

    const baseDir = type === 'movie'
      ? path.join(REQUESTED_DIR, 'Movies', folderName)
      : path.join(REQUESTED_DIR, 'Series', folderName);

    return { baseDir, filename, fullPath: path.join(baseDir, filename) };
  } catch {
    return null;
  }
}

function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const client = parsedUrl.protocol === 'https:' ? https : http;

    const req = client.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      timeout: 3600000, // 1 hour
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        downloadFile(res.headers.location, destPath).then(resolve).catch(reject);
        return;
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }

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

      fileStream.on('finish', () => {
        process.stdout.write('\n');
        resolve({ size: downloaded });
      });
      fileStream.on('error', (err) => {
        fs.unlinkSync(destPath);
        reject(err);
      });
    });

    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

// Items to process
const ITEMS = [
  // Movies (29)
  { slug: 'main-vaapas-aaunga', dbId: 27321, type: 'movie', title: 'Main Vaapas Aaunga' },
  { slug: 'bharat-bhhagya-viddhaata', dbId: 28223, type: 'movie', title: 'Bharat Bhhagya Viddhaata' },
  { slug: 'con-city', dbId: 32306, type: 'movie', title: 'Con City' },
  { slug: 'the-india-story', dbId: 32309, type: 'movie', title: 'The India Story' },
  { slug: 'desert-warrior', dbId: 28792, type: 'movie', title: 'Desert Warrior' },
  { slug: 'disclosure-day', dbId: 28242, type: 'movie', title: 'Disclosure Day' },
  { slug: 'the-odyssey', dbId: 27742, type: 'movie', title: 'The Odyssey' },
  { slug: 'royal', dbId: 28251, type: 'movie', title: 'Royal (Red, White & Royal Blue)' },
  { slug: 'ek-din', dbId: 29326, type: 'movie', title: 'Ek Din' },
  { slug: 'mukhbir-the-story-of-a-spy-the-movie', dbId: 31766, type: 'movie', title: 'Mukhbir: The Story of a Spy' },
  { slug: 'dose', dbId: 28025, type: 'movie', title: 'Dose' },
  { slug: 'evil-dead-burn', dbId: 27738, type: 'movie', title: 'Evil Dead Burn' },
  { slug: 'ikka', dbId: 27744, type: 'movie', title: 'Ikka' },
  { slug: 'dhamaal-4', dbId: 32715, type: 'movie', title: 'Dhamaal 4' },
  { slug: 'balti', dbId: 28023, type: 'movie', title: 'Balti' },
  { slug: 'the-furious', dbId: 27612, type: 'movie', title: 'The Furious' },
  { slug: 'passenger', dbId: 29330, type: 'movie', title: 'Passenger' },
  { slug: 'satluj', dbId: 28021, type: 'movie', title: 'Satluj' },
  { slug: 'daadi-ki-shaadi', dbId: 28220, type: 'movie', title: 'Daadi Ki Shaadi' },
  { slug: 'mollywood-times', dbId: 27596, type: 'movie', title: 'Mollywood Times' },
  { slug: 'peddi', dbId: 28249, type: 'movie', title: 'Peddi' },
  { slug: 'tavvai', dbId: 28221, type: 'movie', title: 'Tavvai' },
  { slug: 'obsession', dbId: 28236, type: 'movie', title: 'Obsession' },
  { slug: 'blast', dbId: 27606, type: 'movie', title: 'Blast' },
  { slug: 'enola-holmes-3', dbId: 32721, type: 'movie', title: 'Enola Holmes 3' },
  { slug: 'dridam', dbId: 27609, type: 'movie', title: 'Dridam' },
  { slug: 'bandar', dbId: 28779, type: 'movie', title: 'Bandar' },
  { slug: 'maa-behen', dbId: 29634, type: 'movie', title: 'Maa Behen' },
  { slug: 'do-deewane-seher-mein', dbId: 29325, type: 'movie', title: 'Do Deewane Seher Mein' },
  // Series (16)
  { slug: 'house-of-the-dragon', dbId: 31754, type: 'series', title: 'House of the Dragon' },
  { slug: 'the-east-palace', dbId: 32724, type: 'series', title: 'The East Palace' },
  { slug: 'widow-s-bay', dbId: 31785, type: 'series', title: "Widow's Bay" },
  { slug: 'super-subbu', dbId: 31775, type: 'series', title: 'Super Subbu' },
  { slug: 'pritam-and-pedro', dbId: 31771, type: 'series', title: 'Pritam and Pedro' },
  { slug: 'isakapatnam', dbId: 31758, type: 'series', title: 'Isakapatnam' },
  { slug: 'raakh', dbId: 31772, type: 'series', title: 'Raakh' },
  { slug: 'invincible', dbId: 31757, type: 'series', title: 'INVINCIBLE' },
  { slug: 'maamla-legal-hai', dbId: 31764, type: 'series', title: 'Maamla Legal Hai' },
  { slug: 'matka-king', dbId: 28230, type: 'series', title: 'Matka King' },
  { slug: 'glory', dbId: 31751, type: 'series', title: 'Glory' },
  { slug: 'off-campus', dbId: 31769, type: 'series', title: 'Off Campus' },
  { slug: 'muthu-alias-kaattaan', dbId: 31759, type: 'series', title: 'Kaattaan' },
  { slug: 'kohrra', dbId: 32696, type: 'series', title: 'Kohrra' },
  { slug: '13th-some-lessons-aren-t-taught-in-classrooms', dbId: 31736, type: 'series', title: "13th: Some Lessons Aren't Taught in Classrooms" },
  { slug: 'search-the-naina-murder-case', dbId: 31652, type: 'series', title: 'Search: The Naina Murder Case' },
];

async function processItem(item) {
  const pageUrl = item.type === 'movie'
    ? `https://ctgmovies.com/movies/${item.slug}`
    : `https://ctgmovies.com/tv/${item.slug}`;

  log(`Processing: ${item.title} (${pageUrl})`);

  try {
    const html = await fetchPage(pageUrl);
    const videoUrl = extractVideoUrl(html);

    if (!videoUrl) {
      log(`  No download URL found`);
      return { ...item, status: 'no_url' };
    }

    log(`  URL: ${videoUrl.substring(0, 100)}...`);

    const dest = getDestPath(videoUrl, item.type);
    if (!dest) {
      log(`  Could not determine destination path`);
      return { ...item, status: 'path_error' };
    }

    if (fs.existsSync(dest.fullPath)) {
      const stat = fs.statSync(dest.fullPath);
      log(`  Already exists (${(stat.size / 1024 / 1024).toFixed(0)} MB)`);
      return { ...item, status: 'exists', path: dest.fullPath, size: stat.size };
    }

    log(`  Downloading to: ${dest.fullPath}`);
    const result = await downloadFile(videoUrl, dest.fullPath);
    log(`  Done: ${(result.size / 1024 / 1024).toFixed(1)} MB`);

    return { ...item, status: 'downloaded', path: dest.fullPath, size: result.size };
  } catch (err) {
    log(`  ERROR: ${err.message}`);
    return { ...item, status: 'error', error: err.message };
  }
}

async function main() {
  log('=== CTGMovies Download Script ===');
  log(`Items: ${ITEMS.length}`);

  const results = [];

  for (const item of ITEMS) {
    const result = await processItem(item);
    results.push(result);
    // Small delay between requests
    await new Promise(r => setTimeout(r, 1000));
  }

  // Summary
  const downloaded = results.filter(r => r.status === 'downloaded').length;
  const exists = results.filter(r => r.status === 'exists').length;
  const errors = results.filter(r => r.status === 'error').length;
  const noUrl = results.filter(r => r.status === 'no_url').length;
  const totalSize = results.reduce((sum, r) => sum + (r.size || 0), 0);

  log(`\n=== SUMMARY ===`);
  log(`Downloaded: ${downloaded} (${(totalSize / 1024 / 1024 / 1024).toFixed(2)} GB)`);
  log(`Already exists: ${exists}`);
  log(`Errors: ${errors}`);
  log(`No URL: ${noUrl}`);

  if (errors > 0) {
    log('\nFailed items:');
    results.filter(r => r.status === 'error').forEach(r => {
      log(`  [${r.dbId}] ${r.title}: ${r.error}`);
    });
  }

  fs.writeFileSync('/tmp/ctg-download-results.json', JSON.stringify(results, null, 2));
  log('Results saved to /tmp/ctg-download-results.json');
}

main().catch(err => {
  log(`FATAL: ${err.message}`);
  process.exit(1);
});
