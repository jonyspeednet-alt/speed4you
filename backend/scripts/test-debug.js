const d = require('/tmp/nas-download-list.json');
console.log('First 3 nasPaths:');
d.slice(0,3).forEach(i => console.log(i.nasPath));

// Test first one
const { execSync } = require('child_process');
const url = 'http://198.20.20.20' + d[0].nasPath;
console.log('\nFetching:', url);
const html = execSync(`curl -s -H 'User-Agent: Mozilla/5.0' "${url}" 2>&1`, { timeout: 15000 }).toString();
console.log('HTML length:', html.length);
console.log('Has mkv:', html.includes('.mkv'));
console.log('Has mp4:', html.includes('.mp4'));
const mkvMatch = html.match(/\.mkv/g);
console.log('mkv matches:', mkvMatch ? mkvMatch.length : 0);
