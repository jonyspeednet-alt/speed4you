-- Add trigger_source column to scanner_runs table
-- This column tracks whether a scan was triggered by 'manual', 'auto', or 'webhook'

ALTER TABLE scanner_runs 
ADD COLUMN IF NOT EXISTS trigger_source TEXT NOT NULL DEFAULT 'manual';

-- Update existing records to have 'manual' as default (since they were triggered manually before this change)
UPDATE scanner_runs 
SET trigger_source = 'manual' 
WHERE trigger_source IS NULL OR trigger_source = '';
