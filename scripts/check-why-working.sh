#!/bin/bash
echo "=== CHECK /var/www/speed4you.net SYMLINKS ==="
ls -la /var/www/speed4you.net/ | head -20

echo ""
echo "=== CHECK IF English_Movies IS SYMLINKED ==="
ls -la /var/www/speed4you.net/English_Movies 2>/dev/null || echo "No symlink found"
file /var/www/speed4you.net 2>/dev/null

echo ""
echo "=== CHECK ACTUAL FILE NAMES IN English_Movies vs New_Movies_1 ==="
echo "--- English_Movies sample (what's actually on disk) ---"
ls /var/www/html/English_Movies/2000/ | head -5 2>/dev/null || ls /var/www/html/English_Movies/ | head -5

echo ""
echo "--- New_Movies_1 sample (what's actually on disk) ---"
ls /var/www/html/New_Movies_1/ | grep -i "matka" | head -3

echo ""
echo "=== KEY DIFFERENCE: Does English_Movies have spaces or %20 in filenames? ==="
ls /var/www/html/English_Movies/ | head -10 | cat -v | head -10

echo ""
echo "=== TEST: Does /media/ work for English Movies? ==="
PGPASSWORD=postgres psql -h 127.0.0.1 -U postgres -d isp_entertainment -t -c "
SELECT payload->>'videoUrl' FROM content_catalog 
WHERE source_root_id='english-movies' AND payload->>'videoUrl' IS NOT NULL 
LIMIT 3
"

echo ""
echo "=== TEST a known English movie via /media/ on localhost ==="
ENG_URL=$(PGPASSWORD=postgres psql -h 127.0.0.1 -U postgres -d isp_entertainment -t -c "
SELECT payload->>'videoUrl' FROM content_catalog 
WHERE source_root_id='english-movies' AND payload->>'videoUrl' IS NOT NULL 
LIMIT 1
" | xargs)
echo "Testing: http://localhost/media${ENG_URL}"
curl -s -o /dev/null -w "HTTP: %{http_code}\n" --range 0-100 "http://localhost/media${ENG_URL}"

echo ""
echo "=== COMPARE: /var/www/speed4you.net stat ==="
stat /var/www/speed4you.net

echo ""
echo "=== CHECK /var/www/html STRUCTURE ==="
ls -la /var/www/html/ | head -20
