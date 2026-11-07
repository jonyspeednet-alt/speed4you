require('../../backend/scripts/load-db-env');
const {Client}=require('pg');
const path = require('path');
const c=new Client({host:'localhost',port:5432,database:'isp_entertainment',user:process.env.DB_USER || 'postgres',password:process.env.DB_PASSWORD});
c.connect().then(async()=>{
  // Check the raw payload for duration-related fields
  const r=await c.query("SELECT id, payload->>'duration' as dur, payload->>'runtime' as runtime, payload->>'runtimeMinutes' as rtmin, payload->>'durationSeconds' as dursec FROM content_catalog WHERE id IN (5195, 3427) ORDER BY id");
  r.rows.forEach(row => console.log(JSON.stringify(row)));
  await c.end();
  process.exit(0);
}).catch(e=>{console.error(e);process.exit(1);});
