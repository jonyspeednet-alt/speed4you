#!/bin/bash
PGPASSWORD=postgres
export PGPASSWORD
PG="psql -h 127.0.0.1 -U postgres -d isp_entertainment"

echo "=== BENGALI CONTENT - SAMPLE RECORDS ==="
$PG -c "
SELECT id, source_root_id, 
  payload->>'title' as title,
  payload->>'videoUrl' as video_url,
  payload->>'sourcePath' as source_path,
  status
FROM content_catalog 
WHERE language='Bengali' 
LIMIT 10
"

echo ""
echo "=== BENGALI CONTENT COUNT ==="
$PG -c "SELECT COUNT(*) as total, status FROM content_catalog WHERE language='Bengali' GROUP BY status"

echo ""
echo "=== BANGLA SCANNER ROOTS ==="
$PG -c "SELECT id, label, scan_path, public_base_url, enabled FROM scanner_roots WHERE LOWER(id) LIKE '%bangla%' OR LOWER(label) LIKE '%bangla%' OR LOWER(id) LIKE '%bengali%' OR scan_path LIKE '%Bangla%'"

echo ""
echo "=== CHECK BANGLA DIRECTORY SYMLINK ==="
ls -la /var/www/html/Bangla_Movies 2>/dev/null
ls -la /var/www/html/Extra_Storage/Bangla_Movies 2>/dev/null | head -5
