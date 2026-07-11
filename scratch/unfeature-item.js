/**
 * Unfeature "The Journey Begins" (id: 1001) on the production server
 * This script logs in as admin and updates the item's featured flag to false.
 */
const https = require('https');

const BASE = 'https://data.speed4you.net/portal-api';
const ITEM_ID = 1001;

function httpsRequest(options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function main() {
  // Step 1: Login as admin
  console.log('Logging in...');
  const loginRes = await httpsRequest({
    hostname: 'data.speed4you.net',
    path: '/portal-api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  }, JSON.stringify({ username: 'admin', ***REMOVED***: process.env.ADMIN_PASSWORD }));

  if (loginRes.status !== 200 || !loginRes.body?.token) {
    console.error('Login failed:', loginRes.status, loginRes.body);
    return;
  }

  const token = loginRes.body.token;
  console.log('Login OK. Token received.');

  // Step 2: Fetch current item
  console.log(`Fetching item ${ITEM_ID}...`);
  const getRes = await httpsRequest({
    hostname: 'data.speed4you.net',
    path: `/portal-api/admin/content/${ITEM_ID}`,
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` },
  });

  if (getRes.status !== 200) {
    console.error('Failed to fetch item:', getRes.status, getRes.body);
    return;
  }

  const item = getRes.body;
  console.log(`Current featured: ${item.featured}, featuredOrder: ${item.featuredOrder}`);

  // Step 3: Update item to unfeature it
  const updates = { ...item, featured: false, featuredOrder: 0 };

  const patchRes = await httpsRequest({
    hostname: 'data.speed4you.net',
    path: `/portal-api/admin/content/${ITEM_ID}`,
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  }, JSON.stringify(updates));

  if (patchRes.status === 200) {
    console.log(`✅ Success! Item ${ITEM_ID} featured=false, featuredOrder=0`);
    console.log('featured:', patchRes.body?.featured, '| featuredOrder:', patchRes.body?.featuredOrder);
  } else {
    console.error('❌ Update failed:', patchRes.status, patchRes.body);
  }
}

main().catch(console.error);
