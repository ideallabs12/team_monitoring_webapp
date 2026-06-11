-- =========================================================================
-- REVERT SCRIPT: migration_v2.sql
-- Run this if you need to roll back the team_settings migration.
-- =========================================================================

-- Step 1: Ensure old columns exist (in case they were dropped)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS secondary_team_roles JSONB DEFAULT '{}'::jsonb;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS has_revenue_logging BOOLEAN DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS has_dis_reporting BOOLEAN DEFAULT true;

-- Step 2: Restore global has_revenue_logging and has_dis_reporting 
-- (Falls back to 'true' if no setting is found for the primary team)
UPDATE profiles
SET has_revenue_logging = COALESCE(
      (team_settings->(team_id::text))->>'has_revenue', 
      'true'
    )::boolean,
    has_dis_reporting = COALESCE(
      (team_settings->(team_id::text))->>'has_dis', 
      'true'
    )::boolean
WHERE team_settings IS NOT NULL AND team_id IS NOT NULL;

-- Step 3: Restore 'teamlead' to platform_role if they were a teamlead in their primary team
UPDATE profiles
SET platform_role = 'teamlead'
WHERE platform_role = 'user' 
  AND team_id IS NOT NULL 
  AND team_settings IS NOT NULL
  AND (team_settings->(team_id::text))->>'role' = 'teamlead';

-- Step 4: Restore secondary_team_roles (filtering out the primary team_id)
UPDATE profiles
SET secondary_team_roles = (
  SELECT COALESCE(
    jsonb_object_agg(key, value->>'role'), 
    '{}'::jsonb
  )
  FROM jsonb_each(profiles.team_settings)
  WHERE key != COALESCE(profiles.team_id::text, '')
)
WHERE team_settings IS NOT NULL;

-- Step 5: Drop the team_settings column
ALTER TABLE profiles DROP COLUMN IF EXISTS team_settings;
