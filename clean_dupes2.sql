DELETE FROM content_catalog WHERE id IN (32690, 31443, 32265, 31261, 31359, 32685, 31585);
SELECT COUNT(*) FROM content_catalog WHERE content_type='series' AND status='published';
