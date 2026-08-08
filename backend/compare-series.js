const fs = require('fs');
const path = require('path');

// Actual folders in filesystem
const actualFolders = [
  "13th - Some Lessons Arent Taught In Classrooms",
  "Abhishapto",
  "Adarsh Baal Vidyalaya (2026)",
  "American Born Chinese",
  "Batman.Caped.Crusader 2026",
  "Brown (2026)",
  "Cabaret",
  "Game of thrones",
  "Glory",
  "House of the Dragon",
  "Inspector.Rishi.(2024)",
  "Invincible",
  "Isakapatnam",
  "Kerala Crime Files",
  "Kohrra",
  "Maamla Legal Hai",
  "Made In India A Titan Story (2026)",
  "Manvat Murders",
  "Matka King",
  "Mouse",
  "Musafir Cafe (2026)",
  "Muthassi 2026",
  "Muthu Alias Kaattaan",
  "Nikosh Chhaya",
  "Objection My Lord 2026",
  "Off Campus",
  "Outer Banks",
  "Pritam and Pedro",
  "Raakh",
  "Regai",
  "Reverse (2026)",
  "Search - The Naina Murder Case",
  "Super Subbu",
  "Taskaree The.Smugglers Web (2026)",
  "The art of sarah (2026)",
  "The East Palace",
  "The Hunt (2026)",
  "The Night Agent",
  "The Pitt",
  "The Protector",
  "Vadhandhi",
  "Vikings",
  "Vikings Valhalla",
  "Widows Bay"
];

// Items in database
const dbItems = [
  "Glory S01 Hindi WEBRip ESub DDN",
  "Invincible S01 WEBRip DDN",
  "Isakapatnam S01 Tamil Hindi WEBRip ESub DDN",
  "Maamla Legal Hai S01 Hindi WEBRip ESub DDN",
  "Muthu Alias Kaattaan S01 Hindi Tamil WEBRip DDN",
  "off campus S01 WEBRip ESub DDN",
  "Raakh S01 Hindi WEBRip ESub DDN",
  "Search The Naina Murder Case S01 Hindi WEBRip ESub DDN",
  "Super Subbu S01 Telugu Hindi WEBRip DDN",
  "The East Palace S01 Hindi English WEBRip ESub DDN",
  "Vikings: Valhalla",
  "Widows Bay S01 WEBRip ESub DDN"
];

// Normalize function for comparison
function normalize(name) {
  return name.toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .replace(/\s+/g, '');
}

// Find missing folders
const missingFolders = actualFolders.filter(folder => {
  const normalizedFolder = normalize(folder);
  return !dbItems.some(item => {
    const normalizedItem = normalize(item);
    // Check if folder name is contained in item or vice versa
    return normalizedItem.includes(normalizedFolder) || normalizedFolder.includes(normalizedItem.substring(0, 10));
  });
});

console.log("Total folders in filesystem:", actualFolders.length);
console.log("Total items in database:", dbItems.length);
console.log("Missing folders count:", missingFolders.length);
console.log("\nMissing folders:");
missingFolders.forEach(folder => console.log("-", folder));
