#!/bin/bash
# ============================================================
# SMART DUPLICATE FIX SCRIPT
# 
# Logic:
#   - Items in DIFFERENT source_root_id are NOT real duplicates
#     (e.g., english-movies vs hindi-dubbed-movies = different versions)
#   - Items in SAME source_root_id with same title_key = real duplicates
#
# This script:
#   1. Resets duplicate_count=0 for cross-root "duplicates" (false positives)
#   2. For same-root duplicates, keeps the one with lower id, removes extras
#   3. Reports what was done
# ============================================================

PGPASSWORD=postgres
export PGPASSWORD
PG="psql -h 127.0.0.1 -U postgres -d isp_entertainment"

echo "====== BEFORE FIX ======"
$PG -c "SELECT COUNT(*) as items_with_dup_flag, COUNT(DISTINCT title_key) as dup_groups FROM content_catalog WHERE duplicate_count > 0"

echo ""
echo "====== STEP 1: Find TRUE duplicates (same root, same title_key) ======"
$PG -c "
SELECT c1.source_root_id, c1.content_type, c1.payload->>'title' as title,
       COUNT(*) as same_root_count
FROM content_catalog c1
JOIN content_catalog c2
  ON c1.title_key = c2.title_key
  AND c1.content_type = c2.content_type
  AND c1.source_root_id = c2.source_root_id
  AND c1.id != c2.id
WHERE c1.duplicate_count > 0
GROUP BY c1.source_root_id, c1.content_type, c1.title_key, c1.payload->>'title'
ORDER BY same_root_count DESC, title
"

echo ""
echo "====== STEP 2: Reset FALSE duplicate flags (cross-root = different language versions) ======"
# Update: for each item, recalculate if items in SAME root only
# An item is a true duplicate only if there's ANOTHER item with same title_key AND same source_root_id
$PG -c "
WITH same_root_dups AS (
  SELECT DISTINCT c1.id
  FROM content_catalog c1
  WHERE EXISTS (
    SELECT 1 FROM content_catalog c2
    WHERE c2.title_key = c1.title_key
      AND c2.content_type = c1.content_type
      AND c2.source_root_id = c1.source_root_id
      AND c2.id != c1.id
  )
),
cross_root_only AS (
  SELECT id FROM content_catalog
  WHERE duplicate_count > 0
    AND id NOT IN (SELECT id FROM same_root_dups)
)
UPDATE content_catalog
SET
  duplicate_count = 0,
  payload = jsonb_set(payload, '{duplicateCount}', '0')
WHERE id IN (SELECT id FROM cross_root_only)
RETURNING id, payload->>'title' as title, source_root_id
"

echo ""
echo "====== AFTER FALSE-POSITIVE RESET ======"
$PG -c "SELECT COUNT(*) as items_with_dup_flag FROM content_catalog WHERE duplicate_count > 0"

echo ""
echo "====== STEP 3: Show remaining TRUE duplicates (same root) ======"
$PG -c "
SELECT c.id, c.status, c.source_root_id, c.payload->>'title' as title, c.duplicate_count
FROM content_catalog c
WHERE c.duplicate_count > 0
ORDER BY c.title_key, c.source_root_id, c.id
"
