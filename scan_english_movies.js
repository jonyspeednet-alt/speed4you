require('dotenv').config({path:require('path').join(__dirname,'.env')});
const {ensureContentStore}=require('./src/data/store');
const scanner=require('./src/services/scanner');
async function run(){
  await ensureContentStore();
  const result=await scanner.scanSelectedRoots(['english-movies'],(prog)=>{
    if(prog&&prog.roots&&prog.roots['english-movies']){
      const r=prog.roots['english-movies'];
      if(r.processed%100===0||r.processed===r.totalCandidates)
        console.log('Progress:',r.processed+'/'+r.totalCandidates,'Created:',r.created,'Updated:',r.updated);
    }
  });
  console.log('Result:',JSON.stringify({created:result.created,updated:result.updated,errors:result.errors}));
  process.exit(0);
}
run().catch(e=>{console.error(e);process.exit(1)});
