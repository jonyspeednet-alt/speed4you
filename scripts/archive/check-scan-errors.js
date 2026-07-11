const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
const c = new Client({ host:'localhost',port:5432,database:'isp_entertainment',user:process.env.DB_USER || 'postgres',***REMOVED***:process.env.DB_PASSWORD || 'postgres' });
c.connect().then(async()=>{
  const r=await c.query("SELECT value FROM app_state WHERE key='scanner_log'");
  const log=r.rows[0].value;
  const runs=log.runs||[];
  const last=runs[runs.length-1];
  console.log('Last run:');
  console.log('  Started:', last.startedAt);
  console.log('  Completed:', last.completedAt);
  console.log('  Created:', last.created, 'Updated:', last.updated, 'Deleted:', last.deleted);
  console.log('  Errors:', JSON.stringify(last.errors, null, 2));
  // also check the scanner_runtime
  const r2=await c.query("SELECT value FROM app_state WHERE key='scanner_runtime'");
  const rt=r2.rows[0].value;
  const j=rt.currentJob||{};
  console.log('\nRuntime job errors:', JSON.stringify(j.errors||j.error||'none'));
  await c.end();
}).catch(e=>{console.error(e);process.exit(1);});
