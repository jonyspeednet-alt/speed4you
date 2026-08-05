const { execSync } = require('child_process');

const dirs = [
  '/NAS1/New_Collection/2026/01.[2026] January/Bindiya Ke Bahubali (TV Series 2025%E2%80%93 )/',
  '/NAS1/New_Collection/2026/01.[2026] January/Feludar Goyendagiri (TV Series 2025%E2%80%93 )/',
  '/NAS1/New_Collection/2026/01.[2026] January/Kalamkaval%20(2025)%201080p%20%5BDual%20Audio%5D/',
  '/NAS1/New_Collection/2026/03.[2026]March/Kaliyugam%202064%20(2025)%201080p%20%5BDual%20Audio%5D/',
  '/NAS1/New_Collection/2026/05.[2026]May/Notun%20Premer%20Gaan%20(2026)/',
  '/NAS1/New_Collection/2026/05.[2026]May/Panda%20Plan%202:%20The%20Magical%20Tribe%20(2026)%201080p%20%5BDual%20Audio%5D/',
  '/NAS1/New_Collection/2026/05.[2026]May/Top%20Cop%20(2026)%201080p%20%5BPunjabi%5D/',
  '/NAS1/New_Collection/2026/06.[2026]June/Brown%20(TV%20Series%202026%E2%80%93%20)%201080p/',
  '/NAS1/New_Collection/2026/07.[2026]July/Mukhbir:%20The%20Story%20of%20a%20Spy%20%E2%80%93%20The%20Movie%20(2026)%201080p%20%5BDual%20Audio%5D/',
  '/NAS1/New_Collection/2026/07.[2026]July/Parimala%20and%20Co%20(2026)%201080p%20%5BDual%20Audio%5D/',
];

const names = [
  'Bindiya Ke Bahubali', 'Feludar Goyendagiri', 'Kalamkaval', 'Kaliyugam 2064',
  'Notun Premer Gaan', 'Panda Plan 2', 'Top Cop', 'Brown', 'Mukhbir', 'Parimala and Co'
];

for (let i = 0; i < dirs.length; i++) {
  const url = 'http://198.20.20.20' + dirs[i];
  console.log(`\n=== ${names[i]} ===`);
  try {
    const html = execSync(`curl -s -H 'User-Agent: Mozilla/5.0' "${url}" 2>&1`, { timeout: 15000 }).toString();
    // Find all hrefs (both files and subdirs)
    const regex = /href="([^"]+)"/g;
    let m;
    const items = [];
    while ((m = regex.exec(html)) !== null) {
      const href = m[1];
      if (href.includes('_h5ai') || href === '..' || href.startsWith('//') || href.startsWith('http://')) continue;
      items.push(decodeURIComponent(href));
    }
    items.forEach(i => console.log(`  ${i}`));
  } catch (e) {
    console.log(`  ERROR: ${e.message.substring(0, 80)}`);
  }
}
