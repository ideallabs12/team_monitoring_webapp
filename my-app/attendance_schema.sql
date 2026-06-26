-- Run this script in the Supabase SQL Editor

-- 1. Add toggles to the profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS require_gps_attendance BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS require_ip_attendance BOOLEAN DEFAULT TRUE;

-- 2. Create the attendance_logs table
CREATE TABLE IF NOT EXISTS attendance_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    attendance_date DATE DEFAULT CURRENT_DATE,
    check_in_time TIMESTAMP WITH TIME ZONE,
    check_out_time TIMESTAMP WITH TIME ZONE,
    latitude NUMERIC,
    longitude NUMERIC,
    ip_address TEXT,
    status TEXT DEFAULT 'present', -- 'present', 'pending_approval'
    exception_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Enable RLS and setup policies
ALTER TABLE attendance_logs ENABLE ROW LEVEL SECURITY;

-- Users can insert and read their own attendance logs
CREATE POLICY "Users can insert their own attendance"
    ON attendance_logs FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own attendance"
    ON attendance_logs FOR SELECT
    USING (auth.uid() = user_id);

-- Admins can view all attendance logs
CREATE POLICY "Admins can view all attendance logs"
    ON attendance_logs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.platform_role = 'admin'
        )
    );

-- Admins can update attendance logs (e.g., approve exceptions)
CREATE POLICY "Admins can update attendance logs"
    ON attendance_logs FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.platform_role = 'admin'
        )
    );

-- Users can update their own attendance (Required for Check-Out)
CREATE POLICY "Users can update their own attendance"
    ON attendance_logs FOR UPDATE
    USING (auth.uid() = user_id);
