const {PLAYER_CACHE_ROOT,buildPlayerCachePath,isCacheReadyPath}=require('./src/config/player-cache');
const fs=require('fs');
const p=buildPlayerCachePath({contentType:'movie',contentId:5195,seasonNumber:1,episodeNumber:1});
console.log('Cache path:',p);
console.log('Ready:',isCacheReadyPath(p));
if(fs.existsSync(p)){const s=fs.statSync(p);console.log('Size:',s.size,'Modified:',new Date(s.mtime));}
const d=require('path').dirname(p);
const files=fs.readdirSync(d).filter(f=>f.includes('5195'));
files.forEach(f=>console.log('File:',f,fs.statSync(d+'/'+f).size));
