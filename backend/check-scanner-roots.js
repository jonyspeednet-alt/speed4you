const { loadScannerRoots } = require('./src/data/store');

const roots = loadScannerRoots();
console.log(JSON.stringify(roots, null, 2));
