const { execSync } = require('child_process');

const url = 'http://198.20.20.20/NAS1/New_Collection/2026/01.%5B2026%5D%20January/120%20Bahadur%20(2025)/';
const html = execSync(`curl -s -H 'User-Agent: Mozilla/5.0' '${url}' 2>&1`, { timeout: 15000 }).toString();
const matches = html.match(/href="([^"]+)"/g);
console.log('All hrefs:');
matches.forEach(m => console.log('  ' + m));
