-- Publish all draft items that have a sourcePath
UPDATE content_catalog SET status = 'published', payload = jsonb_set(payload, '{metadataStatus}', '"matched"') 
WHERE status = 'draft' AND payload->>'sourcePath' IS NOT NULL AND payload->>'sourcePath' != '';

-- Count result
SELECT status, COUNT(*) FROM content_catalog GROUP BY status ORDER BY status;
