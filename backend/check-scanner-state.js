const { getAppState } = require('./src/data/store');

const state = getAppState('scanner_state');
console.log(JSON.stringify(state, null, 2));
