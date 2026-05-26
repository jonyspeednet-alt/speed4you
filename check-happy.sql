SELECT id, content_type, title, source_root_id, payload->>'sourcePath' as source_path FROM content_catalog WHERE title ILIKE '%Happy Patel%';
