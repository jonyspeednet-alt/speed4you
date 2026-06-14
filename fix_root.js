const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, 'src', 'data', 'scanner-roots.json');
let d = JSON.parse(fs.readFileSync(p, 'utf8'));
let r = d.find(x => x.id === 'english-movies');
r.scanPath = '/var/www/html/English_Movies';
fs.writeFileSync(p, JSON.stringify(d, null, 2));
console.log('Updated english-movies scanPath to English_Movies');
