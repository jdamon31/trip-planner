-- supabase/migrations/002_auth_and_features.sql

-- trips: add creator tracking and photo
ALTER TABLE trips ADD COLUMN IF NOT EXISTS created_by_user_id TEXT;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- members: link to auth user (nullable — anonymous members have no user_id)
ALTER TABLE members ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE members
  ADD CONSTRAINT members_trip_user_unique
  UNIQUE (trip_id, user_id)
  DEFERRABLE INITIALLY DEFERRED;

-- polls: allow multiple selections per member
ALTER TABLE polls ADD COLUMN IF NOT EXISTS allow_multiple BOOLEAN NOT NULL DEFAULT false;

-- votes: replace single-member-per-poll unique with per-option unique
-- (allows multiple rows per member per poll for multi-select)
ALTER TABLE votes DROP CONSTRAINT IF EXISTS votes_poll_id_member_id_key;
ALTER TABLE votes
  ADD CONSTRAINT votes_poll_member_option_unique
  UNIQUE (poll_id, member_id, option_id);

-- date_ranges: store explicit proposed date windows (non-contiguous support)
ALTER TABLE trips ADD COLUMN IF NOT EXISTS date_ranges JSONB DEFAULT '[]';
