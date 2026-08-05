SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'content_catalog' 
ORDER BY ordinal_position;
