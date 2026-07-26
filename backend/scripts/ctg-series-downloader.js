const https = require('https');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const REQUESTED_DIR = '/var/www/html/Requested/Series';
const LOG_FILE = '/tmp/ctg-series-download.log';

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  fs.appendFileSync(LOG_FILE, line + '\n');
}

function fetchPage(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      timeout: 30000,
    }, (res) => {
      let data = '';
      res.on('data', (c) => { data += c; });
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function extractAllEpisodeUrls(html) {
  const regex = /https?:\/\/(?:ftp|movie|data)\.ctgfun\.com\/[^\s"'<>\\]+?\.(mp4|mkv)/gi;
  let m;
  const allUrls = new Set();
  while ((m = regex.exec(html)) !== null) {
    const u = m[0];
    if (!u.includes('.hls/') && !u.includes('.audio.')) allUrls.add(u);
  }
  return [...allUrls];
}

function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    https.get(url, {
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
      fs.mkdirSync(path.dirname(destPath), { recursive: true });
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
      fileStream.on('error', (err) => { try { fs.unlinkSync(destPath); } catch {} reject(err); });
    }).on('error', reject).on('timeout', function() { this.destroy(); reject(new Error('Timeout')); });
  });
}

// Series to download full episodes for
const SERIES = [
  { slug: 'house-of-the-dragon', title: 'House of the Dragon' },
  { slug: 'the-east-palace', title: 'The East Palace' },
  { slug: 'widow-s-bay', title: "Widow's Bay" },
  { slug: 'super-subbu', title: 'Super Subbu' },
  { slug: 'pritam-and-pedro', title: 'Pritam and Pedro' },
  { slug: 'isakapatnam', title: 'Isakapatnam' },
  { slug: 'raakh', title: 'Raakh' },
  { slug: 'invincible', title: 'INVINCIBLE' },
  { slug: 'maamla-legal-hai', title: 'Maamla Legal Hai' },
  { slug: 'matka-king', title: 'Matka King' },
  { slug: 'glory', title: 'Glory' },
  { slug: 'off-campus', title: 'Off Campus' },
  { slug: 'muthu-alias-kaattaan', title: 'Kaattaan' },
  { slug: 'kohrra', title: 'Kohrra' },
  { slug: '13th-some-lessons-aren-t-taught-in-classrooms', title: '13th: Some Lessons' },
  { slug: 'search-the-naina-murder-case', title: 'Search: The Naina Murder Case' },
];

async function processSeries(series) {
  const pageUrl = `https://ctgmovies.com/tv/${series.slug}`;
  log(`\n=== ${series.title} ===`);
  log(`Fetching: ${pageUrl}`);

  try {
    const html = await fetchPage(pageUrl);
    const allUrls = extractAllEpisodeUrls(html);
    log(`Found ${allUrls.length} video URLs total`);

    // Group by episode: prefer 720p over 1080p
    const episodeMap = {};
    for (const url of allUrls) {
      const decoded = decodeURIComponent(new URL(url).pathname);
      // Extract SxxExx pattern
      const epMatch = decoded.match(/S(\d+)E(\d+)/i);
      if (!epMatch) continue;
      const season = parseInt(epMatch[1]);
      const episode = parseInt(epMatch[2]);
      const key = `S${String(season).padStart(2, '0')}E${String(episode).padStart(2, '0')}`;
      const is720 = url.includes('720p') || url.includes('720');

      if (!episodeMap[key] || (is720 && !episodeMap[key].is720)) {
        episodeMap[key] = { url, is720, season, episode };
      }
    }

    const episodes = Object.entries(episodeMap).sort((a, b) => a[0].localeCompare(b[0]));
    log(`${episodes.length} unique episodes to download`);

    // Find the series folder name from existing files
    const existingFolders = fs.readdirSync(REQUESTED_DIR).filter(d => {
      try { return fs.statSync(path.join(REQUESTED_DIR, d)).isDirectory(); } catch { return false; }
    });
    
    // Match existing folder
    let folderName = null;
    for (const f of existingFolders) {
      if (f.toLowerCase().includes(series.title.toLowerCase().substring(0, 8)) ||
          series.title.toLowerCase().includes(f.toLowerCase().substring(0, 8))) {
        folderName = f;
        break;
      }
    }
    
    if (!folderName) {
      // Use the folder name from the first URL
      const firstUrl = episodes[0]?.[1]?.url;
      if (firstUrl) {
        const decoded = decodeURIComponent(new URL(firstUrl).pathname);
        const parts = decoded.split('/');
        // Find the folder containing the episode files
        for (let i = parts.length - 2; i >= 0; i--) {
          if (parts[i].includes('720p') || parts[i].includes('1080p')) {
            folderName = parts[i];
            break;
          }
        }
      }
    }

    if (!folderName) {
      log('Could not determine folder name, using slug');
      folderName = series.slug;
    }

    const seriesDir = path.join(REQUESTED_DIR, folderName);
    fs.mkdirSync(seriesDir, { recursive: true });
    log(`Series dir: ${seriesDir}`);

    let downloaded = 0;
    let skipped = 0;
    let errors = 0;

    for (const [epKey, ep] of episodes) {
      const decoded = decodeURIComponent(new URL(ep.url).pathname);
      const filename = decoded.split('/').pop();
      const destPath = path.join(seriesDir, filename);

      if (fs.existsSync(destPath)) {
        skipped++;
        continue;
      }

      log(`  Downloading ${epKey}...`);
      try {
        const result = await downloadFile(ep.url, destPath);
        log(`  ${epKey} done: ${(result.size / 1024 / 1024).toFixed(1)} MB`);
        downloaded++;
      } catch (err) {
        log(`  ${epKey} ERROR: ${err.message}`);
        errors++;
      }

      // Small delay between downloads
      await new Promise(r => setTimeout(r, 500));
    }

    log(`Summary: ${downloaded} downloaded, ${skipped} skipped, ${errors} errors`);
    return { title: series.title, downloaded, skipped, errors, total: episodes.length };
  } catch (err) {
    log(`ERROR: ${err.message}`);
    return { title: series.title, downloaded: 0, skipped: 0, errors: 1, total: 0 };
  }
}

async function main() {
  log('=== CTGMovies Full Series Downloader ===');
  log(`Series to process: ${SERIES.length}`);

  const results = [];
  for (const series of SERIES) {
    const result = await processSeries(series);
    results.push(result);
    await new Promise(r => setTimeout(r, 2000));
  }

  log('\n=== FINAL SUMMARY ===');
  let totalDl = 0, totalSk = 0, totalErr = 0;
  for (const r of results) {
    log(`${r.title}: ${r.downloaded} downloaded, ${r.skipped} skipped, ${r.errors} errors (${r.total} total episodes)`);
    totalDl += r.downloaded;
    totalSk += r.skipped;
    totalErr += r.errors;
  }
  log(`\nTotal: ${totalDl} downloaded, ${totalSk} skipped, ${totalErr} errors`);

  fs.writeFileSync('/tmp/ctg-series-results.json', JSON.stringify(results, null, 2));
}

main().catch(err => { log(`FATAL: ${err.message}`); process.exit(1); });
