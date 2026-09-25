-- ===============================================================================
-- Script: migrate_wynxtalks_records.sql
-- Description: Migrates ALL historical records (revenues, dis_reports, targets)
--              from the discontinued team "WYNxTALKS_discon" to the active 
--              team "WYNx TALKS".
-- ===============================================================================

-- Source Team: WYNxTALKS_discon (ID: fdd67966-74e7-4387-8b41-e8002bd6a236)
-- Target Team: WYNx TALKS       (ID: cfdb2f4d-fc88-4ad0-9b6f-5254f037d563)

BEGIN;

-- -------------------------------------------------------------------------------
-- 1. Migrate Monthly Revenues
-- -------------------------------------------------------------------------------
ALTER TABLE monthly_revenues ADD COLUMN IF NOT EXISTS migration_notes TEXT;

UPDATE monthly_revenues
SET 
  team_id = 'cfdb2f4d-fc88-4ad0-9b6f-5254f037d563',
  migration_notes = 'Migrated from WYNxTALKS_discon on ' || CURRENT_DATE
WHERE team_id = 'fdd67966-74e7-4387-8b41-e8002bd6a236';

-- -------------------------------------------------------------------------------
-- 2. Migrate DIS Reports
-- -------------------------------------------------------------------------------
ALTER TABLE dis_reports ADD COLUMN IF NOT EXISTS migration_notes TEXT;

UPDATE dis_reports
SET 
  team_id = 'cfdb2f4d-fc88-4ad0-9b6f-5254f037d563',
  migration_notes = 'Migrated from WYNxTALKS_discon on ' || CURRENT_DATE
WHERE team_id = 'fdd67966-74e7-4387-8b41-e8002bd6a236';

-- -------------------------------------------------------------------------------
-- 3. Migrate Monthly Targets
-- -------------------------------------------------------------------------------
ALTER TABLE monthly_targets ADD COLUMN IF NOT EXISTS migration_notes TEXT;

UPDATE monthly_targets
SET 
  team_id = 'cfdb2f4d-fc88-4ad0-9b6f-5254f037d563',
  migration_notes = 'Migrated from WYNxTALKS_discon on ' || CURRENT_DATE
WHERE team_id = 'fdd67966-74e7-4387-8b41-e8002bd6a236';

COMMIT;
