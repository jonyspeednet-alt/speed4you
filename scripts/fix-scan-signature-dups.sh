#!/bin/bash
# Fix: Same scanSignature → delete duplicates, keep best (lowest id/published)
PGPASSWORD=postgres
export PGPASSWORD
PG="psql -h 127.0.0.1 -U postgres -d isp_entertainment"

echo "=== STEP 1: Find all groups with duplicate scanSignatures ==="
$PG -c "
SELECT
  payload->>'scanSignature' AS sig,
  COUNT(*) AS count,
  array_agg(id ORDER BY
    CASE WHEN status='published' THEN 0 ELSE 1 END,
    id ASC
  ) AS ids
FROM content_catalog
WHERE source_type = 'scanner'
  AND COALESCE(payload->>'scanSignature', '') <> ''
GROUP BY sig
HAVING COUNT(*) > 1
ORDER BY count DESC
LIMIT 50
"

echo ""
echo "=== STEP 2: Delete duplicate scanSignature entries (keep lowest published id) ==="
$PG -c "
WITH ranked AS (
  SELECT
    id,
    payload->>'scanSignature' AS sig,
    payload->>'title' AS title,
    source_root_id,
    ROW_NUMBER() OVER (
      PARTITION BY payload->>'scanSignature'
      ORDER BY
        CASE WHEN status='published' THEN 0 ELSE 1 END,
        id ASC
    ) AS rn
  FROM content_catalog
  WHERE source_type = 'scanner'
    AND COALESCE(payload->>'scanSignature', '') <> ''
),
to_delete AS (
  SELECT id, sig, title FROM ranked WHERE rn > 1
)
DELETE FROM content_catalog
WHERE id IN (SELECT id FROM to_delete)
RETURNING id, payload->>'title' AS title, payload->>'scanSignature' AS sig
"

echo ""
echo "=== STEP 3: Check High Potential now ==="
$PG -c "
SELECT id, status, source_root_id, payload->>'title' AS title, payload->>'scanSignature' AS sig
FROM content_catalog
WHERE LOWER(payload->>'title') LIKE '%high potential%'
"

echo ""
echo "=== STEP 4: Total items after cleanup ==="
$PG -c "SELECT COUNT(*) as total FROM content_catalog"
