INSERT INTO content_catalog (id, slug, content_type, status, payload) 
VALUES (99999, 'test-99999', 'series', 'published', '{"title":"Test"}'::jsonb);
SELECT id, payload->>'title' FROM content_catalog WHERE id=99999;
