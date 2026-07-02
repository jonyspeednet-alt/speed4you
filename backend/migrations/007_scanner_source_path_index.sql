-- Migration 007: index the scanner sourcePath JSON lookup
-- upsertScannedItem falls back to matching new items by payload->>'sourcePath'
-- (data/store/scanner.js) when scanSignature doesn't match — e.g. after a root rename.
-- Without this index that lookup is a sequential scan per new item during a scan.
BEGIN;

CREATE INDEX IF NOT EXISTS idx_content_catalog_source_path
  ON content_catalog ((payload->>'sourcePath'))
  WHERE source_type = 'scanner' AND payload ? 'sourcePath';

COMMIT;
