const {Client}=require('pg');
const c=new Client({host:'localhost',port:5432,database:'isp_entertainment',user:'postgres',***REMOVED***:'postgres'});
c.connect().then(async()=>{
  const r=await c.query('SELECT id, content_type, title, status, payload FROM content_catalog WHERE id=5195');
  if(!r.rows.length){console.log('Not found');return;}
  const row=r.rows[0];
  const p=row.payload;
  console.log('ID:', row.id);
  console.log('Type:', row.content_type);
  console.log('Title:', row.title);
  console.log('Status:', row.status);
  console.log('videoUrl:', p.videoUrl);
  console.log('sourcePath:', p.sourcePath);
  console.log('sourcePublicPath:', p.sourcePublicPath);
  console.log('sourceRootId:', p.sourceRootId);
  console.log('metadataStatus:', p.metadataStatus);
  console.log('hasPoster:', !!p.poster);
  await c.end();
  process.exit(0);
}).catch(e=>{console.error(e.message);process.exit(1);});
