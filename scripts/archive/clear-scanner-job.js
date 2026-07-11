const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
const c = new Client({ host:'localhost',port:5432,database:'isp_entertainment',user:process.env.DB_USER || 'postgres',***REMOVED***:process.env.DB_PASSWORD || 'postgres' });
c.connect().then(async()=>{
  const r=await c.query("SELECT value FROM app_state WHERE key='scanner_runtime'");
  const v=r.rows[0].value;
  v.currentJob = null;
  v.queue = v.queue || [];
  await c.query("UPDATE app_state SET value=$1::jsonb WHERE key='scanner_runtime'", [JSON.stringify(v)]);
  console.log('scanner_runtime cleared. currentJob set to null.');
  
  // verify
  const r2=await c.query("SELECT value FROM app_state WHERE key='scanner_runtime'");
  const v2=r2.rows[0].value;
  console.log('currentJob:', v2.currentJob);
  console.log('queue length:', (v2.queue||[]).length);
  await c.end();
  process.exit(0);
}).catch(e=>{console.error(e.message);process.exit(1);});
