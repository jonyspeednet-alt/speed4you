const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'isp_entertainment',
  user: process.env.DB_USER || 'postgres',
  ***REMOVED***: process.env.DB_PASSWORD || 'postgres',
});

async function cleanupDuplicates(dryRun = true) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Find all duplicate groups (same title_key + content_type)
    const groups = await client.query(`
      SELECT title_key, content_type, COUNT(*)::int AS cnt
      FROM content_catalog
      WHERE title_key IS NOT NULL AND title_key != ''
      GROUP BY title_key, content_type
      HAVING COUNT(*) > 1
      ORDER BY cnt DESC
    `);

    console.log(`Found ${groups.rows.length} duplicate groups:`);
    let totalDeleted = 0;

    for (const group of groups.rows) {
      const items = await client.query(`
        SELECT id, payload->>'title' AS title, payload->>'sourcePath' AS source_path,
               status, updated_at, metadata_status
        FROM content_catalog
        WHERE title_key = $1 AND content_type = $2
        ORDER BY updated_at DESC
      `, [group.title_key, group.content_type]);

      const rows = items.rows;
      const keep = rows[0];
      const deleteRows = rows.slice(1);

      console.log(`\n  [${group.content_type}] "${keep.title}" (${group.cnt} entries)`);
      console.log(`    KEEP:  id=${keep.id} (${keep.status}, updated=${keep.updated_at})`);
      for (const d of deleteRows) {
        console.log(`    DELETE: id=${d.id} (${d.status}, source=${d.source_path})`);
      }

      if (!dryRun) {
        const ids = deleteRows.map((r) => r.id);
        await client.query(
          `DELETE FROM content_catalog WHERE id = ANY($1::int[])`,
          [ids],
        );
        totalDeleted += ids.length;
      }
    }

    if (dryRun) {
      console.log('\n[DRY RUN] No changes made. Run without --dry-run to apply.');
    } else {
      await client.query('COMMIT');
      console.log(`\nDone. Deleted ${totalDeleted} duplicate entries.`);
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
cleanupDuplicates(dryRun);
