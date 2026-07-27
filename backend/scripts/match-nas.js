const fs = require('fs');

// 54 missing items from DB (no sourcePath)
const missing = [
  '7th Day', 'Aajo Ardhangini', 'Abar Hawa Bodol', 'Big Fish', 'Bugonia',
  'Chand Mera Dil', 'DNA', 'Dominion of Darkness', 'Euphoria',
  'Everybody Loves Sohrab Handa', 'Exit 8', 'Fighting Spirit', "Fool's Day",
  'Gulaal', 'Horrorcane', 'Immortal Combat', 'Interrogation', 'Into the Mirror',
  'Julius Caesar', 'Level Cross', 'Look Away', 'Maiin Haan', 'Manorama Six Feet Under',
  'Mayasabha', 'Metro In Dino', 'Mrigaya', 'Mumbai Police', "My Client's Wife",
  'Nagabandham', 'Next Door Neighbour', 'No Other Choice', 'Oculus', 'Others',
  'Peaky Blinders', 'Phutaniganjer', 'Pizza', 'Rahasya', 'Rockstar', 'Salmokji',
  'Saptadingar', 'Send Help', 'Snowden', 'Sufiyum', 'Ten Hours', 'The Host',
  'Tourist Family', 'Traffic', 'U-Turn', 'Varane Avashyamund', 'Yadang',
  'Yavarum Nalam', 'Abhay', 'Ayyana Mane', 'Candy'
];

// Load NAS items
const nas = JSON.parse(fs.readFileSync('/tmp/nas-2026-items.json', 'utf8'));

const found = [];
const notFound = [];

for (const title of missing) {
  const search = title.toLowerCase().replace(/[^a-z0-9]/g, '');
  const match = nas.find(n => {
    const nasName = n.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    return nasName.includes(search) || search.includes(nasName.substring(0, Math.min(search.length, 6)));
  });
  
  if (match) {
    found.push({ title, nasName: match.name, nasPath: match.nasPath, month: match.month });
  } else {
    notFound.push(title);
  }
}

console.log(`=== FOUND on NAS: ${found.length} ===`);
found.forEach(f => console.log(`  ${f.title} -> ${f.nasName} (${f.month})`));

console.log(`\n=== NOT FOUND: ${notFound.length} ===`);
notFound.forEach(t => console.log(`  ${t}`));
