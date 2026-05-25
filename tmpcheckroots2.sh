cd /home/speed4you/portal-app/backend
node -e "
const { loadScannerRoots } = require('./src/data/store');
const fs = require('fs');
const roots = loadScannerRoots();
roots.forEach((r, i) => {
  const exists = r.scanPath ? fs.existsSync(r.scanPath) : false;
  console.log('['+i+']', r.label || r.id, 'enabled='+r.enabled, 'exists='+exists, r.scanPath);
});
console.log('---');
console.log('Total roots:', roots.length);
" 2>&1