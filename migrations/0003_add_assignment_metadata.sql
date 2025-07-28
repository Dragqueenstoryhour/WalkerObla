-- Migration: Add metadata field to assignments table
-- This field will store assignment type and configuration data

ALTER TABLE assignments ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Add an index on the metadata field for better query performance
CREATE INDEX IF NOT EXISTS idx_assignments_metadata ON assignments USING GIN (metadata);

-- Add some example data to demonstrate the new assignment type
-- (This is optional and can be removed in production)
COMMENT ON COLUMN assignments.metadata IS 'JSON field storing assignment type and configuration data. Example: {"assignmentType": "watch-practice", "soundPattern": {"sound": "r", "position": "starts-with"}, "structure": {"wordsPerAssignment": 3, "animationPlaysPerWord": 3, "practiceAttemptsPerWord": 3, "phrasesPerWord": 3}}';