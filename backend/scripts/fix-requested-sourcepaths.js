#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');

process.env.PGPASSWORD = 'postgres';

function pgQuery(sql) {
  const tmpFile = '/tmp/pg_q_' + Date.now() + '.sql';
  fs.writeFileSync(tmpFile, sql);
  const out = execSync(`PGPASSWORD=postgres psql -U postgres -h localhost -d isp_entertainment -f ${tmpFile} -t -A -F '|' 2>&1`, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
  fs.unlinkSync(tmpFile);
  return out.trim();
}

function pgExec(sql) {
  const tmpFile = '/tmp/pg_e_' + Date.now() + '.sql';
  fs.writeFileSync(tmpFile, sql);
  execSync(`PGPASSWORD=postgres psql -U postgres -h localhost -d isp_entertainment -f ${tmpFile} 2>&1`, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
  fs.unlinkSync(tmpFile);
}

// Get all items needing sourcePath
const rows = pgQuery(`SELECT id, title, content_type, payload->>'sourcePath' as sp FROM content_catalog WHERE (source_root_id = '' OR source_root_id IS NULL) AND status = 'published' AND (payload->>'sourcePath' IS NULL OR payload->>'sourcePath' = '') ORDER BY id`);
const entries = rows.split('\n').filter(Boolean).map(r => {
  const [id, title, ct, sp] = r.split('|');
  return { id, title, contentType: ct, sourcePath: sp };
});
console.log(`Entries needing sourcePath: ${entries.length}`);

// List all dirs and files on disk
function listAll(base) {
  try {
    const dirs = execSync(`find "${base}" -maxdepth 1 -type d ! -path "${base}" 2>/dev/null`, { encoding: 'utf8' }).trim().split('\n').filter(Boolean);
    return dirs.map(d => d.replace(base + '/', ''));
  } catch { return []; }
}

function listAllFiles(base) {
  try {
    return execSync(`find "${base}" -maxdepth 1 -type f \\( -name "*.mkv" -o -name "*.mp4" -o -name "*.avi" -o -name "*.ts" \\) 2>/dev/null`, { encoding: 'utf8' }).trim().split('\n').filter(Boolean).map(f => f.replace(base + '/', ''));
  } catch { return []; }
}

const movieDirs = listAll('/var/www/html/Requested/Movies');
const movieFiles = listAllFiles('/var/www/html/Requested/Movies');
const seriesDirs = listAll('/var/www/html/Requested/Series');
const seriesFiles = listAllFiles('/var/www/html/Requested/Series');

console.log(`Disk: ${movieDirs.length} movie dirs, ${movieFiles.length} movie files, ${seriesDirs.length} series dirs, ${seriesFiles.length} series files`);

function normalize(s) {
  return (s || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function matchEntry(entry) {
  const ct = entry.contentType === 'series' ? 'Series' : 'Movies';
  const dirs = ct === 'Series' ? seriesDirs : movieDirs;
  const files = ct === 'Series' ? seriesFiles : movieFiles;
  const base = `/var/www/html/Requested/${ct}`;
  
  const titleNorm = normalize(entry.title);
  const titleWords = titleNorm.split(/\s+/).filter(w => w.length > 1);
  
  // Try dirs first
  for (const d of dirs) {
    const dNorm = normalize(d);
    // Check if any significant title word appears in dir name
    let matched = 0;
    for (const w of titleWords) {
      if (dNorm.includes(w)) matched++;
    }
    
    if (matched >= Math.min(2, titleWords.length)) {
      // Find media file inside
      try {
        const inner = execSync(`find "${base}/${d}" -maxdepth 1 -type f \\( -name "*.mkv" -o -name "*.mp4" -o -name "*.avi" \\) 2>/dev/null | head -1`, { encoding: 'utf8' }).trim();
        if (inner) return inner.replace('/var/www/html/', '');
      } catch {}
    }
  }
  
  // Try direct files
  for (const f of files) {
    const fNorm = normalize(f);
    let matched = 0;
    for (const w of titleWords) {
      if (fNorm.includes(w)) matched++;
    }
    if (matched >= Math.min(2, titleWords.length)) {
      return `Requested/${ct}/${f}`;
    }
  }
  
  // Fallback: try matching even 1 word for short titles
  if (titleWords.length <= 2) {
    for (const d of dirs) {
      const dNorm = normalize(d);
      for (const w of titleWords) {
        if (w.length > 3 && dNorm.includes(w)) {
          try {
            const inner = execSync(`find "${base}/${d}" -maxdepth 1 -type f \\( -name "*.mkv" -o -name "*.mp4" -o -name "*.avi" \\) 2>/dev/null | head -1`, { encoding: 'utf8' }).trim();
            if (inner) return inner.replace('/var/www/html/', '');
          } catch {}
          return `Requested/${ct}/${d}`;
        }
      }
    }
    for (const f of files) {
      const fNorm = normalize(f);
      for (const w of titleWords) {
        if (w.length > 3 && fNorm.includes(w)) {
          return `Requested/${ct}/${f}`;
        }
      }
    }
  }
  
  return null;
}

let updated = 0;
let noMatch = 0;

for (const entry of entries) {
  const match = matchEntry(entry);
  
  if (match) {
    const escaped = match.replace(/'/g, "''");
    pgExec(`UPDATE content_catalog SET payload = jsonb_set(payload, '{sourcePath}', to_jsonb('${escaped}'::text)) WHERE id = ${entry.id}`);
    updated++;
    console.log(`  UPDATED ${entry.id} - ${entry.title} -> ${match}`);
  } else {
    noMatch++;
    console.log(`  NO MATCH ${entry.id} - ${entry.title}`);
  }
}

console.log(`\n=== SUMMARY ===`);
console.log(`Updated: ${updated}`);
console.log(`No match: ${noMatch}`);
