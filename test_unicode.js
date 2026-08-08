const { cleanSearchTitle } = require('./services/metadata-enricher');

const testTitle = 'एक विलेन रिटर्न्स (2022)';
console.log('Input:', testTitle);
console.log('Output:', cleanSearchTitle(testTitle));