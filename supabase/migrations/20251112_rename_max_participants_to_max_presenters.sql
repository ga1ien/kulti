/**
 * Rename max_participants to max_presenters
 *
 * Purpose: Clarify that the limit applies only to presenters (who stream),
 * not viewers (who watch). Viewers can join unlimited via HLS streaming.
 */

-- Rename the column in sessions table
ALTER TABLE sessions
RENAME COLUMN max_participants TO max_presenters;

-- Update the check constraint if it exists
-- First drop the old constraint if it exists
ALTER TABLE sessions
DROP CONSTRAINT IF EXISTS sessions_min_max_check;

-- Add the updated constraint with new column name
ALTER TABLE sessions
ADD CONSTRAINT sessions_min_max_check
CHECK (min_participants <= max_presenters);

-- Add comment to document the change
COMMENT ON COLUMN sessions.max_presenters IS
'Maximum number of presenters (who can share video/audio) allowed in the session. Viewers are unlimited.';
