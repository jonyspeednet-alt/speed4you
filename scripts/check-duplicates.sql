-- =============================================================
-- DUPLICATE ANALYSIS & AUTO-FIX SCRIPT
-- =============================================================

-- 1. Summary
SELECT
  COUNT(DISTINCT title_key) AS total_dup_groups,
  COUNT(*) AS total_dup_items,
  COUNT(*) - COUNT(DISTINCT title_key) AS items_to_remove
FROM content_catalog
WHERE duplicate_count > 0;

-- 2. All duplicate groups with member details
SELECT
  c.content_type,
  c.title_key,
  c.id,
  c.status,
  c.source_type,
  c.source_root_id,
  c.payload->>'title' AS title,
  c.payload->>'sourcePath' AS source_path,
  c.duplicate_count,
  ROW_NUMBER() OVER (PARTITION BY c.content_type, c.title_key
    ORDER BY
      CASE WHEN c.status = 'published' THEN 0 ELSE 1 END,
      CASE WHEN c.source_type = 'manual' THEN 0 ELSE 1 END,
      c.id ASC
  ) AS row_rank
FROM content_catalog c
WHERE c.duplicate_count > 0
ORDER BY c.content_type, c.title_key, row_rank;
