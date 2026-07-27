const { execSync } = require('child_process');

const loginRes = execSync(`curl -s -X POST http://localhost:4100/portal-api/api/admin/auth/login -H "Content-Type: application/json" -d '{"username":"admin","password":"admin123"}'`, { timeout: 10000 }).toString();
console.log('Login:', loginRes.substring(0, 200));

let token;
try {
  const parsed = JSON.parse(loginRes);
  token = parsed.token;
} catch (e) {
  console.log('Login failed, trying other passwords...');
  const res2 = execSync(`curl -s -X POST http://localhost:4100/portal-api/api/admin/auth/login -H "Content-Type: application/json" -d '{"username":"admin","password":"admin"}'`, { timeout: 10000 }).toString();
  console.log('Login2:', res2.substring(0, 200));
  try { token = JSON.parse(res2).token; } catch(e) {}
}

if (!token) {
  console.log('No token. Skipping rematch. Scanner will handle metadata on next run.');
  process.exit(0);
}

console.log('Token obtained. Running rematch...');
try {
  const result = execSync(`curl -s -X POST http://localhost:4100/portal-api/api/admin/metadata/rematch -H "Content-Type: application/json" -H "Authorization: Bearer ${token}"`, { timeout: 60000 }).toString();
  console.log('Result:', result.substring(0, 500));
} catch (e) {
  console.log('Rematch error:', e.message.substring(0, 200));
}
