-- Step 1: Add new JSONB column
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS team_settings JSONB DEFAULT '{}'::jsonb;

-- Step 2: Migrate existing data to team_settings
-- This script merges the primary team_id and secondary_team_roles into a single team_settings object
-- It also copies the global has_revenue_logging and has_dis_reporting into the per-team settings.
UPDATE profiles
SET team_settings = (
  WITH user_teams AS (
    SELECT p2.team_id as tid,
           CASE WHEN p2.platform_role = 'teamlead' THEN 'teamlead' ELSE 'member' END as r
    FROM profiles p2 WHERE p2.id = profiles.id AND p2.team_id IS NOT NULL
    UNION ALL
    SELECT key as tid, value#>>'{}' as r
    FROM jsonb_each(COALESCE(profiles.secondary_team_roles, '{}'::jsonb))
  )
  SELECT COALESCE(
    jsonb_object_agg(
      tid,
      jsonb_build_object(
        'role', r,
        'has_revenue', COALESCE(profiles.has_revenue_logging, true),
        'has_dis', COALESCE(profiles.has_dis_reporting, true)
      )
    ), 
    '{}'::jsonb
  )
  FROM user_teams
);

-- Step 3: Change 'teamlead' platform_role to 'user' since team leadership is now per-team
UPDATE profiles 
SET platform_role = 'user' 
WHERE platform_role = 'teamlead';

-- Step 4: Drop old columns (Optional, but recommended once verified)
-- ALTER TABLE profiles DROP COLUMN IF EXISTS secondary_team_roles;
-- ALTER TABLE profiles DROP COLUMN IF EXISTS has_revenue_logging;
-- ALTER TABLE profiles DROP COLUMN IF EXISTS has_dis_reporting;
