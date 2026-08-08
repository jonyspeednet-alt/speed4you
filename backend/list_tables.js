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
db.query("SELECT tablename FROM pg_tables WHERE schemaname = 'public'")
  .then(r => {
    console.log('Tables:');
    r.rows.forEach(row => console.log('  -', row.tablename));
  })
  .catch(e => console.error(e.message))
  .finally(() => process.exit());