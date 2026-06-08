#!/bin/bash
# ============================================================
# DUPLICATE ANALYSIS SCRIPT - Runs on the remote server
# ============================================================

PGPASSWORD=postgres
export PGPASSWORD

PG="psql -h 127.0.0.1 -U postgres -d isp_entertainment"

echo "====== DUPLICATE SUMMARY ======"
$PG -c "
SELECT
  COUNT(DISTINCT title_key) AS total_dup_groups,
  COUNT(*) AS total_dup_items,
  COUNT(*) - COUNT(DISTINCT title_key) AS items_to_remove
FROM content_catalog
WHERE duplicate_count > 0;
"

echo ""
echo "====== TOP 30 DUPLICATE GROUPS ======"
$PG -c "
SELECT content_type, title_key, COUNT(*) AS members
FROM content_catalog
WHERE duplicate_count > 0
GROUP BY content_type, title_key
HAVING COUNT(*) >= 2
ORDER BY members DESC, title_key
LIMIT 30;
"

echo ""
echo "====== DUPLICATE ITEMS DETAIL (id, status, source_type, root, title) ======"
$PG -c "
SELECT
  c.id,
  c.status,
  c.source_type,
  c.source_root_id,
  c.duplicate_count,
  c.payload->>'title' AS title
FROM content_catalog c
WHERE c.duplicate_count > 0
ORDER BY c.title_key, c.id;
"
