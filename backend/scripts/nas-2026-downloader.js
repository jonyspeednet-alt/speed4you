#!/usr/bin/env node
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const MEDIA_ROOT = '/var/www/html';
const NAS_BASE = 'http://198.20.20.20';

const downloads = [
  { 
    id: null, title: 'Chand Mera Dil', nasPath: '/NAS1/New_Collection/2026/05.%5B2026%5DMay/Chand%20Mera%20Dil%20(2026)/',
    searchTitle: 'Chand Mera Dil' },
  { 
    id: null, title: 'Everybody Loves Sohrab Handa', nasPath: '/NAS1/New_Collection/2026/04.%5B2025%5DApril/Everybody%20Loves%20Sohrab%20Handa%20(2026)/',
    searchTitle: 'Everybody Loves Sohrab Handa' },
  { 
    id: null, title: 'Others', nasPath: '/NAS1/New_Collection/2026/01.%5B2026%5D%20January/Others%20(2025)%201080p%20%5BDual%20Audio%5D/',
    searchTitle: 'Others' },
  { 
    id: null, title: 'Peaky Blinders The Immortal Man', nasPath: '/NAS1/New_Collection/2026/03.%5B2026%5DMarch/Peaky%20Blinders%3A%20The%20Immortal%20Man%20(2026)%201080p%20%5BDual%20Audio%5D/',
    searchTitle: 'Peaky Blinders' },
];

function log(msg) { console.log(`[${new Date().toISOString()}] ${msg}`); }

function findVideoInDir(nasPath) {
  const url = `${NAS_BASE}${nasPath}`;
  try {
    const html = execSync(`curl -s -H 'User-Agent: Mozilla/5.0' '${url}' 2>&1`, { timeout: 15000 }).toString();
    const videoExts = ['.mkv', '.mp4', '.avi', '.mov'];
    const regex = /href="([^"]+)"/g;
    let match;
    const files = [];
    while ((match = regex.exec(html)) !== null) {
      const href = match[1];
      const decoded = decodeURIComponent(href);
      const ext = path.extname(decoded).toLowerCase();
      if (videoExts.includes(ext)) {
        files.push({ name: path.basename(decoded), href: decoded });
      }
    }
    return files;
  } catch (e) {
    log(`  Error listing: ${e.message}`);
    return [];
  }
}

function downloadFile(nasHref, destPath) {
  // Use the raw href from the HTML (already URL-encoded)
  const fileUrl = `${NAS_BASE}${nasHref}`;
  log(`  Downloading: ${fileUrl}`);
  try {
    // Use --globoff to prevent curl from treating [] as glob patterns
    execSync(`curl -L -g -H 'User-Agent: Mozilla/5.0' --max-time 3600 -o "${destPath}" "${fileUrl}" 2>&1`, { timeout: 3610000 });
    if (fs.existsSync(destPath) && fs.statSync(destPath).size > 100000) {
      const size = (fs.statSync(destPath).size / 1024 / 1024).toFixed(1);
      log(`  OK: ${destPath} (${size} MB)`);
      return true;
    }
    return false;
  } catch (e) {
    log(`  Failed: ${e.message}`);
    return false;
  }
}

function main() {
  log('=== NAS New Collection 2026 Downloader ===');
  
  // First find DB IDs
  for (const item of downloads) {
    try {
      const result = execSync(`PGPASSWORD=postgres psql -U postgres -h localhost -d isp_entertainment -t -A -c "SELECT id FROM content_catalog WHERE title ILIKE '%${item.searchTitle}%' AND status='published' AND (payload->>'sourcePath' IS NULL OR payload->>'sourcePath'='');" 2>&1`, { timeout: 10000 }).toString().trim();
      if (result) {
        item.id = parseInt(result);
        log(`Found DB ID for "${item.title}": ${item.id}`);
      } else {
        log(`No DB entry for "${item.title}"`);
      }
    } catch (e) {
      log(`DB lookup error for "${item.title}": ${e.message}`);
    }
  }

  let downloaded = 0;
  let failed = 0;

  for (const item of downloads) {
    log(`\n--- ${item.title} ---`);
    
    const files = findVideoInDir(item.nasPath);
    if (files.length === 0) {
      log(`  No video files found`);
      failed++;
      continue;
    }
    
    log(`  Found ${files.length} video(s): ${files.map(f => f.name).join(', ')}`);
    
    const video = files[0]; // Take first video
    const ext = path.extname(video.name);
    const destPath = path.join(MEDIA_ROOT, 'Requested', 'Movies', `${item.title}${ext}`);
    
    if (fs.existsSync(destPath)) {
      log(`  Already exists: ${destPath}`);
      downloaded++;
    } else {
      const success = downloadFile(video.href, destPath);
      if (success) {
        downloaded++;
        
        // Update DB
        if (item.id) {
          const relPath = path.relative(MEDIA_ROOT, destPath);
          const sqlFile = `/tmp/update-nas-${item.id}.sql`;
          fs.writeFileSync(sqlFile, `UPDATE content_catalog SET payload = jsonb_set(payload, '{sourcePath}', '"/${relPath}"::jsonb') WHERE id = ${item.id};`);
          try {
            execSync(`PGPASSWORD=postgres psql -U postgres -h localhost -d isp_entertainment -f "${sqlFile}" 2>&1`, { timeout: 10000 });
            log(`  DB updated: id=${item.id}`);
          } catch (e) {
            log(`  DB update failed: ${e.message}`);
          }
        }
      } else {
        failed++;
      }
    }
  }

  log(`\n=== SUMMARY ===`);
  log(`Downloaded: ${downloaded}`);
  log(`Failed: ${failed}`);
}

main();
