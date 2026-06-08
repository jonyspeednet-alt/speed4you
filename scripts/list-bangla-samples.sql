SELECT id, payload->>'title' as title, payload->>'videoUrl' as video_url, payload->>'sourcePath' as source_path FROM content_catalog WHERE source_root_id='extra-storage-bangla-movies' LIMIT 20;
