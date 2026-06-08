#!/bin/bash
# ============================================================
# MERGE REAL DUPLICATES (same source_root_id, same title_key)
# Keeps the item with LOWER id (older entry), deletes the rest
# ============================================================

PGPASSWORD=postgres
export PGPASSWORD
PG="psql -h 127.0.0.1 -U postgres -d isp_entertainment"

echo "====== BEFORE MERGE ======"
$PG -c "SELECT COUNT(*) as true_duplicates FROM content_catalog WHERE duplicate_count > 0"

echo ""
echo "====== MERGING: Keep lowest ID, delete extras within same root+title_key ======"
$PG -c "
WITH ranked AS (
  SELECT
    id,
    content_type,
    title_key,
    source_root_id,
    payload->>'title' as title,
    ROW_NUMBER() OVER (
      PARTITION BY content_type, title_key, source_root_id
      ORDER BY
        CASE WHEN status = 'published' THEN 0 ELSE 1 END,
        id ASC
    ) AS rn
  FROM content_catalog
  WHERE duplicate_count > 0
),
to_delete AS (
  SELECT id, title, source_root_id FROM ranked WHERE rn > 1
)
DELETE FROM content_catalog
WHERE id IN (SELECT id FROM to_delete)
RETURNING id, payload->>'title' as title, source_root_id
"

echo ""
echo "====== RESET duplicate_count FOR REMAINING ITEMS ======"
$PG -c "
UPDATE content_catalog
SET
  duplicate_count = 0,
  payload = jsonb_set(payload, '{duplicateCount}', '0')
WHERE duplicate_count > 0
RETURNING id, payload->>'title' as title
"

echo ""
echo "====== FINAL STATUS ======"
$PG -c "SELECT COUNT(*) as total, COUNT(CASE WHEN duplicate_count > 0 THEN 1 END) as still_flagged FROM content_catalog"

echo ""
echo "====== DONE! All true duplicates merged. ======"
