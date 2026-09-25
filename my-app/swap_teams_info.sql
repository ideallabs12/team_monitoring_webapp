-- ===============================================================================
-- Script: swap_teams_info.sql
-- Description: Swaps the `linkedin`, `website`, and `logo` values between 
--              the active "WYNx TALKS" team and the discontinued 
--              "WYNxTALKS_discon" team.
-- ===============================================================================

BEGIN;

-- We use a Common Table Expression (CTE) to safely read the values from both 
-- teams before applying the updates to swap them.
WITH swapped_data AS (
  SELECT 
    id,
    CASE 
      WHEN id = 'cfdb2f4d-fc88-4ad0-9b6f-5254f037d563' THEN (SELECT linkedin FROM teams WHERE id = 'fdd67966-74e7-4387-8b41-e8002bd6a236')
      ELSE (SELECT linkedin FROM teams WHERE id = 'cfdb2f4d-fc88-4ad0-9b6f-5254f037d563')
    END as new_linkedin,
    CASE 
      WHEN id = 'cfdb2f4d-fc88-4ad0-9b6f-5254f037d563' THEN (SELECT website FROM teams WHERE id = 'fdd67966-74e7-4387-8b41-e8002bd6a236')
      ELSE (SELECT website FROM teams WHERE id = 'cfdb2f4d-fc88-4ad0-9b6f-5254f037d563')
    END as new_website,
    CASE 
      WHEN id = 'cfdb2f4d-fc88-4ad0-9b6f-5254f037d563' THEN (SELECT logo_url FROM teams WHERE id = 'fdd67966-74e7-4387-8b41-e8002bd6a236')
      ELSE (SELECT logo_url FROM teams WHERE id = 'cfdb2f4d-fc88-4ad0-9b6f-5254f037d563')
    END as new_logo_url
  FROM teams
  WHERE id IN ('cfdb2f4d-fc88-4ad0-9b6f-5254f037d563', 'fdd67966-74e7-4387-8b41-e8002bd6a236')
)
UPDATE teams
SET 
  linkedin = sd.new_linkedin,
  website = sd.new_website,
  logo_url = sd.new_logo_url
FROM swapped_data sd
WHERE teams.id = sd.id;

COMMIT;
