#!/bin/bash
PGPASSWORD=postgres
export PGPASSWORD
PG="psql -h 127.0.0.1 -U postgres -d isp_entertainment"

echo "=== DISTINCT SOURCE ROOTS WITH DUPLICATES ==="
$PG -c "SELECT DISTINCT source_root_id, COUNT(*) as items FROM content_catalog WHERE duplicate_count > 0 GROUP BY source_root_id ORDER BY items DESC"

echo ""
echo "=== SAME MOVIE IN ENGLISH + HINDI-DUBBED (typical pattern) ==="
$PG -c "
SELECT
  c1.payload->>'title' as title,
  c1.source_root_id as root1,
  c2.source_root_id as root2,
  c1.id as id1,
  c2.id as id2,
  c1.status as status1,
  c2.status as status2
FROM content_catalog c1
JOIN content_catalog c2
  ON c1.title_key = c2.title_key
  AND c1.content_type = c2.content_type
  AND c1.id < c2.id
WHERE c1.duplicate_count > 0
ORDER BY title
LIMIT 20
"
