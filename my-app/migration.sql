-- Add the new JSONB column
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS secondary_team_roles JSONB DEFAULT '{}'::jsonb;

-- Migrate existing array data to JSONB (assuming default role is 'member')
UPDATE profiles 
SET secondary_team_roles = (
  SELECT jsonb_object_agg(team_id, 'member')
  FROM unnest(secondary_team_ids) AS team_id
)
WHERE secondary_team_ids IS NOT NULL AND array_length(secondary_team_ids, 1) > 0;

-- Drop the old array column
ALTER TABLE profiles DROP COLUMN IF EXISTS secondary_team_ids;
