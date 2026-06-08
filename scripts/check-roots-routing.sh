#!/bin/bash
echo "=== CHECK WHAT ROOTS SERVE FILES AND HOW ==="
# List all scanner roots from DB
PGPASSWORD=postgres
export PGPASSWORD
PG="psql -h 127.0.0.1 -U postgres -d isp_entertainment"

$PG -c "SELECT id, label, scan_path, public_base_url, type FROM scanner_roots ORDER BY id"

echo ""
echo "=== CHECK IF /media/ ROUTE WORKS ==="
# /media/ rewrites to /var/www/html/ - so /media/New_Movies_1/file should work
curl -s -o /dev/null -w "Test /media/ route: %{http_code}\n" --range 0-1023 \
  "http://localhost/media/New_Movies_1/Matka%20King%202026%20S01E01%20AMZN%20Hindi%20%28ORG%205.1%29%201080p%20WEB-DL%20x264%20Multi%20Subs.mkv"

echo ""
echo "=== SAMPLE videoUrls from DB (first 10 unique patterns) ==="
$PG -t -c "
SELECT DISTINCT
  payload->>'sourcePublicPath' as public_path,
  source_root_id
FROM content_catalog
WHERE source_type = 'scanner'
  AND payload->>'sourcePublicPath' IS NOT NULL
  AND payload->>'sourcePublicPath' != ''
GROUP BY payload->>'sourcePublicPath', source_root_id
LIMIT 20
"
