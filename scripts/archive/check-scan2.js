const { Client } = require('pg');
const c = new Client({ host:'localhost',port:5432,database:'isp_entertainment',user:'postgres',***REMOVED***:'postgres' });
c.connect().then(async()=>{
  const r=await c.query("SELECT key, length(value::text) as len FROM app_state WHERE key LIKE '%scan%' ORDER BY key");
  r.rows.forEach(row => console.log(row.key, '- length:', row.len));
  const r2=await c.query("SELECT value FROM app_state WHERE key='scanner_runtime'");
  const v=r2.rows[0].value;
  console.log('scanner_runtime keys:', Object.keys(v));
  if(v.currentJob) console.log('currentJob:', JSON.stringify(v.currentJob).slice(0,800));
  if(v.jobQueue) console.log('jobQueue:', JSON.stringify(v.jobQueue).slice(0,300));
  await c.end();
  process.exit(0);
}).catch(e=>{console.error(e.message);process.exit(1);});
