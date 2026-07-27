const { execSync } = require('child_process');

const url = 'http://198.20.20.20/NAS1/New_Collection/2026/01.%5B2026%5D%20January/';
const html = execSync(`curl -s -H 'User-Agent: Mozilla/5.0' '${url}' 2>&1`, { timeout: 15000 }).toString();

// Print the raw HTML for debugging
console.log(html);
