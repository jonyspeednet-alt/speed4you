-- Add view_count column to content_catalog for tracking content popularity
ALTER TABLE content_catalog ADD COLUMN IF NOT EXISTS view_count BIGINT NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_content_catalog_view_count ON content_catalog (view_count DESC);
