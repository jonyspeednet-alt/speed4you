-- First, see what these entries currently have
SELECT id, payload->>'title' as title, payload->'seasons'->0->>'sourcePath' as src
FROM content_catalog WHERE id IN (31690, 33357, 32021, 32036);
