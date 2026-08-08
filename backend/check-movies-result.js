const { getScannerRunById } = require('./src/data/store');

(async () => {
  const run = await getScannerRunById('1786163131910');
  const moviesResult = run.rootResults.find(r => r.id === 'south-indian-movies');
  console.log(JSON.stringify(moviesResult, null, 2));
  process.exit(0);
})()
