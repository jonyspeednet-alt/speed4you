#!/bin/bash
# Fix Bengali/Bangla content paths
# Problem: scanner root points to /var/www/html/Extra_Storage/Bangla_Movies (doesn't exist)
# Real path: /var/www/html/Bangla_Movies/

PGPASSWORD=postgres
export PGPASSWORD
PG="psql -h 127.0.0.1 -U postgres -d isp_entertainment"

echo "=== STEP 1: Verify actual file structure ==="
echo "--- Files at /var/www/html/Bangla_Movies/ ---"
ls -la /var/www/html/Bangla_Movies/ | head -30

echo ""
echo "--- Subdirectory contents ---"
echo "Bangla Dubbed:"
ls /var/www/html/Bangla_Movies/Bangla\ Dubbed/ 2>/dev/null | head -10
echo ""
echo "Banladeshi Bangla Movies:"
ls "/var/www/html/Bangla_Movies/Banladeshi Bangla Movies/" 2>/dev/null | head -10
echo ""
echo "Indian Bangla Movies:"
ls "/var/www/html/Bangla_Movies/Indian Bangla Movies/" 2>/dev/null | head -10

echo ""
echo "=== STEP 2: Count total video files ==="
find /var/www/html/Bangla_Movies -type f \( -name "*.mkv" -o -name "*.mp4" -o -name "*.avi" \) 2>/dev/null | wc -l

echo ""
echo "=== STEP 3: Test HTTP access with correct /Bangla_Movies/ path ==="
curl -s -o /dev/null -w "Test /Bangla_Movies/: %{http_code}\n" --range 0-100 \
  "http://localhost/media/Bangla_Movies/Bonolota.Express.2026.1080p.Bangla.mkv"
curl -s -o /dev/null -w "Test /Bangla_Movies/ Golondaaj: %{http_code}\n" --range 0-100 \
  "http://localhost/media/Bangla_Movies/Golondaaj%20(2021).mkv"

echo ""
echo "=== STEP 4: Check nginx symlink_follow setting ==="
nginx -T 2>/dev/null | grep -i "follow_symlink\|disable_symlinks"

echo ""
echo "=== STEP 5: Check if Bangla_Movies is symlink or real directory ==="
file /var/www/html/Bangla_Movies
readlink /var/www/html/Bangla_Movies
