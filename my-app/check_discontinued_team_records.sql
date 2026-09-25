-- ===============================================================================
-- Script: check_discontinued_team_records.sql
-- Description: Check ALL tables for records tied to the discontinued team
--              "WYNxTALKS_discon" before performing the migration.
-- ===============================================================================

-- Target Team: WYNxTALKS_discon (ID: fdd67966-74e7-4387-8b41-e8002bd6a236)

-- 1. Check Monthly Revenues
SELECT 'monthly_revenues' as table_name, COUNT(*) as record_count
FROM monthly_revenues
WHERE team_id = 'fdd67966-74e7-4387-8b41-e8002bd6a236'

UNION ALL

-- 2. Check DIS Reports
SELECT 'dis_reports' as table_name, COUNT(*) as record_count
FROM dis_reports
WHERE team_id = 'fdd67966-74e7-4387-8b41-e8002bd6a236'

UNION ALL

-- 3. Check Monthly Targets
SELECT 'monthly_targets' as table_name, COUNT(*) as record_count
FROM monthly_targets
WHERE team_id = 'fdd67966-74e7-4387-8b41-e8002bd6a236'

UNION ALL

-- 4. Check Team Memberships
SELECT 'team_members' as table_name, COUNT(*) as record_count
FROM team_members
WHERE team_id = 'fdd67966-74e7-4387-8b41-e8002bd6a236'

UNION ALL

-- 5. Check User Profiles (Primary Team)
SELECT 'profiles (primary)' as table_name, COUNT(*) as record_count
FROM profiles
WHERE team_id = 'fdd67966-74e7-4387-8b41-e8002bd6a236'

UNION ALL

-- 6. Check User Profiles (Secondary Team)
SELECT 'profiles (secondary)' as table_name, COUNT(*) as record_count
FROM profiles
WHERE secondary_team_id = 'fdd67966-74e7-4387-8b41-e8002bd6a236';

-- ===============================================================================
-- Detailed Queries (Uncomment to view actual records for any specific table)
-- ===============================================================================

/*
SELECT * FROM monthly_revenues WHERE team_id = 'fdd67966-74e7-4387-8b41-e8002bd6a236';
SELECT * FROM dis_reports WHERE team_id = 'fdd67966-74e7-4387-8b41-e8002bd6a236';
SELECT * FROM monthly_targets WHERE team_id = 'fdd67966-74e7-4387-8b41-e8002bd6a236';
SELECT * FROM team_members WHERE team_id = 'fdd67966-74e7-4387-8b41-e8002bd6a236';
SELECT * FROM profiles WHERE team_id = 'fdd67966-74e7-4387-8b41-e8002bd6a236' OR secondary_team_id = 'fdd67966-74e7-4387-8b41-e8002bd6a236';
*/
