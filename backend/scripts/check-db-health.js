'use strict';
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const db = require('../src/config/database');

async function main() {
  console.log('\n=== PostgreSQL Database Health Check ===\n');

  try {
    const connTest = await db.query("SELECT NOW() as now");
    console.log(`✓ Connection Status: Connected (Server Time: ${connTest.rows[0].now})`);

    const tableList = await db.query(
      `SELECT table_name FROM information_schema.tables 
       WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`
    );
    console.log(`✓ Database Tables found: ${tableList.rows.length}`);
    for (const row of tableList.rows) {
      console.log(`   - ${row.table_name}`);
    }

    const catalogStats = await db.query(
      `SELECT 
         COUNT(*)::int as total,
         COUNT(*) FILTER (WHERE status = 'published')::int as published,
         COUNT(*) FILTER (WHERE status = 'draft')::int as drafts,
         COUNT(*) FILTER (WHERE content_type = 'movie')::int as movies,
         COUNT(*) FILTER (WHERE content_type = 'series')::int as series
       FROM content_catalog`
    );

    const stats = catalogStats.rows[0];
    console.log('\n✓ Content Catalog Stats:');
    console.log(`   - Total Items: ${stats.total}`);
    console.log(`   - Published:   ${stats.published}`);
    console.log(`   - Drafts:      ${stats.drafts}`);
    console.log(`   - Movies:      ${stats.movies}`);
    console.log(`   - Series:      ${stats.series}`);

    // Check pg_stat_activity for connection count safely
    const conns = await db.query("SELECT COUNT(*)::int FROM pg_stat_activity");
    console.log(`\n✓ Active PG Connections: ${conns.rows[0].count}`);
    console.log('\n✅ Database Status: Healthy & Operational\n');

    process.exit(0);
  } catch (err) {
    console.error('\n❌ DB Error:', err.message || err);
    process.exit(1);
  }
}

main();
