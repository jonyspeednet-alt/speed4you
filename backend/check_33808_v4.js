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
db.query('SELECT id, title, status, content_type, metadata_status, metadata_confidence, payload FROM content_catalog WHERE id = 33808')
  .then(r => {
    if (r.rows.length === 0) {
      console.log('Item 33808 not found in content_catalog');
    } else {
      console.log('Item 33808 details:');
      console.log(JSON.stringify(r.rows[0], null, 2));
    }
  })
  .catch(e => console.error(e.message))
  .finally(() => process.exit());