WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY (payload->>'sourcePath'), source_root_id
      ORDER BY
        CASE WHEN status = 'published' THEN 0 ELSE 1 END ASC,
        id ASC
    ) as rn
  FROM content_catalog
  WHERE source_root_id = 'extra-storage-bangla-movies'
)
SELECT 
  COUNT(*) as total_rows,
  COUNT(CASE WHEN rn = 1 THEN 1 END) as rows_to_keep,
  COUNT(CASE WHEN rn > 1 THEN 1 END) as rows_to_delete
FROM ranked;
