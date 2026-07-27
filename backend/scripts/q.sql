-- Also check requested-series entries
SELECT id, title, content_type, payload->>'sourcePath' as sp
FROM content_catalog 
WHERE source_root_id = 'requested-series' AND status = 'published'
ORDER BY id;
