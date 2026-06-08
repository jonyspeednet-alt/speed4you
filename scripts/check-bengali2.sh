#!/bin/bash
PGPASSWORD=postgres
export PGPASSWORD
PG="psql -h 127.0.0.1 -U postgres -d isp_entertainment"

echo "=== ALL FILES IN BANGLA MOVIES ROOT (NOT IN DB) ==="
# List all video files in the bangla movies directories
find /var/www/html/Extra_Storage/Bangla_Movies -type f \( -name "*.mkv" -o -name "*.mp4" -o -name "*.avi" \) 2>/dev/null | sort

echo ""
echo "=== ALL CONTENT CURRENTLY IN DB FROM BANGLA ROOT ==="
$PG -c "
SELECT id, payload->>'title' as title, payload->>'videoUrl' as video_url
FROM content_catalog 
WHERE source_root_id='extra-storage-bangla-movies'
ORDER BY id
"

echo ""
echo "=== TEST HTTP ACCESS FOR KNOWN BENGALI CONTENT ==="
# Test the Rakkhosh file (Bengali unicode)
URL1="/Extra_Storage/Bangla_Movies/%E0%A6%B0%E0%A6%BE%E0%A6%95%E0%A7%8D%E0%A6%B7%E0%A6%B8.mp4"
echo "Testing URL1 (unicode bangla): http://localhost/media${URL1}"
curl -s -o /dev/null -w "HTTP: %{http_code}\n" --range 0-100 "http://localhost/media${URL1}"

# Test the Bonolota simple filename 
URL2="/Extra_Storage/Bangla_Movies/Bonolota.Express.2026.1080p.Bangla.mkv"
echo "Testing URL2 (simple): http://localhost/media${URL2}"
curl -s -o /dev/null -w "HTTP: %{http_code}\n" --range 0-100 "http://localhost/media${URL2}"

echo ""
echo "=== FILES IN SUB-DIRECTORIES ==="
find /var/www/html/Extra_Storage/Bangla_Movies -mindepth 2 -type f \( -name "*.mkv" -o -name "*.mp4" \) 2>/dev/null | head -20
