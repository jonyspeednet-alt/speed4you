#!/usr/bin/env node
/**
 * Update DB sourcePaths for MovieLinkBD downloaded files
 * Scans /var/www/html/Requested/Movies/ and /var/www/html/Requested/Series/
 * Matches files to DB entries by title and updates sourcePath
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const MEDIA_ROOT = '/var/www/html';
const MOVIES_DIR = path.join(MEDIA_ROOT, 'Requested/Movies');
const SERIES_DIR = path.join(MEDIA_ROOT, 'Requested/Series');

// DB ID → expected filename patterns
const MOVIE_MAPPINGS = [
  { id: 269, title: 'Big Fish', patterns: ['Big Fish', 'big-fish'] },
  { id: 274, title: 'Oculus', patterns: ['Oculus', 'oculus'] },
  { id: 310, title: 'Mumbai Police', patterns: ['Mumbai Police', 'mumbai-police'] },
  { id: 292, title: 'Meet Joe Black', patterns: ['Meet Joe Black', 'meet-joe-black'] },
  { id: 316, title: 'The Man from U.N.C.L.E.', patterns: ['Man from UNCLE', 'man-from-uncle'] },
  { id: 319, title: 'Focus', patterns: ['Focus 2015', 'focus-2015'] },
  { id: 333, title: 'Edge of Tomorrow', patterns: ['Edge of Tomorrow', 'edge-of-tomorrow'] },
  { id: 335, title: 'The Grand Budapest Hotel', patterns: ['Grand Budapest', 'grand-budapest'] },
  { id: 341, title: 'Birdman', patterns: ['Birdman', 'birdman'] },
  { id: 348, title: 'Nightcrawler', patterns: ['Nightcrawler', 'nightcrawler'] },
  { id: 357, title: 'Ex Machina', patterns: ['Ex Machina', 'ex-machina'] },
  { id: 360, title: 'The Hateful Eight', patterns: ['Hateful Eight', 'hateful-eight'] },
  { id: 362, title: 'Room', patterns: ['Room 2015', 'room-2015'] },
  { id: 366, title: 'Brooklyn', patterns: ['Brooklyn 2015', 'brooklyn-2015'] },
  { id: 369, title: 'The Revenant', patterns: ['Revenant', 'revenant'] },
  { id: 370, title: 'Spotlight', patterns: ['Spotlight', 'spotlight'] },
  { id: 372, title: 'The Big Short', patterns: ['Big Short', 'big-short'] },
  { id: 377, title: 'Sicario', patterns: ['Sicario', 'sicario'] },
  { id: 381, title: 'The Martian', patterns: ['Martian', 'martian'] },
  { id: 386, title: 'Creed', patterns: ['Creed 2015', 'creed-2015'] },
  { id: 387, title: 'Bridge of Spies', patterns: ['Bridge of Spies', 'bridge-of-spies'] },
  { id: 389, title: 'Star Wars: The Force Awakens', patterns: ['Star Wars', 'star-wars', 'Force Awakens'] },
  { id: 390, title: 'Inside Out', patterns: ['Inside Out', 'inside-out'] },
  { id: 393, title: 'Mad Max: Fury Road', patterns: ['Mad Max', 'mad-max'] },
  { id: 399, title: 'Arrival', patterns: ['Arrival 2016', 'arrival-2016'] },
  { id: 400, title: 'La La Land', patterns: ['La La Land', 'la-la-land'] },
  { id: 401, title: 'Moonlight', patterns: ['Moonlight 2016', 'moonlight-2016'] },
  { id: 402, title: 'Manchester by the Sea', patterns: ['Manchester', 'manchester'] },
  { id: 403, title: 'Hell or High Water', patterns: ['Hell or High Water', 'hell-or-high-water'] },
  { id: 404, title: 'Captain Fantastic', patterns: ['Captain Fantastic', 'captain-fantastic'] },
  { id: 405, title: 'Lion', patterns: ['Lion 2016', 'lion-2016'] },
  { id: 406, title: 'Fences', patterns: ['Fences', 'fences'] },
  { id: 407, title: 'Hidden Figures', patterns: ['Hidden Figures', 'hidden-figures'] },
  { id: 408, title: 'Hacksaw Ridge', patterns: ['Hacksaw Ridge', 'hacksaw-ridge'] },
  { id: 409, title: 'Nocturnal Animals', patterns: ['Nocturnal Animals', 'nocturnal-animals'] },
  { id: 410, title: 'The Light Between Oceans', patterns: ['Light Between Oceans', 'light-between-oceans'] },
  { id: 411, title: 'American Honey', patterns: ['American Honey', 'american-honey'] },
  { id: 412, title: 'Jackie', patterns: ['Jackie 2016', 'jackie-2016'] },
  { id: 413, title: '20th Century Women', patterns: ['20th Century Women', '20th-century-women'] },
  { id: 414, title: 'Paterson', patterns: ['Paterson', 'paterson'] },
  { id: 415, title: 'Toni Erdmann', patterns: ['Toni Erdmann', 'toni-erdmann'] },
  { id: 416, title: 'The Salesman', patterns: ['Salesman', 'salesman'] },
  { id: 417, title: 'Elle', patterns: ['Elle 2016', 'elle-2016'] },
  { id: 418, title: 'Under the Shadow', patterns: ['Under the Shadow', 'under-the-shadow'] },
  { id: 419, title: 'My Life as a Zucchini', patterns: ['Zucchini', 'zucchini'] },
  { id: 420, title: 'The Red Turtle', patterns: ['Red Turtle', 'red-turtle'] },
  { id: 421, title: 'Land of Mine', patterns: ['Land of Mine', 'land-of-mine'] },
  { id: 422, title: 'A Man Called Ove', patterns: ['Man Called Ove', 'man-called-ove'] },
  { id: 423, title: 'Mustang', patterns: ['Mustang 2015', 'mustang-2015'] },
  { id: 424, title: 'Theeb', patterns: ['Theeb', 'theeb'] },
  { id: 425, title: 'Tangerine', patterns: ['Tangerine', 'tangerine'] },
  { id: 426, title: 'Dheepan', patterns: ['Dheepan', 'dheepan'] },
];

const SERIES_MAPPINGS = [
  { id: 441, title: 'Ayyana Mane', patterns: ['Ayyana Mane', 'ayyana-mane'] },
  { id: 442, title: 'Abhay', patterns: ['Abhay', 'abhay'] },
  { id: 443, title: 'Candy', patterns: ['Candy', 'candy'] },
];

function log(msg) {
  console.log(msg);
}

function findFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (['.mkv', '.mp4', '.avi', '.mov', '.ts', '.flv', '.wmv'].includes(ext)) {
        files.push(path.join(dir, entry.name));
      }
    } else if (entry.isDirectory()) {
      // Recurse into subdirectories (for series)
      files.push(...findFiles(path.join(dir, entry.name)));
    }
  }
  return files;
}

function matchFileToEntry(filePath, mappings) {
  const filename = path.basename(filePath).toLowerCase();
  
  for (const mapping of mappings) {
    for (const pattern of mapping.patterns) {
      if (filename.includes(pattern.toLowerCase())) {
        return mapping;
      }
    }
  }
  return null;
}

function updateDB(id, sourcePath) {
  const relPath = path.relative(MEDIA_ROOT, sourcePath);
  const sql = `UPDATE content_catalog SET payload = jsonb_set(payload, '{sourcePath}', '"'"'/${relPath}'"'"'::jsonb) WHERE id = ${id};`;
  
  try {
    execSync(`PGPASSWORD=postgres psql -U postgres -h localhost -d isp_entertainment -c "${sql}" 2>&1`, { timeout: 10000 });
    return true;
  } catch (e) {
    log(`  DB error: ${e.message}`);
    return false;
  }
}

function main() {
  log('=== MovieLinkBD Path Updater ===');
  log('');
  
  // Scan for files
  log('Scanning Movies directory...');
  const movieFiles = findFiles(MOVIES_DIR);
  log(`Found ${movieFiles.length} movie files`);
  
  log('Scanning Series directory...');
  const seriesFiles = findFiles(SERIES_DIR);
  log(`Found ${seriesFiles.length} series files`);
  
  const allFiles = [...movieFiles, ...seriesFiles];
  
  if (allFiles.length === 0) {
    log('No files found. Upload files first, then run this script.');
    return;
  }
  
  log('');
  log('Matching files to DB entries...');
  log('');
  
  let updated = 0;
  let notFound = 0;
  let alreadySet = 0;
  
  // Check which items already have sourcePath set
  const dbResult = execSync(`PGPASSWORD=postgres psql -U postgres -h localhost -d isp_entertainment -t -A -c "SELECT id, payload->>'sourcePath' FROM content_catalog WHERE id IN (${[...MOVIE_MAPPINGS, ...SERIES_MAPPINGS].map(m => m.id).join(',')});" 2>&1`, { timeout: 10000 }).toString();
  
  const existingPaths = {};
  for (const line of dbResult.trim().split('\n')) {
    const [id, sp] = line.split('|');
    if (id && sp && sp !== 'null' && sp !== '') {
      existingPaths[parseInt(id)] = sp;
    }
  }
  
  for (const file of allFiles) {
    const entry = matchFileToEntry(file, [...MOVIE_MAPPINGS, ...SERIES_MAPPINGS]);
    
    if (!entry) {
      log(`  SKIP: ${path.basename(file)} (no matching DB entry)`);
      notFound++;
      continue;
    }
    
    // Check if already set
    if (existingPaths[entry.id]) {
      log(`  EXISTS: ${entry.title} → ${existingPaths[entry.id]}`);
      alreadySet++;
      continue;
    }
    
    // Update DB
    const success = updateDB(entry.id, file);
    if (success) {
      const relPath = path.relative(MEDIA_ROOT, file);
      log(`  UPDATED: ${entry.title} (ID:${entry.id}) → /${relPath}`);
      updated++;
    }
  }
  
  log('');
  log('=== SUMMARY ===');
  log(`Updated: ${updated}`);
  log(`Already set: ${alreadySet}`);
  log(`No match: ${notFound}`);
  log(`Total files: ${allFiles.length}`);
}

main();
