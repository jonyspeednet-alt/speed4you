const { execSync } = require('child_process');

const dirs = [
  { name: 'Kalamkaval', url: 'http://198.20.20.20/NAS1/New_Collection/2026/01.%5B2026%5D%20January/Kalamkaval%20(2025)%201080p%20%5BDual%20Audio%5D/' },
  { name: 'Top Cop', url: 'http://198.20.20.20/NAS1/New_Collection/2026/05.%5B2026%5DMay/Top%20Cop%20(2026)%201080p%20%5BPunjabi%5D/' },
  { name: 'Brown', url: 'http://198.20.20.20/NAS1/New_Collection/2026/06.%5B2026%5DJune/Brown%20(TV%20Series%202026%E2%80%93%20)%201080p/' },
  { name: 'Parimala and Co', url: 'http://198.20.20.20/NAS1/New_Collection/2026/07.%5B2026%5DJuly/Parimala%20and%20Co%20(2026)%201080p%20%5BDual%20Audio%5D/' },
  { name: 'Bindiya Ke Bahubali', url: 'http://198.20.20.20/NAS1/New_Collection/2026/01.%5B2026%5D%20January/Bindiya%20Ke%20Bahubali%20(TV%20Series%202025%E2%80%93%20)/' },
  { name: 'Feludar Goyendagiri', url: 'http://198.20.20.20/NAS1/New_Collection/2026/01.%5B2026%5D%20January/Feludar%20Goyendagiri%20(TV%20Series%202025%E2%80%93%20)/' },
];

for (const dir of dirs) {
  console.log(`\n=== ${dir.name} ===`);
  try {
    const html = execSync(`curl -s -H 'User-Agent: Mozilla/5.0' '${dir.url}' 2>&1`, { timeout: 15000 }).toString();
    // Find all NAS1 links in the fallback table
    const regex = /href="(\/NAS1\/[^"]+)"/g;
    let m;
    const links = [];
    while ((m = regex.exec(html)) !== null) {
      links.push(decodeURIComponent(m[1]));
    }
    console.log(`  Links: ${links.length}`);
    links.forEach(l => console.log(`    ${l}`));
  } catch (e) {
    console.log(`  ERROR: ${e.message.substring(0, 80)}`);
  }
}
