const { db } = require('./src/data/store/base');

const result = await db.query("UPDATE app_state SET value = value::jsonb || '{\"lockedAt\": null, \"owner\": null}'::jsonb WHERE key = 'scanner_runtime'");
console.log('Scanner lock cleared');
process.exit(0);
