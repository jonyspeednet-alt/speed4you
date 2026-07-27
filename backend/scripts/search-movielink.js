#!/usr/bin/env node
const https = require('https');

const MISSING_MOVIES = [
  "Fool's Day", "DNA", "Exit 8", "Ten Hours", "U-Turn", "The Host",
  "Mayasabha", "Tourist Family", "Level Cross", "Sufiyum Sujatayum",
  "Manorama Six Feet Under", "7th Day", "Mumbai Police", "Yavarum Nalam",
  "Gulaal", "Traffic", "Pizza", "Euphoria", "Bugonia",
  "Fighting Spirit Champion Road", "Immortal Combat", "Julius Caesar",
  "Dominion of Darkness", "Metro In Dino", "Mrigaya", "Next Door Neighbour",
  "No Other Choice", "Peaky Blinders Immortal Man", "Send Help",
  "Varane Avashyamund", "Yadang The Snitch", "Big Fish",
  "My Client's Wife", "Nagabandham", "Rahasya", "Everybody Loves Sohrab",
  "Interrogation", "Oculus", "Snowden", "Into the Mirror",
  "Look Away", "Others", "Chand Mera Dil", "Saptadingar Guptodhon",
  "Aajo Ardhangini", "Salmokji", "Phutaniganjer Mahesh", "Rockstar",
  "Horrorcane", "Abar Hawa Bodol", "Maiin Haan"
];

function search(title) {
  return new Promise((resolve) => {
    const url = `https://7wa7df.movielinkbd.li/search?q=${encodeURIComponent(title)}`;
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 15000 }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        const found = data.includes('Found') && data.includes('Results');
        const matchCount = data.match(/Found (\d+) Results/);
        const count = matchCount ? parseInt(matchCount[1]) : 0;
        // Extract movie links
        const linkRegex = /href="(\/[^"]*?)"/g;
        const links = [];
        let m;
        while ((m = linkRegex.exec(data)) !== null) {
          if (m[1].length > 5 && !m[1].includes('language') && !m[1].includes('genre') && 
              !m[1].includes('type') && !m[1].includes('category') && !m[1].includes('search') &&
              m[1] !== '/' && !m[1].includes('adult') && !m[1].includes('southIndian')) {
            links.push(m[1]);
          }
        }
        resolve({ title, count, links: [...new Set(links)].slice(0, 3) });
      });
    }).on('error', () => resolve({ title, count: 0, links: [] }));
  });
}

async function main() {
  const results = { found: [], notFound: [] };
  
  for (const title of MISSING_MOVIES) {
    const r = await search(title);
    if (r.count > 0) {
      results.found.push(r);
      console.log(`FOUND: ${r.title} (${r.count} results) -> ${r.links[0] || 'no link'}`);
    } else {
      results.notFound.push(r.title);
      console.log(`NOT FOUND: ${r.title}`);
    }
    // Small delay
    await new Promise(r => setTimeout(r, 300));
  }
  
  console.log(`\n=== SUMMARY ===`);
  console.log(`Found: ${results.found.length}`);
  console.log(`Not found: ${results.notFound.length}`);
  console.log(`\nNot found list:`);
  results.notFound.forEach(t => console.log(`  - ${t}`));
  
  require('fs').writeFileSync('/tmp/movielink-results.json', JSON.stringify(results, null, 2));
}

main();
