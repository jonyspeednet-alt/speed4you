const {Client}=require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
const c=new Client({host:'localhost',port:5432,database:'isp_entertainment',user:process.env.DB_USER || 'postgres',***REMOVED***:process.env.DB_PASSWORD || 'postgres'});
c.connect().then(async()=>{
  const r=await c.query("SELECT id, payload->>'title' as t FROM content_catalog WHERE payload->>'videoUrl' LIKE '/English_Movies%' AND payload->>'status'='published' LIMIT 3");
  r.rows.forEach(row => console.log(row.id, row.t));
  await c.end();
  process.exit(0);
}).catch(e=>{console.error(e.message);process.exit(1);});
