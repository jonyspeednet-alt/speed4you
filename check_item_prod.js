const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Read .env file manually
const envPath = path.join(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf8');

// Parse .env
const envVars = {};
envContent.split('\n').forEach(line => {
  const trimmedLine = line.trim();
  if (trimmedLine && !trimmedLine.startsWith('#')) {
    const equalsIndex = trimmedLine.indexOf('=');
    if (equalsIndex > 0) {
      const key = trimmedLine.substring(0, equalsIndex).trim();
      const value = trimmedLine.substring(equalsIndex + 1).trim();
      envVars[key] = value;
    }
  }
});

console.log('DB_HOST:', envVars.DB_HOST);
console.log('DB_USER:', envVars.DB_USER ? 'SET' : 'NOT SET');
console.log('DB_PASSWORD:', envVars.DB_PASSWORD ? 'SET' : 'NOT SET');

const pool = new Pool({
  host: envVars.DB_HOST,
  port: Number(envVars.DB_PORT),
  database: envVars.DB_NAME,
  user: envVars.DB_USER,
  password: envVars.DB_PASSWORD,
});

async function checkItem() {
  try {
    const result = await pool.query('SELECT id, title, type, status, slug, root_id, year, poster, backdrop, description FROM content_items WHERE id = $1', [33808]);
    
    if (result.rows.length === 0) {
      console.log('Item 33808 not found in database');
    } else {
      console.log('Item 33808 details:');
      console.log(JSON.stringify(result.rows[0], null, 2));
    }
    
    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkItem();