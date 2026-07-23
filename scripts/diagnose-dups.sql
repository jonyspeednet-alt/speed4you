-- ============================================================
-- DIAGNOSTIC: ডাক্তার বাবু duplicate সমস্যা খুঁজে বের করো
-- সবকিছু একসাথে চালাও:
-- psql -h 127.0.0.1 -U postgres -d isp_entertainment -f /tmp/diagnose-dups.sql
-- ============================================================

\echo '===== 1. এই মুভির সব copy ====='
SELECT id, title_key, source_root_id, source_type, status, duplicate_count,
       payload->>'title' as title,
       payload->>'sourcePath' as path,
       payload->>'scanSignature' as sig
FROM content_catalog
WHERE title_key LIKE '%ডাক্তার বাবু%'
ORDER BY id;

\echo ''
\echo '===== 2. সব scanner root ====='
SELECT id, label, scan_path, type, language, enabled
FROM scanner_roots ORDER BY id;

\echo ''
\echo '===== 3. Bangla root এর সব আইটেম (root scan path দেখো) ====='
SELECT sr.id as root_id, sr.scan_path, sr.label, COUNT(cc.id) as item_count
FROM scanner_roots sr
LEFT JOIN content_catalog cc ON cc.source_root_id = sr.id
GROUP BY sr.id, sr.scan_path, sr.label
ORDER BY sr.id;

\echo ''
\echo '===== 4. খালি source_root_id আছে এমন আইটেম (এরাই false duplicate!) ====='
SELECT COUNT(*) as empty_root_count
FROM content_catalog
WHERE (source_root_id IS NULL OR source_root_id = '');

\echo ''
\echo '===== 5. Top duplicate groups ====='
SELECT title_key, COUNT(*) as total,
       COUNT(DISTINCT source_root_id) as distinct_roots,
       STRING_AGG(DISTINCT source_root_id, ' | ') as root_ids,
       STRING_AGG(CAST(id AS TEXT), ', ' ORDER BY id) as item_ids,
       STRING_AGG(DISTINCT payload->>'title', ' | ') as titles
FROM content_catalog
WHERE content_type = 'movie' AND duplicate_count > 0
GROUP BY title_key
ORDER BY COUNT(*) DESC
LIMIT 15;
