-- 004_search_optimizations.sql
-- Adds Full-Text Search (tsvector) capabilities to content_catalog

-- Ensure pg_trgm is created (it might already exist from previous manual setup)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Add tsvector column
ALTER TABLE content_catalog ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Create function to update search_vector automatically
CREATE OR REPLACE FUNCTION update_content_search_vector() RETURNS trigger AS $$
BEGIN
  -- Combine fields for full text search, giving title higher weight ('A' weight)
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.category, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.payload->>'genre', '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.payload->>'description', '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(NEW.language, '')), 'C');
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trg_update_search_vector ON content_catalog;
CREATE TRIGGER trg_update_search_vector
  BEFORE INSERT OR UPDATE ON content_catalog
  FOR EACH ROW
  EXECUTE FUNCTION update_content_search_vector();

-- Backfill existing rows
UPDATE content_catalog SET updated_at = updated_at WHERE search_vector IS NULL;

-- Create GIN index on search_vector
CREATE INDEX IF NOT EXISTS idx_cc_search_vector ON content_catalog USING GIN (search_vector);

-- Create trigram index on title for fuzzy matching
CREATE INDEX IF NOT EXISTS idx_cc_title_trgm_native ON content_catalog USING GIN (title gin_trgm_ops);
