SELECT source_root_id, count(1) as total, count(distinct payload->>'sourcePath') as distinct_paths FROM content_catalog GROUP BY source_root_id ORDER BY total DESC;
