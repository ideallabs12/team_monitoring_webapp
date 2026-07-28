-- SQL Script to remove IP Attendance tracking from Supabase

-- 1. Remove the 'require_ip_attendance' column from profiles
ALTER TABLE profiles DROP COLUMN IF EXISTS require_ip_attendance;

-- 2. Remove the 'ip_address' column from attendance_logs
ALTER TABLE attendance_logs DROP COLUMN IF EXISTS ip_address;

-- 3. Drop the office_ips table entirely
DROP TABLE IF EXISTS office_ips;
