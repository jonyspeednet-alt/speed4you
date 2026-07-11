const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
const c = new Client({ host:'localhost',port:5432,database:'isp_entertainment',user:process.env.DB_USER || 'postgres',***REMOVED***:process.env.DB_PASSWORD || 'postgres' });
c.connect().then(async()=>{
  const r1=await c.query("SELECT value FROM app_state WHERE key='scanner_roots'");
  console.log('scanner_roots:', JSON.stringify(r1.rows[0].value, null, 2));
  const r2=await c.query("SELECT value FROM app_state WHERE key='scanner_runtime'");
  const v=r2.rows[0].value;
  const job=v.currentJob||{};
  console.log('\n--- Errors from currentJob ---');
  (job.summary||{}).errors?.forEach(e=>console.log(e));
  console.log('\n--- Skipped roots ---');
  (job.summary||{}).skipped?.forEach(s=>console.log(s.id, '-', s.path, '-', s.error));
  await c.end();
  process.exit(0);
}).catch(e=>{console.error(e.message);process.exit(1);});
