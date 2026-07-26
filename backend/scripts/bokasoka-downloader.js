#!/usr/bin/env node

const http = require('http');
const fs = require('fs');
const path = require('path');

const NAS_BASE = 'http://198.20.20.20';
const MEDIA_ROOT = '/var/www/html';

// Items to download from bokasoka.net NAS
// Each item has a parent directory URL that lists the actual files
const ITEMS = [
  // IMDb Top 250 - these are directories containing .mkv files
  { dbId: 28165, title: 'The Green Mile', parentUrl: '/NAS1/Movies_Collection/IMDb_Top-250%20Movies/028.%20The%20Green%20Mile%20(1999)%201080p%20%5BDual%20Audio%5D/', destDir: 'Requested/Movies', prefix: 'The Green Mile' },
  { dbId: 28163, title: 'Spirited Away', parentUrl: '/NAS1/Movies_Collection/IMDb_Top-250%20Movies/032.%20Spirited%20Away%20(2001)%201080p%20%5BMulti%20Audio%5D/', destDir: 'Requested/Movies', prefix: 'Spirited Away' },
  { dbId: 28162, title: "Pan's Labyrinth", parentUrl: "/NAS1/Movies_Collection/IMDb_Top-250%20Movies/146.%20Pan's%20Labyrinth%20(2006)%201080p/", destDir: 'Requested/Movies', prefix: "Pan's Labyrinth" },
  { dbId: 28210, title: 'Toy Story', parentUrl: '/NAS1/Movies_Collection/IMDb_Top-250%20Movies/077.%20Toy%20Story%20(1995)%201080p%20%5BDual%20Audio%5D/', destDir: 'Requested/Movies', prefix: 'Toy Story' },
  { dbId: 28159, title: 'The Hobbit: Battle of the Five Armies', parentUrl: '/NAS1/Movies_Collection/Hollywood_Movies/2014_Hollywood/The%20Hobbit-The%20Battle%20of%20the%20Five%20Armies%20(2014)/', destDir: 'Requested/Movies', prefix: 'The Hobbit' },
  { dbId: 28246, title: 'Deliver Us from Evil', parentUrl: '/NAS1/Movies_Collection/Hollywood_Movies/2014_Hollywood/Deliver%20Us%20from%20Evil%20(2014)/', destDir: 'Requested/Movies', prefix: 'Deliver Us from Evil' },
  { dbId: 28119, title: 'The Martian', parentUrl: '/NAS1/Movies_Collection/Hollywood_Movies/2015_Hollywood/The%20Martian%20(2015)/', destDir: 'Requested/Movies', prefix: 'The Martian' },
  { dbId: 27610, title: 'The Night Crew', parentUrl: '/NAS1/Movies_Collection/Hollywood_Movies/2015_Hollywood/The%20Night%20Crew%20(2015)/', destDir: 'Requested/Movies', prefix: 'The Night Crew' },
  { dbId: 28078, title: 'Sufiyum Sujatayum', parentUrl: '/NAS1/Bollywood_South_Indian_Movies/South_Indian_Movies/Malayalam_Movies/2020-Malayalam/Sufiyum%20Sujatayum%20(2020)/', destDir: 'Requested/Movies', prefix: 'Sufiyum Sujatayum' },
  { dbId: 28128, title: 'Varane Avashyamund', parentUrl: '/NAS1/Bollywood_South_Indian_Movies/South_Indian_Movies/Malayalam_Movies/2020-Malayalam/Varane%20Avashyamund%20%20(2020)/', destDir: 'Requested/Movies', prefix: 'Varane Avashyamund' },
  { dbId: 27516, title: 'Joji', parentUrl: '/NAS1/Bollywood_South_Indian_Movies/South_Indian_Movies/Malayalam_Movies/2021-Malayalam/Joji%20(2021)/', destDir: 'Requested/Movies', prefix: 'Joji' },
  { dbId: 32303, title: 'Alaap', parentUrl: '/NAS1/Movies_Collection/Bangla_Collection/Indian_Bangla_Movies/2024_Indian%20Bangla/Alaap%20(2024)/', destDir: 'Requested/Movies', prefix: 'Alaap' },
];

function fetchPage(url) {
  return new Promise((resolve, reject) => {
    const opts = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 30000
    };
    http.get(url, opts, (res) => {
      let data = '';
      res.on('data', (c) => data += c);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function parseH5aiDirectory(html) {
  // h5ai uses <a href="..."> in fallback table
  const files = [];
  const regex = /<a\s+href="([^"]+)"[^>]*>([^<]+)<\/a>/g;
  let m;
  while ((m = regex.exec(html)) !== null) {
    const href = m[1];
    const name = m[2].trim();
    if (name === 'Parent Directory' || name === '..') continue;
    // Skip directories (they end with /)
    if (href.endsWith('/')) continue;
    // Only media files
    if (/\.(mkv|mp4|avi|wmv|flv|ts)$/i.test(name)) {
      files.push({ name, href });
    }
  }
  return files;
}

function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const opts = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 600000
    };
    http.get(url, opts, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        downloadFile(res.headers.location, destPath).then(resolve).catch(reject);
        return;
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }
      const dir = path.dirname(destPath);
      fs.mkdirSync(dir, { recursive: true });
      const file = fs.createWriteStream(destPath);
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(); });
      file.on('error', (err) => { try { fs.unlinkSync(destPath); } catch(e) {} reject(err); });
    }).on('error', reject);
  });
}

function formatSize(bytes) {
  if (bytes > 1073741824) return (bytes / 1073741824).toFixed(1) + ' GB';
  if (bytes > 1048576) return (bytes / 1048576).toFixed(0) + ' MB';
  return bytes + ' B';
}

async function main() {
  const results = { downloaded: [], skipped: [], errors: [] };
  const dryRun = process.argv.includes('--dry-run');

  for (const item of ITEMS) {
    console.log(`\n=== ${item.title} (DB ${item.dbId}) ===`);

    try {
      const fullUrl = NAS_BASE + item.parentUrl;
      console.log(`  Fetching: ${fullUrl}`);
      const html = await fetchPage(fullUrl);

      const files = parseH5aiDirectory(html);
      if (files.length === 0) {
        console.log(`  SKIP: No media files found in directory`);
        results.skipped.push(item);
        continue;
      }

      console.log(`  Found ${files.length} media file(s):`);
      for (const f of files) {
        console.log(`    - ${f.name}`);
      }

      for (const f of files) {
        const fileUrl = NAS_BASE + f.href;
        const destPath = path.join(MEDIA_ROOT, item.destDir, f.name);

        if (dryRun) {
          console.log(`  WOULD DOWNLOAD: ${fileUrl}`);
          console.log(`    -> ${destPath}`);
        } else {
          try {
            console.log(`  Downloading: ${f.name}...`);
            await downloadFile(fileUrl, destPath);
            const stat = fs.statSync(destPath);
            console.log(`  DONE: ${formatSize(stat.size)}`);
            results.downloaded.push({ ...item, file: f.name, size: stat.size });
          } catch(err) {
            console.log(`  ERROR: ${err.message}`);
            results.errors.push({ ...item, file: f.name, error: err.message });
          }
        }
      }
    } catch(err) {
      console.log(`  ERROR: ${err.message}`);
      results.errors.push({ ...item, error: err.message });
    }
  }

  console.log(`\n=== SUMMARY ===`);
  console.log(`Downloaded: ${results.downloaded.length}`);
  console.log(`Skipped: ${results.skipped.length}`);
  console.log(`Errors: ${results.errors.length}`);

  fs.writeFileSync('/tmp/bokasoka-results.json', JSON.stringify(results, null, 2));
  console.log(`Results saved to /tmp/bokasoka-results.json`);
}

main().catch(console.error);
