const db = require('../config/database');
const fs = require('fs');

async function audit() {
  // Get ALL published items with source paths
  const { rows } = await db.query(`
    SELECT id, title, content_type, status,
           payload->>'sourcePath' AS source_path,
           payload->'seasons' AS seasons
    FROM content_catalog
    WHERE status = 'published'
      AND payload->>'sourcePath' IS NOT NULL
    ORDER BY id
  `);

  const problems = [];
  const ok = [];
  const suffixCandidates = [];

  for (const row of rows) {
    const sp = row.source_path;
    if (!sp) continue;

    const report = { id: row.id, title: row.title, type: row.content_type, issues: [] };

    // Check source path exists
    const pathExists = fs.existsSync(sp);

    if (!pathExists) {
      // Try with '(' suffix removed (the common pattern: (TV Mini Series 2025), (2023), etc.)
      const simpler = findSimplerPath(sp);
      if (simpler && fs.existsSync(simpler)) {
        report.issues.push({ type: 'FOLDER_SUFFIX_MISMATCH', detail: `DB has "${sp}" but actual folder is "${simpler}"` });
        suffixCandidates.push({ id: row.id, title: row.title, dbPath: sp, actualPath: simpler });
      } else {
        report.issues.push({ type: 'FOLDER_MISSING', detail: sp });
      }
    }

    // Check seasons/episodes for series
    if (row.content_type === 'series' && row.seasons) {
      try {
        const seasons = typeof row.seasons === 'string' ? JSON.parse(row.seasons) : row.seasons;
        for (const season of seasons) {
          const sp = season.sourcePath;
          if (sp && !fs.existsSync(sp)) {
            report.issues.push({ type: 'SEASON_FOLDER_MISSING', detail: sp });
          }
          if (season.episodes) {
            let missingCount = 0;
            for (const ep of season.episodes) {
              if (ep.sourcePath && !fs.existsSync(ep.sourcePath)) {
                missingCount++;
              }
            }
            if (missingCount > 0) {
              report.issues.push({ type: 'EPISODE_FILE_MISSING', detail: `${missingCount} missing files in S${season.number}` });
            }
          }
        }
      } catch (e) {
        report.issues.push({ type: 'PARSE_ERROR', detail: e.message });
      }
    }

    // Check single file for movies
    if (row.content_type === 'movie' && sp && pathExists) {
      if (!fs.statSync(sp).isFile()) {
        // folder path is ok for movies too
      }
    }

    if (report.issues.length > 0) {
      problems.push(report);
    } else {
      ok.push({ id: row.id, title: row.title });
    }
  }

  console.log(`\nChecked ${rows.length} published items`);
  console.log(`OK: ${ok.length} items`);
  console.log(`With issues: ${problems.length} items\n`);

  // Summary by issue type
  const typeCount = {};
  for (const p of problems) {
    for (const i of p.issues) {
      typeCount[i.type] = (typeCount[i.type] || 0) + 1;
    }
  }
  console.log('Issue summary:');
  for (const [type, count] of Object.entries(typeCount)) {
    console.log(`  ${count}x ${type}`);
  }

  console.log('\n=== PROBLEM ITEMS ===');
  for (const p of problems) {
    console.log(`\nID=${p.id} "${p.title}" [${p.type}]`);
    for (const i of p.issues) {
      console.log(`  ${i.type}: ${i.detail}`);
    }
  }

  if (suffixCandidates.length > 0) {
    console.log('\n=== CANDIDATES FOR BULK FIX (suffix mismatch) ===');
    for (const c of suffixCandidates) {
      console.log(`ID=${c.id}: ${c.dbPath} → ${c.actualPath}`);
    }
  }

  process.exit(0);
}

function findSimplerPath(path) {
  // Pattern 1: remove trailing (TV Mini Series YYYY), (TV Series YYYY-YYYY), (YYYY), etc.
  let result = path.replace(/\s*\(TV\s+(Mini\s+)?Series[^)]*\)\s*$/, '');
  if (result !== path && fs.existsSync(result)) return result;

  // Pattern 2: remove any trailing parenthetical (year or year-range)
  result = path.replace(/\s*\(\d{4}(?:–\d{4})?\)\s*$/, '');
  if (result !== path && fs.existsSync(result)) return result;

  // Pattern 3: remove any trailing parenthetical
  result = path.replace(/\s*\([^)]*\)\s*$/, '');
  if (result !== path && fs.existsSync(result)) return result;

  return null;
}

audit();
