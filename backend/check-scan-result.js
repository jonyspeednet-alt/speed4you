const { db } = require('./src/data/store/base');

(async () => {
  const result = await db.query("SELECT * FROM scanner_runs ORDER BY created_at DESC LIMIT 1");
  const run = result.rows[0];
  const requestedSeriesResult = run.root_results.find(r => r.id === 'requested-series');
  
  console.log('Latest scan ID:', run.id);
  console.log('Requested Series result:', JSON.stringify(requestedSeriesResult, null, 2));
  
  process.exit(0);
})();
