const db = require('./config/database');

async function run() {
  const selectSeriesQuery = `
    SELECT id, title, content_type, status, payload->>'sourcePath' AS path
    FROM content_catalog
    WHERE source_root_id = 'new-movies-1'
  `;
  const resSeries = await db.query(selectSeriesQuery);
  const seriesRows = resSeries.rows;

  console.log(`Found ${seriesRows.length} entries to delete under new-movies-1:`);
  for (const row of seriesRows) {
    console.log(`- [ID: ${row.id}] Title: ${row.title} (Status: ${row.status})`);
  }

  if (seriesRows.length > 0) {
    const ids = seriesRows.map(r => r.id);
    const deleteSeriesQuery = `
      DELETE FROM content_catalog
      WHERE id = ANY($1::bigint[])
    `;
    const delResSeries = await db.query(deleteSeriesQuery, [ids]);
    console.log(`Successfully deleted ${delResSeries.rowCount} records under new-movies-1.`);
  }

  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
