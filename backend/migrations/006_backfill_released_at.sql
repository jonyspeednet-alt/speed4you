-- Backfill released_at column for items with year but no released_at
UPDATE content_catalog 
SET released_at = (year::text || '-01-01')::date
WHERE released_at IS NULL AND year IS NOT NULL;

-- Backfill payload.releasedAt for consistency
UPDATE content_catalog 
SET payload = jsonb_set(payload, '{releasedAt}', to_jsonb(year::text || '-01-01'), true)
WHERE payload->>'releasedAt' IS NULL AND year IS NOT NULL;
