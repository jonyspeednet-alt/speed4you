const fs = require('fs');
const path = require('path');

// Load .env file
const envPath = path.join(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf8');

// Parse and set environment variables
envContent.split('\n').forEach(line => {
  const trimmedLine = line.trim();
  if (trimmedLine && !trimmedLine.startsWith('#')) {
    const equalsIndex = trimmedLine.indexOf('=');
    if (equalsIndex > 0) {
      const key = trimmedLine.substring(0, equalsIndex).trim();
      const value = trimmedLine.substring(equalsIndex + 1).trim();
      process.env[key] = value;
    }
  }
});

const db = require('./src/config/database');
db.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'content_catalog' ORDER BY ordinal_position")
  .then(r => {
    console.log('content_catalog columns:');
    r.rows.forEach(row => console.log('  -', row.column_name, ':', row.data_type));
  })
  .catch(e => console.error(e.message))
  .finally(() => process.exit());