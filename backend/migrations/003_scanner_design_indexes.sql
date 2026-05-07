-- Migration 003: Scanner system-design indexes
-- Keeps production deployments aligned with runtime schema bootstrap indexes.
BEGIN;

CREATE INDEX IF NOT EXISTS idx_content_catalog_scan_signature
  ON content_catalog ((payload->>'scanSignature'))
  WHERE payload ? 'scanSignature';

CREATE INDEX IF NOT EXISTS idx_content_catalog_scanner_root
  ON content_catalog (source_type, source_root_id);

CREATE INDEX IF NOT EXISTS idx_content_catalog_scanner_root_status
  ON content_catalog (source_root_id, status)
  WHERE source_type = 'scanner';

CREATE INDEX IF NOT EXISTS idx_scanner_roots_enabled
  ON scanner_roots (enabled, type);

CREATE INDEX IF NOT EXISTS idx_scanner_runs_started_at
  ON scanner_runs (started_at DESC NULLS LAST);

COMMIT;
