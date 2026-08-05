-- Check current Regai payload
SELECT id, payload->>'title', payload->>'tmdbId', payload->>'overview'
FROM content_catalog WHERE id=32690;

-- Get the episodes to rebuild
SELECT jsonb_pretty(payload->'seasons') FROM content_catalog WHERE id=32690;
