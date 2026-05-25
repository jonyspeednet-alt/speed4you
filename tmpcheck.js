var fs = require('fs');
var c = JSON.parse(fs.readFileSync('./src/data/catalog.json', 'utf8'));
console.log('Type:', typeof c);
if (Array.isArray(c)) {
  console.log('Total items:', c.length);
} else {
  console.log('Keys:', Object.keys(c).slice(0, 5).join(', '));
  console.log('Has items:', Array.isArray(c.items));
  console.log('Has movies:', Array.isArray(c.movies));
}
