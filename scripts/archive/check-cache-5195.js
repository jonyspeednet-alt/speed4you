const {buildCacheOutputPath,isCacheReadyPath,PLAYER_CACHE_ROOT}=require('./src/config/player-cache');
const sel={item:{type:'movie',id:5195},seasonNumber:1,episodeNumber:1};
const p=buildCacheOutputPath(sel);
console.log('Cache path:',p);
console.log('Exists:',isCacheReadyPath(p));
const fs=require('fs');
if(fs.existsSync(p)){const s=fs.statSync(p);console.log('Size:',s.size);}
const part=p+'.part.mp4';
console.log('Part exists:',fs.existsSync(part));
if(fs.existsSync(part)){const s2=fs.statSync(part);console.log('Part size:',s2.size);}
const d=require('path').dirname(p);
console.log('Cache dir:',d);
const files=fs.readdirSync(d).filter(f=>f.includes('5195'));
console.log('Cache files:',files);
