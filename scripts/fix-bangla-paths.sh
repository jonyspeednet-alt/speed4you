#!/bin/bash
# Fix Bengali/Bangla content - comprehensive fix
# 1. Verify actual HTTP access
# 2. Fix scanner root paths in DB
# 3. Fix existing 4 records' videoUrl/sourcePath
# 4. Trigger re-scan via API

PGPASSWORD=postgres
export PGPASSWORD
PG="psql -h 127.0.0.1 -U postgres -d isp_entertainment"

echo "=== STEP 1: Verify actual HTTP access (with correct Host header) ==="
curl -s -o /dev/null -w "Bonolota (Host header): %{http_code}\n" --range 0-100 \
  -H "Host: speed4you.net" \
  "http://127.0.0.1/media/Bangla_Movies/Bonolota.Express.2026.1080p.Bangla.mkv"

curl -s -o /dev/null -w "Golondaaj (Host header): %{http_code}\n" --range 0-100 \
  -H "Host: speed4you.net" \
  "http://127.0.0.1/media/Bangla_Movies/Golondaaj%20(2021).mkv"

echo ""
echo "=== STEP 2: Fix scanner_roots table ==="
echo "--- BEFORE ---"
$PG -c "SELECT id, scan_path, public_base_url FROM scanner_roots WHERE id='extra-storage-bangla-movies'"

$PG -c "
UPDATE scanner_roots
SET 
  scan_path = '/var/www/html/Bangla_Movies',
  public_base_url = '/Bangla_Movies',
  label = 'Bangla Movies',
  updated_at = NOW()
WHERE id = 'extra-storage-bangla-movies'
RETURNING id, scan_path, public_base_url, label
"

echo ""
echo "=== STEP 3: Fix existing 4 DB records' videoUrl and sourcePath ==="
echo "--- BEFORE ---"
$PG -c "SELECT id, payload->>'title' as title, payload->>'videoUrl' as video_url FROM content_catalog WHERE source_root_id='extra-storage-bangla-movies'"

# Fix records: replace /Extra_Storage/Bangla_Movies/ with /Bangla_Movies/
# and /var/www/html/Extra_Storage/Bangla_Movies/ with /var/www/html/Bangla_Movies/
$PG -c "
UPDATE content_catalog
SET payload = jsonb_set(
  jsonb_set(
    payload,
    '{videoUrl}',
    to_jsonb(replace(payload->>'videoUrl', '/Extra_Storage/Bangla_Movies/', '/Bangla_Movies/'))
  ),
  '{sourcePath}',
  to_jsonb(replace(payload->>'sourcePath', '/var/www/html/Extra_Storage/Bangla_Movies/', '/var/www/html/Bangla_Movies/'))
),
updated_at = NOW()
WHERE source_root_id = 'extra-storage-bangla-movies'
  AND (payload->>'videoUrl' LIKE '/Extra_Storage/Bangla_Movies/%' OR payload->>'sourcePath' LIKE '/var/www/html/Extra_Storage/Bangla_Movies/%')
RETURNING id, payload->>'title' as title, payload->>'videoUrl' as new_video_url
"

echo ""
echo "--- AFTER FIX ---"
$PG -c "SELECT id, payload->>'title' as title, payload->>'videoUrl' as video_url FROM content_catalog WHERE source_root_id='extra-storage-bangla-movies'"

echo ""
echo "=== STEP 4: Verify HTTP access with fixed URL ==="
FIXED_URL=$($PG -t -c "SELECT payload->>'videoUrl' FROM content_catalog WHERE source_root_id='extra-storage-bangla-movies' LIMIT 1" | xargs)
echo "Testing: http://127.0.0.1/media${FIXED_URL}"
curl -s -o /dev/null -w "Fixed URL test: %{http_code}\n" --range 0-100 \
  -H "Host: speed4you.net" \
  "http://127.0.0.1/media${FIXED_URL}"
