const fs = require('fs');
const http = require('http');

const loginData = JSON.stringify({ username: 'admin', ***REMOVED***: '***REMOVED***' });
fs.writeFileSync('/tmp/login4.json', loginData);

console.log('Login file written:', fs.readFileSync('/tmp/login4.json', 'utf8'));

// Login
const loginPayload = fs.readFileSync('/tmp/login4.json', 'utf8');
const options = {
  hostname: '127.0.0.1',
  port: 4100,
  path: '/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(loginPayload)
  }
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log('Login response:', data);
    const parsed = JSON.parse(data);
    if (parsed.token) {
      console.log('TOKEN:', parsed.token.substring(0, 50) + '...');
      fs.writeFileSync('/tmp/admin_token.txt', parsed.token);

      // Run scanner
      const scanPayload = JSON.stringify({ rootIds: ['series-f-m'] });
      const scanOptions = {
        hostname: '127.0.0.1',
        port: 4100,
        path: '/admin/scanner/run',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(scanPayload),
          'Authorization': 'Bearer ' + parsed.token
        }
      };
      const scanReq = http.request(scanOptions, (scanRes) => {
        let scanData = '';
        scanRes.on('data', (chunk) => { scanData += chunk; });
        scanRes.on('end', () => {
          console.log('Scanner response:', scanData);
        });
      });
      scanReq.write(scanPayload);
      scanReq.end();
    } else {
      console.log('Login failed');
    }
  });
});

req.write(loginPayload);
req.end();
