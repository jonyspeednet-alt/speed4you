-- ============================================================
-- DIAGNOSTIC: Why does ডাক্তার বাবু (2022) have dup: 20?
-- Run this on the production server:
--   psql -h 127.0.0.1 -U postgres -d isp_entertainment -f scripts/inspect-doctor-babu-dups.sql
-- ============================================================

-- 1. Find the title_key for this movie
SELECT id, title_key, source_root_id, status, duplicate_count,
       payload->>'title' as title,
       payload->>'sourcePath' as path
FROM content_catalog
WHERE payload->>'title' ILIKE '%ডাক্তার বাবু%'
   OR payload->>'title' ILIKE '%doctor babu%'
LIMIT 20;

-- 2. Now get the title_key and find ALL items sharing it
-- (Replace 'RESULT_TITLE_KEY' with the actual title_key from query 1)
-- SELECT id, title_key, source_root_id, source_type, status, duplicate_count,
--        payload->>'title' as title,
--        payload->>'sourcePath' as path
-- FROM content_catalog
-- WHERE title_key = 'RESULT_TITLE_KEY'
-- ORDER BY source_root_id, id;

-- 3. Better: find ALL items grouped by title_key for Bangla movies
SELECT title_key, COUNT(*) as total_items,
       COUNT(DISTINCT source_root_id) as distinct_roots,
       ARRAY_AGG(DISTINCT source_root_id) as root_ids,
       ARRAY_AGG(id ORDER BY id) as item_ids,
       STRING_AGG(payload->>'title', ' | ') as all_titles
FROM content_catalog
WHERE content_type = 'movie'
  AND source_root_id LIKE '%bangla%'
GROUP BY title_key
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC
LIMIT 30;

-- 4. Also check items with the same title_key but NO source_root_id (empty)
SELECT title_key, COUNT(*) as total_items,
       COUNT(DISTINCT source_root_id) as distinct_roots,
       ARRAY_AGG(id ORDER BY id) as item_ids,
       STRING_AGG(payload->>'title', ' | ') as all_titles
FROM content_catalog
WHERE content_type = 'movie'
  AND (source_root_id = '' OR source_root_id IS NULL)
GROUP BY title_key
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC
LIMIT 30;

-- 5. Show ALL scanner roots in the database
SELECT id, label, scan_path, type, language, category, enabled
FROM scanner_roots
ORDER BY id;

-- 6. Full diagnostic: list all items with dup > 0 and their root distribution
SELECT title_key, COUNT(*) as group_size,
       COUNT(DISTINCT source_root_id) as roots,
       MAX(duplicate_count) as max_dup,
       STRING_AGG(DISTINCT source_root_id, ', ') as root_list
FROM content_catalog
WHERE duplicate_count > 0
GROUP BY title_key
ORDER BY COUNT(*) DESC
LIMIT 50;

-- 7. Quick fix: show how many items have empty source_root_id
SELECT source_root_id, COUNT(*) as cnt
FROM content_catalog
WHERE content_type = 'movie'
GROUP BY source_root_id
ORDER BY cnt DESC;
