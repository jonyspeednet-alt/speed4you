#!/usr/bin/env node
const https = require('https');

function fetch(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 15000 }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function main() {
  // Try WordPress REST API
  const apis = [
    'https://7wa7df.movielinkbd.li/wp-json/',
    'https://7wa7df.movielinkbd.li/wp-json/wp/v2/posts?per_page=5',
    'https://7wa7df.movielinkbd.li/wp-json/wp/v2/pages?per_page=5',
    'https://7wa7df.movielinkbd.li/?rest_route=/wp/v2/posts&per_page=3',
  ];
  
  for (const url of apis) {
    try {
      console.log(`\n--- ${url} ---`);
      const data = await fetch(url);
      console.log(data.substring(0, 500));
    } catch(e) {
      console.log(`Error: ${e.message}`);
    }
  }
}

main();
