-- ===============================================================================
-- Script: restore_bhaskar_revenue.sql
-- Description: Restores missing January 2026 and February 2026 revenue records
--              for Bhaskar Sirisetti (sirisettibhaskar1234@gmail.com).
-- User ID: ab56934e-87c7-47a1-ba38-faa547ea56a1
-- Team ID: db869c92-b1db-4ed0-babc-9e39049fd277 (PROSUMMITS_VIZAG)
-- ===============================================================================

BEGIN;

INSERT INTO public.monthly_revenues (
    id,
    user_id,
    team_id,
    revenue_month,
    amount,
    entered_by,
    created_at,
    week_number,
    client_name,
    source
) VALUES 
(
    'e5b6011f-c7ff-4b5a-a6bd-fb266ad6d845',
    'ab56934e-87c7-47a1-ba38-faa547ea56a1',
    'db869c92-b1db-4ed0-babc-9e39049fd277',
    '2026-01-01',
    3194,
    'ab56934e-87c7-47a1-ba38-faa547ea56a1',
    '2026-06-10T09:15:30.777043+00:00',
    1,
    'NONAME',
    'Linkedin'
),
(
    'c5cde453-fa34-4c63-933e-d2cc06c324f6',
    'ab56934e-87c7-47a1-ba38-faa547ea56a1',
    'db869c92-b1db-4ed0-babc-9e39049fd277',
    '2026-02-01',
    4093,
    'ab56934e-87c7-47a1-ba38-faa547ea56a1',
    '2026-06-10T09:15:12.368514+00:00',
    1,
    'NONAME',
    'Linkedin'
)
ON CONFLICT (id) DO UPDATE SET
    amount = EXCLUDED.amount,
    revenue_month = EXCLUDED.revenue_month,
    team_id = EXCLUDED.team_id,
    user_id = EXCLUDED.user_id,
    entered_by = EXCLUDED.entered_by,
    created_at = EXCLUDED.created_at,
    week_number = EXCLUDED.week_number,
    client_name = EXCLUDED.client_name,
    source = EXCLUDED.source;

COMMIT;

