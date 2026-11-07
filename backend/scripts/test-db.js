#!/usr/bin/env node
require('./load-db-env');
const { execSync } = require('child_process');
const fs = require('fs');

function pgQuery(sql) {
  const b64 = Buffer.from(sql).toString('base64');
  const out = execSync(`echo "${b64}" | base64 -d | psql -U postgres -h localhost -d isp_entertainment -t -A -F '|'`, { encoding: 'utf8' });
  return out.trim();
}

// Test connection
try {
  const test = pgQuery("SELECT 1");
  console.log("DB connection OK:", test);
} catch(e) {
  console.log("Connection error; retrying with configured database credentials...");
  try {
    const test = execSync(`echo "SELECT 1" | psql -U postgres -h localhost -d isp_entertainment -t -A`, { encoding: 'utf8' });
    console.log("Connected with password:", test.trim());
  } catch(e2) {
    console.log("Also failed:", e2.message.slice(0, 200));
  }
}
