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

console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_USER:', process.env.DB_USER);

const db = require('./src/config/database');
db.query('SELECT id, title, type, status, slug, root_id, year, poster, backdrop, description FROM content_items WHERE id = 33808')
  .then(r => console.log(JSON.stringify(r.rows, null, 2)))
  .catch(e => console.error(e.message))
  .finally(() => process.exit());