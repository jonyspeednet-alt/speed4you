#!/usr/bin/env node
import { execSync } from 'child_process';

const months = [
  { path: '/NAS1/New_Collection/2026/01.%5B2026%5D%20January/', name: 'January' },
  { path: '/NAS1/New_Collection/2026/02.%5B2026%5D%20February/', name: 'February' },
  { path: '/NAS1/New_Collection/2026/03.%5B2026%5DMarch/', name: 'March' },
  { path: '/NAS1/New_Collection/2026/04.%5B2025%5DApril/', name: 'April' },
  { path: '/NAS1/New_Collection/2026/05.%5B2026%5DMay/', name: 'May' },
  { path: '/NAS1/New_Collection/2026/06.%5B2026%5DJune/', name: 'June' },
  { path: '/NAS1/New_Collection/2026/07.%5B2026%5DJuly/', name: 'July' },
];

const allFiles = [];

for (const month of months) {
  const url = `http://198.20.20.20${month.path}`;
  try {
    const html = execSync(`curl -s -H 'User-Agent: Mozilla/5.0' '${url}' 2>&1`, { timeout: 15000 }).toString();
    
    // h5ai fallback table format: <a href="/NAS1/...">displayname</a>
    const regex = /<a href="(\/NAS1\/New_Collection\/2026\/[^"]+)">([^<]+)<\/a>/g;
    let match;
    const files = [];
    while ((match = regex.exec(html)) !== null) {
      const decoded = decodeURIComponent(match[1]);
      const displayName = match[2].trim();
      if (displayName !== 'Parent Directory') {
        files.push(displayName);
        allFiles.push({ month: month.name, name: displayName, nasPath: decoded });
      }
    }
    
    console.log(`=== ${month.name} 2026 (${files.length} items) ===`);
    files.forEach(f => console.log(`  ${f}`));
  } catch (e) {
    console.log(`=== ${month.name}: ERROR ${e.message} ===`);
  }
}

console.log(`\n=== TOTAL: ${allFiles.length} items on NAS ===`);

// Output as JSON for matching
import { writeFileSync } from 'fs';
writeFileSync('/tmp/nas-2026-items.json', JSON.stringify(allFiles, null, 2));
console.log('Saved to /tmp/nas-2026-items.json');
