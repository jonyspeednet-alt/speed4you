require('dotenv').config({path:require('path').join(__dirname,'.env')});
const scanner=require('./src/services/scanner');
(async()=>{
  let r=await scanner.scanSelectedRoots(['english-movies']);
  console.log('Done',JSON.stringify({c:r.created,u:r.updated,e:r.errors}));
})();
