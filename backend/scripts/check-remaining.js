const { execSync } = require('child_process');

// Use the exact paths from the original listing
const items = [
  { month: 'January', path: '01.%5B2026%5D%20January', dir: 'Bindiya%20Ke%20Bahubali%20(TV%20Series%202025%E2%80%93%20)' },
  { month: 'January', path: '01.%5B2026%5D%20January', dir: 'Feludar%20Goyendagiri%20(TV%20Series%202025%E2%80%93%20)' },
  { month: 'January', path: '01.%5B2026%5D%20January', dir: 'Kalamkaval%20(2025)%201080p%20%5BDual%20Audio%5D' },
  { month: 'March', path: '03.%5B2026%5DMarch', dir: 'Kaliyugam%202064%20(2025)%201080p%20%5BDual%20Audio%5D' },
  { month: 'May', path: '05.%5B2026%5DMay', dir: 'Notun%20Premer%20Gaan%20(2026)' },
  { month: 'May', path: '05.%5B2026%5DMay', dir: 'Panda%20Plan%202%3A%20The%20Magical%20Tribe%20(2026)%201080p%20%5BDual%20Audio%5D' },
  { month: 'May', path: '05.%5B2026%5DMay', dir: 'Top%20Cop%20(2026)%201080p%20%5BPunjabi%5D' },
  { month: 'June', path: '06.%5B2026%5DJune', dir: 'Brown%20(TV%20Series%202026%E2%80%93%20)%201080p' },
  { month: 'July', path: '07.%5B2026%5DJuly', dir: 'Mukhbir%3A%20The%20Story%20of%20a%20Spy%20%E2%80%93%20The%20Movie%20(2026)%201080p%20%5BDual%20Audio%5D' },
  { month: 'July', path: '07.%5B2026%5DJuly', dir: 'Parimala%20and%20Co%20(2026)%201080p%20%5BDual%20Audio%5D' },
];

for (const item of items) {
  const url = `http://198.20.20.20/NAS1/New_Collection/2026/${item.path}/${item.dir}/`;
  try {
    const html = execSync(`curl -s -o /dev/null -w "%{http_code}" -H 'User-Agent: Mozilla/5.0' '${url}' 2>&1`, { timeout: 10000 }).toString().trim();
    console.log(`${item.month} | ${decodeURIComponent(item.dir)} | HTTP ${html}`);
    
    if (html === '200') {
      // List contents
      const content = execSync(`curl -s -H 'User-Agent: Mozilla/5.0' '${url}' 2>&1`, { timeout: 10000 }).toString();
      const files = [];
      const regex = /href="[^"]*?\/([^"\/]+)"/g;
      let m;
      while ((m = regex.exec(content)) !== null) {
        if (!m[1].includes('_h5ai') && m[1] !== '..') files.push(decodeURIComponent(m[1]));
      }
      console.log(`  Contents: ${files.join(', ') || 'empty'}`);
    }
  } catch (e) {
    console.log(`${decodeURIComponent(item.dir)} | ERROR: ${e.message.substring(0, 50)}`);
  }
}
