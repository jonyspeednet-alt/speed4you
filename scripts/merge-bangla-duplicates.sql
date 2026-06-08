BEGIN;

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
),
to_delete AS (
  SELECT id FROM ranked WHERE rn > 1
)
DELETE FROM content_catalog
WHERE id IN (SELECT id FROM to_delete);

COMMIT;
