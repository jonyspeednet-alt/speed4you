const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'isp_entertainment',
  user: process.env.DB_USER || 'postgres',
  ***REMOVED***: process.env.DB_PASSWORD || 'postgres',
});

async function fixMisclassifiedEntries(dryRun = true) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Find entries where title says "Batman" but source path is from Sonic folder
    const sonicBatman = await client.query(`
      SELECT id, title, payload->>'sourcePath' AS source_path, status
      FROM content_catalog
      WHERE payload->>'title' ILIKE '%batman%'
        AND payload->>'sourcePath' ILIKE '%sonic%'
    `);
    console.log(`\n[1] Misclassified (Batman title + Sonic path): ${sonicBatman.rows.length} entries`);
    for (const r of sonicBatman.rows) {
      console.log(`    id=${r.id} status=${r.status} path=${r.source_path}`);
    }

    // 2. Find ALL entries from AdventuresofSonictheHedgehog folder (regardless of title)
    const sonicAll = await client.query(`
      SELECT id, title, payload->>'sourcePath' AS source_path, status, title_key
      FROM content_catalog
      WHERE payload->>'sourcePath' LIKE '%AdventuresofSonictheHedgehog%'
      ORDER BY id
    `);
    console.log(`\n[2] ALL entries from Sonic folder: ${sonicAll.rows.length} entries`);
    const titleGroups = {};
    for (const r of sonicAll.rows) {
      const key = r.title || 'NULL';
      titleGroups[key] = (titleGroups[key] || 0) + 1;
    }
    console.log('    Title breakdown:');
    for (const [title, count] of Object.entries(titleGroups)) {
      console.log(`      "${title}": ${count} entries`);
    }

    // 3. Find duplicate source paths (same file, multiple rows)
    const dupPaths = await client.query(`
      SELECT payload->>'sourcePath' AS source_path, COUNT(*)::int AS cnt, array_agg(id) AS ids
      FROM content_catalog
      WHERE payload->>'sourcePath' LIKE '%AdventuresofSonictheHedgehog%'
      GROUP BY payload->>'sourcePath'
      HAVING COUNT(*) > 1
      ORDER BY cnt DESC
    `);
    console.log(`\n[3] Duplicate source paths: ${dupPaths.rows.length} paths have >1 entry`);
    for (const r of dupPaths.rows) {
      console.log(`    ${r.source_path} → ${r.cnt} entries (ids: ${r.ids})`);
    }

    if (dryRun) {
      console.log('\n[DRY RUN] No changes made.');
      console.log('To apply: run with --apply flag');
      console.log('To delete ALL Sonic-folder entries: run with --delete-all-sonic flag');
      console.log('To delete ONLY misclassified: run with --delete-misclassified flag');
    } else if (process.argv.includes('--delete-all-sonic')) {
      const result = await client.query(`
        DELETE FROM content_catalog
        WHERE payload->>'sourcePath' LIKE '%AdventuresofSonictheHedgehog%'
      `);
      await client.query('COMMIT');
      console.log(`\nDeleted ${result.rowCount} entries from Sonic folder.`);
    } else if (process.argv.includes('--delete-misclassified')) {
      const result = await client.query(`
        DELETE FROM content_catalog
        WHERE payload->>'title' ILIKE '%batman%'
          AND payload->>'sourcePath' ILIKE '%sonic%'
      `);
      await client.query('COMMIT');
      console.log(`\nDeleted ${result.rowCount} misclassified entries.`);
    } else {
      console.log('\nSpecify --delete-all-sonic or --delete-misclassified to proceed.');
      await client.query('ROLLBACK');
    }
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Error:', e.message);
  } finally {
    client.release();
    await pool.end();
  }
}

const dryRun = !process.argv.includes('--apply');
fixMisclassifiedEntries(dryRun);
