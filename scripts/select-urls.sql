SELECT payload->>'videoUrl' as url FROM content_catalog WHERE source_root_id='extra-storage-bangla-movies' AND (payload->>'videoUrl') IS NOT NULL LIMIT 3;
