#!/bin/bash
echo "=== NGINX /media/ ROUTE CONFIG ==="
cat /etc/nginx/sites-enabled/speed4you.net | grep -A10 "location /media/"

echo ""
echo "=== TEST /Extra_Storage/ PATH DIRECTLY ==="
# See if the Extra_Storage path is accessible at all
curl -s -o /dev/null -w "Direct test: %{http_code}\n" --range 0-100 \
  "http://localhost/media/Extra_Storage/Bangla_Movies/Bonolota.Express.2026.1080p.Bangla.mkv"

echo ""
echo "=== CHECK IF FILE ACTUALLY EXISTS ==="
ls -la "/var/www/html/Extra_Storage/Bangla_Movies/Bonolota.Express.2026.1080p.Bangla.mkv" 2>/dev/null || echo "FILE NOT FOUND at that path"
ls -la "/var/www/html/Bangla_Movies/Bonolota.Express.2026.1080p.Bangla.mkv" 2>/dev/null || echo "FILE NOT FOUND at /Bangla_Movies/"

echo ""
echo "=== CHECK BANGLA_MOVIES SYMLINK TARGET ==="
readlink -f /var/www/html/Bangla_Movies

echo ""
echo "=== CHECK MEDIA ROUTE ROOT ==="
# The nginx media route uses root /var/www/html - does Extra_Storage exist there?
ls -la /var/www/html/Extra_Storage/ | head -10

echo ""
echo "=== WHAT IS THE ACTUAL FULL PATH OF BANGLA FILE? ==="
find /var/www/html/Extra_Storage/Bangla_Movies -maxdepth 1 -name "*.mkv" -o -name "*.mp4" 2>/dev/null
