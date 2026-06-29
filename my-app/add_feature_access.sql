-- ==========================================
-- ADD FEATURE ACCESS FOR DYNAMIC ROLE MANAGEMENT
-- ==========================================

-- 1. Add the feature_access JSONB column to the profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS feature_access JSONB DEFAULT '{}'::jsonb;

-- 2. Update existing 'admin' users to have full access
UPDATE public.profiles
SET feature_access = '{
  "writeUps": true,
  "reviews": true,
  "auditLogs": true,
  "settings": true,
  "controlPanel": true,
  "aiAnalytics": true,
  "attendance": true
}'::jsonb
WHERE platform_role = 'admin';

-- 3. Update existing 'executive' users to have read-only access
-- Executives can view the modules but cannot edit (which is enforced in UI)
-- However, we turn off sensitive modules entirely for them as per our previous logic
UPDATE public.profiles
SET feature_access = '{
  "writeUps": true,
  "reviews": true,
  "auditLogs": false,
  "settings": false,
  "controlPanel": false,
  "aiAnalytics": false,
  "attendance": false
}'::jsonb
WHERE platform_role = 'executive';

-- 4. Give the master admin (signatureglobalconferences@gmail.com) full access
-- Just in case their role wasn't picked up properly
UPDATE public.profiles
SET feature_access = '{
  "writeUps": true,
  "reviews": true,
  "auditLogs": true,
  "settings": true,
  "controlPanel": true,
  "aiAnalytics": true,
  "attendance": true
}'::jsonb
WHERE email = 'signatureglobalconferences@gmail.com';
