const { execSync } = require('child_process');
const fs = require('fs');

const titles = [
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

const dirs = [
  '/var/www/html/Deleted/',
  '/var/www/html/Deleted Movies/',
  '/var/www/html/Deleted Series/',
  '/var/www/html/Deleted_Movies/',
  '/var/www/html/Deleted_Series/',
];

console.log('Checking Deleted folders...');
for (const dir of dirs) {
  try {
    const exists = execSync(`ls "${dir}" 2>/dev/null`, { timeout: 5000 }).toString().trim();
    if (exists) {
      console.log(`Found: ${dir}`);
      console.log(exists.substring(0, 500));
    }
  } catch (e) {}
}

// Search for each title in Deleted folders
console.log('\n--- Searching for deleted files ---');
for (const title of titles) {
  const shortTitle = title.split(':')[0].split("'")[0].trim();
  try {
    const result = execSync(`find /var/www/html/ -maxdepth 3 -iname "*${shortTitle}*" 2>/dev/null`, { timeout: 10000 }).toString().trim();
    if (result) {
      console.log(`FOUND: ${title}`);
      console.log(result);
    }
  } catch (e) {}
}
