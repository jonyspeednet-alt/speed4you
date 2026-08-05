-- Broke Girls is a duplicate of 2 Broke Girls (33348)
-- Others have no disk directories anymore
DELETE FROM content_catalog WHERE id IN (31690, 33357, 32021, 32036);
SELECT COUNT(*) FROM content_catalog WHERE content_type='series' AND status='published';
