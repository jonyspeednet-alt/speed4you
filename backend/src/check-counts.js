const db = require('./config/database');

async function run() {
  const totalRes = await db.query('SELECT COUNT(*)::int AS count FROM content_catalog');
  const statusRes = await db.query('SELECT status, COUNT(*)::int AS count FROM content_catalog GROUP BY status');
  const sourceRes = await db.query('SELECT source_type, COUNT(*)::int AS count FROM content_catalog GROUP BY source_type');
  const dupColRes = await db.query('SELECT COUNT(*)::int AS count FROM content_catalog WHERE duplicate_count > 0');
  const dupPayloadRes = await db.query("SELECT COUNT(*)::int AS count FROM content_catalog WHERE (payload->>'duplicateCount')::int > 0");

  console.log('--- Database Counts ---');
  console.log(`Total rows in content_catalog: ${totalRes.rows[0].count}`);
  console.log('\nStatus Breakdown:');
  for (const r of statusRes.rows) {
    console.log(`- ${r.status}: ${r.count}`);
  }
  console.log('\nSource Type Breakdown:');
  for (const r of sourceRes.rows) {
    console.log(`- ${r.source_type}: ${r.count}`);
  }
  console.log(`\nItems with duplicate_count > 0 (column): ${dupColRes.rows[0].count}`);
  console.log(`Items with duplicateCount > 0 (payload): ${dupPayloadRes.rows[0].count}`);
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
