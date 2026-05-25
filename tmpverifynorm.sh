cd /home/speed4you/portal-app/backend
node -e "require('./scripts/normalize-media-library.js')" 2>&1 | head -5
echo '---SYNTAX OK---'
grep -c 'recommendedMode' ./scripts/normalize-media-library.js
echo '---recommendedMode present---'
grep -c 'remux-copy' ./scripts/normalize-media-library.js
echo '---remux-copy present---'
grep -c 'ionice' ./scripts/normalize-media-library.js
echo '---ionice present---'
grep -c 'readrate' ./scripts/normalize-media-library.js
echo '---readrate present---'
grep -c 'backupKept' ./scripts/normalize-media-library.js
echo '---backupKept present---'
