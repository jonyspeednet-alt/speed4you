#!/usr/bin/env node
/**
 * NAS Downloader - Downloads missing movies from bokasoka.net NAS (198.20.20.20)
 * 
 * Usage:
 *   node nas-downloader.mjs              # Download all found items
 *   node nas-downloader.mjs --list       # Just list what's available
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const MEDIA_ROOT = '/var/www/html';
const NAS_BASE = 'http://198.20.20.20';

// Missing items mapped to NAS paths
const NAS_MAPPINGS = [
  // From IMDb Top 250
  { id: 335, title: 'The Grand Budapest Hotel', year: 2014, nasPath: '/NAS1/Movies_Collection/IMDb_Top-250 Movies/186. The Grand Budapest Hotel (2014) 1080p' },
  { id: 408, title: 'Hacksaw Ridge', year: 2016, nasPath: '/NAS1/Movies_Collection/IMDb_Top-250 Movies/190. Hacksaw Ridge (2016) 1080p' },
  { id: 393, title: 'Mad Max: Fury Road', year: 2015, nasPath: '/NAS1/Movies_Collection/IMDb_Top-250 Movies/199. Mad Max-Fury Road (2015) 1080p [Dual Audio]' },
  { id: 390, title: 'Inside Out', year: 2015, nasPath: '/NAS1/Movies_Collection/IMDb_Top-250 Movies/167. Inside Out (2015) 1080p' },
  { id: 362, title: 'Room', year: 2015, nasPath: '/NAS1/Movies_Collection/IMDb_Top-250 Movies/213. Room (2015) 1080p' },
  { id: 370, title: 'Spotlight', year: 2015, nasPath: '/NAS1/Movies_Collection/IMDb_Top-250 Movies/217. Spotlight (2015) 1080p' },

  // From Hollywood Movies by Year
  { id: 341, title: 'Birdman', year: 2014, nasPath: '/NAS1/Movies_Collection/Hollywood_Movies/2014_Hollywood/Birdman (2014)' },
  { id: 333, title: 'Edge of Tomorrow', year: 2014, nasPath: '/NAS1/Movies_Collection/Hollywood_Movies/2014_Hollywood/Edge of Tomorrow (2014)' },
  { id: 348, title: 'Nightcrawler', year: 2014, nasPath: '/NAS1/Movies_Collection/Hollywood_Movies/2014_Hollywood/Nightcrawler (2014) 720p [Dual Audio]' },
  { id: 316, title: 'The Man from U.N.C.L.E.', year: 2015, nasPath: '/NAS1/Movies_Collection/Hollywood_Movies/2015_Hollywood/The Man from U.N.C.L.E. (2015)' },
  { id: 319, title: 'Focus', year: 2015, nasPath: '/NAS1/Movies_Collection/Hollywood_Movies/2015_Hollywood/Focus (2015)' },
  { id: 366, title: 'Brooklyn', year: 2015, nasPath: '/NAS1/Movies_Collection/Hollywood_Movies/2015_Hollywood/Brooklyn (2015)' },
  { id: 386, title: 'Creed', year: 2015, nasPath: '/NAS1/Movies_Collection/Hollywood_Movies/2015_Hollywood/Creed (2015)' },
  { id: 387, title: 'Bridge of Spies', year: 2015, nasPath: '/NAS1/Movies_Collection/Hollywood_Movies/2015_Hollywood/Bridge of Spies (2015)' },
  { id: 377, title: 'Sicario', year: 2015, nasPath: '/NAS1/Movies_Collection/Hollywood_Movies/2015_Hollywood/Sicario (2015)' },
  { id: 381, title: 'The Martian', year: 2015, nasPath: '/NAS1/Movies_Collection/Hollywood_Movies/2015_Hollywood/The Martian (2015)' },
  { id: 360, title: 'The Hateful Eight', year: 2015, nasPath: '/NAS1/Movies_Collection/Hollywood_Movies/2015_Hollywood/The Hateful Eight (2015)' },
  { id: 369, title: 'The Revenant', year: 2015, nasPath: '/NAS1/Movies_Collection/Hollywood_Movies/2015_Hollywood/The Revenant (2015)' },
  { id: 372, title: 'The Big Short', year: 2015, nasPath: '/NAS1/Movies_Collection/Hollywood_Movies/2015_Hollywood/The Big Short (2015)' },
  { id: 389, title: 'Star Wars: The Force Awakens', year: 2015, nasPath: '/NAS1/Movies_Collection/Hollywood_Movies/2015_Hollywood/Star Wars-Episode VII - The Force Awakens (2015)' },
];

function log(msg) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

function findVideoFile(dir) {
  // List directory contents and find video files
  try {
    const url = `${NAS_BASE}${encodeURIComponent(dir).replace(/%2F/g, '/')}/`;
    const result = execSync(`curl -s -H 'User-Agent: Mozilla/5.0' "${url}" 2>&1`, { timeout: 30000 }).toString();
    
    // Parse h5ai directory listing for video files
    const videoExts = ['.mkv', '.mp4', '.avi', '.mov', '.ts', '.flv'];
    const files = [];
    
    // Match file links in h5ai format: <a href="...">filename</a>
    const linkRegex = /href="([^"]+)"/g;
    let match;
    while ((match = linkRegex.exec(result)) !== null) {
      const href = match[1];
      const ext = path.extname(href).toLowerCase();
      if (videoExts.includes(ext)) {
        // Get just the filename, not the full path
        const filename = path.basename(href);
        files.push({ filename, fullHref: href });
      }
    }
    
    return files;
  } catch (e) {
    log(`  Error listing ${dir}: ${e.message}`);
    return [];
  }
}

function downloadFromNAS(nasPath, destPath) {
  if (fs.existsSync(destPath)) {
    log(`  Already exists: ${destPath}`);
    return true;
  }
  
  log(`  Listing: ${nasPath}`);
  
  try {
    // First check if it's a directory or file
    const files = findVideoFile(nasPath);
    
    if (files.length === 0) {
      log(`  No files found in ${nasPath}`);
      return false;
    }
    
    log(`  Found ${files.length} file(s): ${files.map(f => f.filename).join(', ')}`);
    
    // Find the actual video file (prefer largest)
    const videoFile = files[0]; // Take the first (usually only) video file
    
    if (videoFile) {
      // Direct download using the full href from h5ai
      const fileUrl = `${NAS_BASE}${videoFile.fullHref}`;
      log(`  Downloading from: ${fileUrl}`);
      execSync(`curl -L -H 'User-Agent: Mozilla/5.0' --max-time 3600 -o "${destPath}" "${fileUrl}" 2>&1`, { timeout: 3610000 });
      
      if (fs.existsSync(destPath) && fs.statSync(destPath).size > 100000) {
        log(`  Downloaded: ${destPath} (${(fs.statSync(destPath).size / 1024 / 1024).toFixed(1)} MB)`);
        return true;
      } else {
        log(`  Download failed or file too small`);
        return false;
      }
    }
    
    return false;
  } catch (e) {
    log(`  Download failed: ${e.message}`);
    return false;
  }
}

function updateDB(id, sourcePath) {
  const relPath = path.relative(MEDIA_ROOT, sourcePath);
  const sqlFile = `/tmp/update-db-${id}.sql`;
  fs.writeFileSync(sqlFile, `UPDATE content_catalog SET payload = jsonb_set(payload, '{sourcePath}', '"'${relPath}'" '::jsonb) WHERE id = ${id};`);
  
  try {
    execSync(`PGPASSWORD=postgres psql -U postgres -h localhost -d isp_entertainment -f "${sqlFile}" 2>&1`, { timeout: 10000 });
    fs.unlinkSync(sqlFile);
    return true;
  } catch (e) {
    log(`  DB error: ${e.message}`);
    return false;
  }
}

function main() {
  const args = process.argv.slice(2);
  const listOnly = args.includes('--list');
  
  log('=== NAS Downloader ===');
  log(`Found ${NAS_MAPPINGS.length} items available on NAS`);
  
  if (listOnly) {
    log('');
    log('Available items:');
    for (const item of NAS_MAPPINGS) {
      log(`  ${item.title} (${item.year}) → ${item.nasPath}`);
    }
    return;
  }
  
  let downloaded = 0;
  let failed = 0;
  let alreadyExists = 0;
  
  for (const item of NAS_MAPPINGS) {
    log('');
    log(`--- ${item.title} (${item.year}) ---`);
    
    const destDir = path.join(MEDIA_ROOT, 'Requested/Movies');
    const filename = `${item.title.replace(/[^\w\s\-\.]/g, '').replace(/\s+/g, ' ').trim()}.mkv`;
    const destPath = path.join(destDir, filename);
    
    if (fs.existsSync(destPath)) {
      log(`  Already exists: ${destPath}`);
      alreadyExists++;
      
      // Still update DB if needed
      updateDB(item.id, destPath);
      continue;
    }
    
    const success = downloadFromNAS(item.nasPath, destPath);
    
    if (success) {
      downloaded++;
      updateDB(item.id, destPath);
    } else {
      failed++;
    }
  }
  
  log('');
  log('=== SUMMARY ===');
  log(`Downloaded: ${downloaded}`);
  log(`Already exists: ${alreadyExists}`);
  log(`Failed: ${failed}`);
  log(`Total: ${NAS_MAPPINGS.length}`);
}

main();
