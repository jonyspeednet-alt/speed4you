const { getAppState } = require('./src/data/store');

const log = getAppState('scanner_log');
console.log(JSON.stringify(log, null, 2));
