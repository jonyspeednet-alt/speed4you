SELECT payload->>'scanSignature' as sig, count(1) as qty FROM content_catalog WHERE source_root_id='extra-storage-bangla-movies' GROUP BY sig HAVING count(1) > 1 ORDER BY qty DESC LIMIT 20;
