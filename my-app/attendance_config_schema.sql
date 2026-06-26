-- Run this script in the Supabase SQL Editor

-- Step 1: Add WFH bypass flag to profiles if it doesn't exist
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS wfh_enabled BOOLEAN DEFAULT false;

-- Step 2: Create Office Locations Table
CREATE TABLE IF NOT EXISTS office_locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    radius_meters INTEGER NOT NULL DEFAULT 300,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Step 3: Create Office IPs Table (Linked to Locations)
CREATE TABLE IF NOT EXISTS office_ips (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    ip_address TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Safely add the location_id column if the table already existed from before
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='office_ips' AND column_name='location_id') THEN 
        ALTER TABLE office_ips ADD COLUMN location_id UUID REFERENCES office_locations(id) ON DELETE CASCADE; 
    END IF; 
END $$;

-- Step 4: Setup RLS Policies
-- Enable RLS
ALTER TABLE office_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE office_ips ENABLE ROW LEVEL SECURITY;

-- Allow read access to authenticated users
CREATE POLICY "Allow authenticated read access on office_locations" 
ON office_locations FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated read access on office_ips" 
ON office_ips FOR SELECT TO authenticated USING (true);

-- Allow all access to admin users
CREATE POLICY "Allow admin all access on office_locations" 
ON office_locations FOR ALL TO authenticated 
USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND platform_role = 'admin')
);

CREATE POLICY "Allow admin all access on office_ips" 
ON office_ips FOR ALL TO authenticated 
USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND platform_role = 'admin')
);

-- Step 5: Insert Default Values (Run once)
-- Insert Main Office Location
INSERT INTO office_locations (name, latitude, longitude, radius_meters, is_active)
SELECT 'Main Branch HQ', 17.4790648, 78.3938006, 300, true
WHERE NOT EXISTS (SELECT 1 FROM office_locations LIMIT 1);

-- Insert Main Office Wi-Fi, linked to the location above
DO $$
DECLARE
    loc_id UUID;
BEGIN
    SELECT id INTO loc_id FROM office_locations WHERE name = 'Main Branch HQ' LIMIT 1;
    
    IF loc_id IS NOT NULL THEN
        INSERT INTO office_ips (location_id, name, ip_address, is_active)
        SELECT loc_id, 'Main Office Wi-Fi', '124.123.160.170', true
        WHERE NOT EXISTS (SELECT 1 FROM office_ips WHERE location_id = loc_id AND ip_address = '124.123.160.170');
    END IF;
END $$;
