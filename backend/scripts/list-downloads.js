const fs = require('fs');
const data = JSON.parse(fs.readFileSync('/tmp/ctg-download-results.json', 'utf8'));
const downloaded = data.filter(r => r.status === 'downloaded');
downloaded.forEach(r => {
  const p = r.path.replace('/var/www/html/', '');
  console.log(r.dbId + '|' + r.title + '|' + p);
});
