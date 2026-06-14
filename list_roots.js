const roots = require('./src/data/scanner-roots.json');
roots.forEach(r => console.log(r.id + ': ' + r.scanPath));
const eng = roots.find(r => r.id === 'english-movies');
if (eng) console.log('Found english-movies:', JSON.stringify(eng));
else console.log('english-movies not found in roots!');
