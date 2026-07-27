#!/usr/bin/env node
/**
 * MovieLinkBD Downloader
 * Uses Puppeteer to bypass Cloudflare and download movies from MovieLinkBD
 * 
 * Usage:
 *   node movielinkbd-downloader.js                  # Download all missing items
 *   node movielinkbd-downloader.js --search "Big Fish"  # Search and download one movie
 *   node movielinkbd-downloader.js --test            # Test Cloudflare bypass
 */

import puppeteer from 'puppeteer-core';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const BASE_URL = 'https://7wa7df.movielinkbd.li';
const MEDIA_ROOT = '/var/www/html';
const LOG_FILE = '/tmp/movielinkbd-download.log';

// Missing movies that need recovery (DB ID → search title)
const MISSING_MOVIES = [
  { id: 269, title: 'Big Fish', year: 2003 },
  { id: 274, title: 'Oculus', year: 2014 },
  { id: 310, title: 'Mumbai Police', year: 2013 },
  { id: 292, title: 'Meet Joe Black', year: 1998 },
  { id: 316, title: 'The Man from U.N.C.L.E.', year: 2015 },
  { id: 319, title: 'Focus', year: 2015 },
  { id: 333, title: 'Edge of Tomorrow', year: 2014 },
  { id: 335, title: 'The Grand Budapest Hotel', year: 2014 },
  { id: 341, title: 'Birdman', year: 2014 },
  { id: 348, title: 'Nightcrawler', year: 2014 },
  { id: 357, title: 'Ex Machina', year: 2015 },
  { id: 360, title: 'The Hateful Eight', year: 2015 },
  { id: 362, title: 'Room', year: 2015 },
  { id: 366, title: 'Brooklyn', year: 2015 },
  { id: 369, title: 'The Revenant', year: 2015 },
  { id: 370, title: 'Spotlight', year: 2015 },
  { id: 372, title: 'The Big Short', year: 2015 },
  { id: 377, title: 'Sicario', year: 2015 },
  { id: 381, title: 'The Martian', year: 2015 },
  { id: 386, title: 'Creed', year: 2015 },
  { id: 387, title: 'Bridge of Spies', year: 2015 },
  { id: 389, title: 'Star Wars: The Force Awakens', year: 2015 },
  { id: 390, title: 'Inside Out', year: 2015 },
  { id: 393, title: 'Mad Max: Fury Road', year: 2015 },
  { id: 394, title: 'The Revenant', year: 2015 },
  { id: 395, title: 'Spotlight', year: 2015 },
  { id: 399, title: 'Arrival', year: 2016 },
  { id: 400, title: 'La La Land', year: 2016 },
  { id: 401, title: 'Moonlight', year: 2016 },
  { id: 402, title: 'Manchester by the Sea', year: 2016 },
  { id: 403, title: 'Hell or High Water', year: 2016 },
  { id: 404, title: 'Captain Fantastic', year: 2016 },
  { id: 405, title: 'Lion', year: 2016 },
  { id: 406, title: 'Fences', year: 2016 },
  { id: 407, title: 'Hidden Figures', year: 2016 },
  { id: 408, title: 'Hacksaw Ridge', year: 2016 },
  { id: 409, title: 'Nocturnal Animals', year: 2016 },
  { id: 410, title: 'The Light Between Oceans', year: 2016 },
  { id: 411, title: 'American Honey', year: 2016 },
  { id: 412, title: 'Jackie', year: 2016 },
  { id: 413, title: '20th Century Women', year: 2016 },
  { id: 414, title: 'Paterson', year: 2016 },
  { id: 415, title: 'Toni Erdmann', year: 2016 },
  { id: 416, title: 'The Salesman', year: 2016 },
  { id: 417, title: 'Elle', year: 2016 },
  { id: 418, title: 'Under the Shadow', year: 2016 },
  { id: 419, title: 'My Life as a Zucchini', year: 2016 },
  { id: 420, title: 'The Red Turtle', year: 2016 },
  { id: 421, title: 'Land of Mine', year: 2016 },
  { id: 422, title: 'A Man Called Ove', year: 2015 },
  { id: 423, title: 'Mustang', year: 2015 },
  { id: 424, title: 'Theeb', year: 2014 },
  { id: 425, title: 'Tangerine', year: 2015 },
  { id: 426, title: 'Dheepan', year: 2015 },
];

// Missing series
const MISSING_SERIES = [
  { id: 441, title: 'Ayyana Mane', type: 'series' },
  { id: 442, title: 'Abhay', type: 'series' },
  { id: 443, title: 'Candy', type: 'series' },
];

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  fs.appendFileSync(LOG_FILE, line + '\n');
}

async function launchBrowser() {
  return puppeteer.launch({
    headless: 'new',
    executablePath: '/usr/bin/google-chrome',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-blink-features=AutomationControlled',
      '--window-size=1920,1080',
    ],
    ignoreDefaultArgs: ['--enable-automation'],
  });
}

async function searchMovie(page, query) {
  const searchUrl = `${BASE_URL}/search?q=${encodeURIComponent(query)}`;
  log(`Searching: ${searchUrl}`);
  
  await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });
  
  // Wait for Cloudflare challenge to resolve (if any)
  await page.waitForFunction(() => !document.title.includes('Just a moment'), { timeout: 15000 }).catch(() => {});
  
  // Wait for movie cards to appear
  await page.waitForSelector('.movie-card a, .movie-cards-container a', { timeout: 10000 }).catch(() => {});
  
  // Extract movie page URLs from search results
  const results = await page.evaluate(() => {
    const cards = document.querySelectorAll('.movie-card');
    return Array.from(cards).map(card => {
      const link = card.querySelector('a');
      const title = card.querySelector('.title');
      return {
        url: link ? link.href : null,
        title: title ? title.textContent.trim() : null,
      };
    }).filter(r => r.url);
  });
  
  return results;
}

async function getDownloadUrl(page, moviePageUrl) {
  log(`Getting download URL from: ${moviePageUrl}`);
  
  await page.goto(moviePageUrl, { waitUntil: 'networkidle2', timeout: 30000 });
  await page.waitForFunction(() => !document.title.includes('Just a moment'), { timeout: 15000 }).catch(() => {});
  
  // Wait for page content to load
  await new Promise(r => setTimeout(r, 2000));
  
  // Find and click the download button to navigate to getLink page
  const clicked = await page.evaluate(() => {
    // Look for download button (vn-red class or text containing "Download")
    const btns = document.querySelectorAll('a');
    for (const btn of btns) {
      const text = (btn.textContent || '').toLowerCase();
      if (text.includes('download') && !text.includes('how to') && !text.includes('vlc')) {
        // Found a download button
        btn.click();
        return true;
      }
    }
    return false;
  });
  
  if (!clicked) {
    log('No download button found on movie page');
    return null;
  }
  
  log('Clicked download button, waiting for navigation...');
  
  // Wait for navigation to getLink page
  await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {});
  await new Promise(r => setTimeout(r, 2000));
  
  const currentUrl = page.url();
  log(`Navigated to: ${currentUrl}`);
  
  // Debug: log page content
  const pageContent = await page.evaluate(() => {
    return {
      title: document.title,
      bodyText: document.body ? document.body.innerText.substring(0, 500) : 'no body',
      links: Array.from(document.querySelectorAll('a')).map(a => ({
        href: a.href,
        text: (a.textContent || '').trim().substring(0, 50),
      })).filter(a => a.href && !a.href.includes('javascript')).slice(0, 20),
    };
  });
  log(`Page content: ${JSON.stringify(pageContent, null, 2)}`);
  
  // Now we should be on the getLink page
  // Look for the actual download URL (xcloud/mcloud)
  const downloadUrl = await page.evaluate(() => {
    // Look for xcloud download link
    const links = document.querySelectorAll('a[href*="xcloud"], a[href*="mcloud"]');
    if (links.length > 0) return links[0].href;
    
    // Look for "DOWNLOAD NOW" button
    const allLinks = document.querySelectorAll('a');
    for (const link of allLinks) {
      const text = (link.textContent || '').toLowerCase();
      if (text.includes('download now') || text.includes('one click')) {
        return link.href;
      }
    }
    
    // Look for any external download link
    for (const link of allLinks) {
      const href = link.href || '';
      if (href.includes('/file/') || href.includes('xcloud') || href.includes('mcloud')) {
        return href;
      }
    }
    
    return null;
  });
  
  return downloadUrl;
}

async function downloadFile(page, url, filename, destDir) {
  const destPath = path.join(destDir, filename);
  
  if (fs.existsSync(destPath)) {
    log(`File already exists: ${destPath}`);
    return destPath;
  }
  
  log(`Downloading: ${url} → ${destPath}`);
  
  // Get cookies from the page for curl
  const cookies = await page.cookies();
  const cookieStr = cookies.map(c => `${c.name}=${c.value}`).join('; ');
  
  // Use curl with cookies and follow redirects
  try {
    const curlCmd = `curl -L --max-time 600 -o "${destPath}" -b "${cookieStr}" "${url}" 2>&1`;
    execSync(curlCmd, { timeout: 620000, stdio: 'pipe' });
    
    // Check if file was downloaded
    if (fs.existsSync(destPath)) {
      const stats = fs.statSync(destPath);
      if (stats.size > 100000) { // At least 100KB
        log(`Downloaded: ${destPath} (${(stats.size / 1024 / 1024).toFixed(1)} MB)`);
        return destPath;
      } else {
        log(`File too small (${stats.size} bytes), removing`);
        fs.unlinkSync(destPath);
      }
    }
  } catch (e) {
    log(`Curl download failed: ${e.message}`);
  }
  
  // If curl failed, try navigating with the browser
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    const finalUrl = page.url();
    log(`Browser redirected to: ${finalUrl}`);
    
    // Try to find video source
    const videoUrl = await page.evaluate(() => {
      const video = document.querySelector('video');
      if (video) return video.src;
      const source = document.querySelector('video source');
      if (source) return source.src;
      return null;
    });
    
    if (videoUrl) {
      execSync(`curl -L --max-time 600 -o "${destPath}" -b "${cookieStr}" "${videoUrl}" 2>&1`, { timeout: 620000 });
      if (fs.existsSync(destPath) && fs.statSync(destPath).size > 100000) {
        log(`Downloaded from video source: ${destPath}`);
        return destPath;
      }
    }
  } catch (e) {
    log(`Browser download failed: ${e.message}`);
  }
  
  return null;
}

function getDestDir(title) {
  // Determine destination directory based on title
  const lower = title.toLowerCase();
  
  // Check if it's a series
  if (MISSING_SERIES.some(s => s.title.toLowerCase() === lower)) {
    return path.join(MEDIA_ROOT, 'Requested/Series');
  }
  
  return path.join(MEDIA_ROOT, 'Requested/Movies');
}

function sanitizeFilename(title) {
  return title
    .replace(/[^\w\s\-\.()]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function main() {
  const args = process.argv.slice(2);
  const isTest = args.includes('--test');
  const searchQuery = args.find((_, i, a) => a[i - 1] === '--search');
  
  log('=== MovieLinkBD Downloader Started ===');
  
  const browser = await launchBrowser();
  const page = await browser.newPage();
  
  // Set a realistic viewport
  await page.setViewport({ width: 1920, height: 1080 });
  
  // Apply stealth measures
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
    Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
    Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
    window.chrome = { runtime: {} };
  });
  
  try {
    if (isTest) {
      log('Testing Cloudflare bypass...');
      await page.goto(BASE_URL, { waitUntil: 'networkidle2', timeout: 30000 });
      const title = await page.title();
      log(`Page title: ${title}`);
      
      if (title.includes('Just a moment')) {
        log('WARNING: Cloudflare challenge not resolved');
      } else {
        log('SUCCESS: Cloudflare bypass working!');
      }
      return;
    }
    
    if (searchQuery) {
      // Search and download a single movie
      const results = await searchMovie(page, searchQuery);
      log(`Found ${results.length} results for "${searchQuery}"`);
      
      for (const result of results.slice(0, 3)) {
        log(`  - ${result.title}: ${result.url}`);
      }
      
      if (results.length > 0) {
        const downloadUrl = await getDownloadUrl(page, results[0].url);
        if (downloadUrl) {
          log(`Download URL: ${downloadUrl}`);
          const destDir = getDestDir(searchQuery);
          const filename = `${sanitizeFilename(searchQuery)}.mkv`;
          await downloadFile(page, downloadUrl, filename, destDir);
        }
      }
    } else {
      // Download all missing items
      const allItems = [...MISSING_MOVIES, ...MISSING_SERIES];
      let downloaded = 0;
      let failed = 0;
      
      for (const item of allItems) {
        log(`\n--- Processing: ${item.title} (ID: ${item.id}) ---`);
        
        try {
          const results = await searchMovie(page, item.title);
          
          if (results.length === 0) {
            log(`No results found for "${item.title}"`);
            failed++;
            continue;
          }
          
          // Try first result
          const downloadUrl = await getDownloadUrl(page, results[0].url);
          
          if (!downloadUrl) {
            log(`Could not get download URL for "${item.title}"`);
            failed++;
            continue;
          }
          
          const destDir = getDestDir(item.title);
          const filename = `${sanitizeFilename(item.title)} (${item.year || ''}).mkv`.replace(/\(\)/, '');
          const result = await downloadFile(page, downloadUrl, filename, destDir);
          
          if (result) {
            downloaded++;
            // Update DB sourcePath
            const relPath = path.relative(MEDIA_ROOT, result);
            try {
              execSync(`PGPASSWORD=postgres psql -U postgres -h localhost -d isp_entertainment -c "UPDATE content_catalog SET payload = jsonb_set(payload, '{sourcePath}', '"'"'/${relPath}'"'"'::jsonb) WHERE id = ${item.id};" 2>&1`, { timeout: 10000 });
              log(`Updated DB: ID ${item.id} → /${relPath}`);
            } catch (e) {
              log(`DB update failed: ${e.message}`);
            }
          } else {
            failed++;
          }
          
          // Rate limit
          await new Promise(r => setTimeout(r, 2000));
          
        } catch (e) {
          log(`Error processing "${item.title}": ${e.message}`);
          failed++;
        }
      }
      
      log(`\n=== SUMMARY ===`);
      log(`Downloaded: ${downloaded}`);
      log(`Failed: ${failed}`);
      log(`Total: ${allItems.length}`);
    }
    
  } finally {
    await browser.close();
  }
  
  log('=== MovieLinkBD Downloader Finished ===');
}

main().catch(e => {
  log(`FATAL: ${e.message}`);
  process.exit(1);
});
