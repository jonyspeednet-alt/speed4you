SELECT id, payload->>'title' AS title, payload->>'sourcePath' AS sourcePath, payload->>'videoUrl' AS videoUrl, payload->>'type' AS content_type FROM content_catalog WHERE id = 20790;
