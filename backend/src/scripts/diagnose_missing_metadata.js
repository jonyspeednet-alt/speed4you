/**
 * diagnose_missing_metadata.js
 * 
 * Finds items with missing poster/backdrop/description and
 * checks why metadata enrichment failed or was incomplete.
 */
require('dotenv').config();
const { query } = require('../config/database');

async function diagnose() {
  console.log('=== MISSING METADATA DIAGNOSIS ===\n');

  // Items with missing poster
  const noPoster = await query(`
    SELECT id, title, content_type, status, metadata_status,
           payload->>'metadataConfidence' AS confidence,
           payload->>'metadataStatus' AS meta_status,
           payload->>'metadataError' AS meta_error,
           payload->>'poster' AS poster,
           payload->>'backdrop' AS backdrop,
           payload->>'description' AS description,
           payload->>'tmdbId' AS tmdb_id,
           payload->>'sourcePath' AS source_path,
           payload->>'scanSignature' AS sig
    FROM content_catalog
    WHERE status = 'published'
      AND (
        payload->>'poster' IS NULL OR payload->>'poster' = ''
        OR payload->>'backdrop' IS NULL OR payload->>'backdrop' = ''
        OR payload->>'description' IS NULL OR payload->>'description' = ''
      )
    ORDER BY content_type, title
    LIMIT 60
  `);

  console.log(`Published items with missing poster/backdrop/description: ${noPoster.rows.length}\n`);

  const byReason = {
    not_found: [],
    matched_no_image: [],
    no_tmdb: [],
    other: [],
  };

  for (const r of noPoster.rows) {
    const missingFields = [];
    if (!r.poster) missingFields.push('poster');
    if (!r.backdrop) missingFields.push('backdrop');
    if (!r.description) missingFields.push('description');

    const entry = {
      id: r.id,
      title: r.title,
      type: r.content_type,
      confidence: r.confidence,
      metaStatus: r.meta_status,
      metaError: r.meta_error,
      tmdbId: r.tmdb_id,
      missing: missingFields.join(', '),
      sig: r.sig,
    };

    if (r.meta_status === 'not_found') byReason.not_found.push(entry);
    else if (r.meta_status === 'matched' && !r.tmdb_id) byReason.no_tmdb.push(entry);
    else if (r.meta_status === 'matched' && r.tmdb_id) byReason.matched_no_image.push(entry);
    else byReason.other.push(entry);
  }

  console.log(`--- Category: metadataStatus=not_found (${byReason.not_found.length}) ---`);
  byReason.not_found.forEach(e =>
    console.log(`  [${e.type}] ID:${e.id} "${e.title}" | missing: ${e.missing} | error: ${e.metaError || 'none'}`)
  );

  console.log(`\n--- Category: matched+tmdbId but no image (${byReason.matched_no_image.length}) ---`);
  byReason.matched_no_image.forEach(e =>
    console.log(`  [${e.type}] ID:${e.id} "${e.title}" | tmdb:${e.tmdbId} | confidence:${e.confidence} | missing: ${e.missing}`)
  );

  console.log(`\n--- Category: matched but NO tmdbId (${byReason.no_tmdb.length}) ---`);
  byReason.no_tmdb.forEach(e =>
    console.log(`  [${e.type}] ID:${e.id} "${e.title}" | confidence:${e.confidence} | missing: ${e.missing}`)
  );

  console.log(`\n--- Category: other/unknown (${byReason.other.length}) ---`);
  byReason.other.forEach(e =>
    console.log(`  [${e.type}] ID:${e.id} "${e.title}" | metaStatus:${e.metaStatus} | missing: ${e.missing}`)
  );

  // Summary: what noise patterns are causing failures?
  console.log('\n=== TITLE NOISE PATTERNS CHECK ===');
  const noisePatterns = [
    { name: 'Year suffix (e.g. "Title 2026")', regex: /\s+\d{4}$/ },
    { name: 'Brackets (e.g. "Title (2026)")', regex: /\s*\([^)]*\)/ },
    { name: 'Resolution (720p/1080p)', regex: /\b(720p|1080p|4k|2160p)\b/i },
    { name: 'Dash prefix (e.g. "13th - Subtitle")', regex: /^.+\s+-\s+.+/ },
    { name: 'ALL CAPS title', regex: /^[A-Z\s]{5,}$/ },
  ];

  const allDraft = await query(`
    SELECT id, title, payload->>'metadataStatus' AS ms, payload->>'sourcePath' AS sp
    FROM content_catalog
    WHERE status = 'draft' AND metadata_status = 'not_found'
    ORDER BY title
  `);

  console.log(`\nDraft not_found items (${allDraft.rows.length}) — title analysis:`);
  allDraft.rows.forEach(r => {
    const patterns = noisePatterns.filter(p => p.regex.test(r.title)).map(p => p.name);
    console.log(`  ID:${r.id} "${r.title}"`);
    if (patterns.length) console.log(`    ⚠ Possible noise: ${patterns.join(' | ')}`);
  });

  process.exit(0);
}

diagnose().catch(err => { console.error(err); process.exit(1); });
