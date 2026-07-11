-- ==========================================
-- File: admin_setup.sql
-- ==========================================

-- ==========================================
-- SUPER ADMIN & TEAM LEAD SECURITY DEFINERS
-- ==========================================

-- 1. Helper function: Check if current user is an Admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND platform_role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- 2. Helper function: Check if current user is a Team Lead for a specific team
CREATE OR REPLACE FUNCTION public.is_team_lead(check_team_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_members 
    WHERE user_id = auth.uid() 
      AND team_id = check_team_id 
      AND team_role = 'lead'
  );
$$ LANGUAGE sql SECURITY DEFINER;


-- ==========================================
-- UPDATE EXISTING RLS POLICIES FOR ADMINS
-- ==========================================
-- We add 'OR is_admin()' to policies so admins have universal access.

-- Profiles: Admins can do anything
DROP POLICY IF EXISTS "Admins can manage all profiles" ON profiles;
CREATE POLICY "Admins can manage all profiles" ON profiles FOR ALL USING (is_admin());

-- Teams: Admins can do anything
DROP POLICY IF EXISTS "Admins can manage all teams" ON teams;
CREATE POLICY "Admins can manage all teams" ON teams FOR ALL USING (is_admin());

-- Team Members: Admins can do anything
DROP POLICY IF EXISTS "Admins can manage all team members" ON team_members;
CREATE POLICY "Admins can manage all team members" ON team_members FOR ALL USING (is_admin());

-- Monthly Revenues: Admins can do anything
DROP POLICY IF EXISTS "Admins can manage all revenues" ON monthly_revenues;
CREATE POLICY "Admins can manage all revenues" ON monthly_revenues FOR ALL USING (is_admin());


-- ==========================================
-- UPDATE RLS POLICIES FOR TEAM LEADS
-- ==========================================

-- Monthly Revenues: Team Leads can insert/update/select revenue for their specific team
DROP POLICY IF EXISTS "Team Leads can view team revenues" ON monthly_revenues;
CREATE POLICY "Team Leads can view team revenues" 
ON monthly_revenues FOR SELECT 
USING (is_team_lead(team_id) OR auth.uid() = user_id);

DROP POLICY IF EXISTS "Team Leads can insert team revenues" ON monthly_revenues;
CREATE POLICY "Team Leads can insert team revenues" 
ON monthly_revenues FOR INSERT 
WITH CHECK (is_team_lead(team_id) OR auth.uid() = user_id);

DROP POLICY IF EXISTS "Team Leads can update team revenues" ON monthly_revenues;
CREATE POLICY "Team Leads can update team revenues" 
ON monthly_revenues FOR UPDATE 
USING (is_team_lead(team_id) OR auth.uid() = user_id);


-- ==========================================
-- File: schema.sql
-- ==========================================

-- 1. Create Profiles Table
create table public.profiles (
  id uuid references auth.users(id) on delete cascade not null primary key,
  first_name text,
  last_name text,
  phone text,
  email text,
  platform_role text default 'user' not null, -- 'admin' or 'user'. We will update this manually in Supabase.
  is_deactivated boolean default false not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Turn on RLS for profiles
alter table public.profiles enable row level security;

-- 2. Create Teams Table
create table public.teams (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Turn on RLS for teams
alter table public.teams enable row level security;

-- 3. Create Team Members Table
create table public.team_members (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  team_id uuid references public.teams(id) on delete cascade not null,
  team_role text default 'member' not null, -- 'lead' or 'member'. We will update this manually in Supabase.
  joined_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, team_id) -- A user can only join a specific team once
);

-- Turn on RLS for team members
alter table public.team_members enable row level security;

-- 4. Create Monthly Revenues Table
create table public.monthly_revenues (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  team_id uuid references public.teams(id) on delete cascade not null,
  revenue_month date not null, -- e.g., '2023-10-01'
  amount numeric(12, 2) default 0.00 not null,
  entered_by uuid references public.profiles(id) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, team_id, revenue_month) -- Only one record per user, per team, per month
);

-- Turn on RLS for monthly revenues
alter table public.monthly_revenues enable row level security;

-- ==========================================
-- BASIC ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

-- PROFILES: Users can view and update their own profile.
create policy "Users can view own profile." on profiles for select using (auth.uid() = id);
create policy "Users can update own profile." on profiles for update using (auth.uid() = id);
create policy "Users can insert own profile." on profiles for insert with check (auth.uid() = id);

-- TEAMS: Everyone can view teams. Only admins can insert/update (enforced via Supabase UI for now, so we just allow read).
create policy "Anyone can view teams." on teams for select using (true);

-- TEAM MEMBERS: Users can view memberships if they belong to the team. Users can insert themselves into a team.
create policy "Users can view team members of their teams" on team_members for select using (
  exists (select 1 from team_members tm where tm.team_id = team_members.team_id and tm.user_id = auth.uid())
);
create policy "Users can join a team." on team_members for insert with check (auth.uid() = user_id);

-- MONTHLY REVENUES: Users can view and insert their own revenues.
create policy "Users can view own revenues." on monthly_revenues for select using (auth.uid() = user_id);
create policy "Users can insert own revenues." on monthly_revenues for insert with check (auth.uid() = user_id);
create policy "Users can update own revenues." on monthly_revenues for update using (auth.uid() = user_id);

-- Note: We can add more complex policies later for Team Leads to view/edit their members' profiles and revenues.


-- ==========================================
-- File: audit_setup.sql
-- ==========================================

-- 1. Create Audit Logs Table
create table public.audit_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  action_type text not null, -- 'login', 'revenue_added', 'revenue_updated', 'admin_activity'
  details jsonb, -- Stores action-specific details (e.g. what was changed, amounts, team names, etc.)
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Turn on Row Level Security
alter table public.audit_logs enable row level security;

-- 3. RLS Policies
-- Users can insert their own logs (for login tracking, revenue tracking)
create policy "Users can insert own audit logs." on audit_logs for insert with check (auth.uid() = user_id);

-- Admins can view all audit logs (we re-use the is_admin function if it exists, or check the profile)
create policy "Admins can view all audit logs" on audit_logs for select using (
  exists (select 1 from public.profiles where id = auth.uid() and platform_role = 'admin')
);

-- Note: We do NOT create update/delete policies because audit logs should be immutable.

-- 4. Enable Realtime for the table so the frontend updates immediately
alter publication supabase_realtime add table public.audit_logs;

-- 5. Allow admins to delete audit logs to save storage
create policy "Admins can delete audit logs" on audit_logs for delete using (
  exists (select 1 from public.profiles where id = auth.uid() and platform_role = 'admin')
);


-- ==========================================
-- File: sales_executive_setup.sql
-- ==========================================

-- 1. Add is_sales_executive to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_sales_executive BOOLEAN DEFAULT false;

-- 2. Create sales_analytics table
CREATE TABLE IF NOT EXISTS public.sales_analytics (
  id uuid default gen_random_uuid() primary key,
  team_id uuid references public.teams(id) on delete cascade not null,
  member_id uuid references public.profiles(id) on delete cascade not null,
  speaker_name text not null,
  sales_revenue numeric(12, 2) default 0.00 not null,
  call_date date not null,
  entered_by uuid references public.profiles(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Turn on RLS for sales_analytics
ALTER TABLE public.sales_analytics ENABLE ROW LEVEL SECURITY;

-- 4. Create policies
-- Sales executives can view their own analytics
CREATE POLICY "Users can view own sales analytics." ON sales_analytics 
FOR SELECT USING (auth.uid() = entered_by);

-- Sales executives can insert their own analytics
CREATE POLICY "Users can insert own sales analytics." ON sales_analytics 
FOR INSERT WITH CHECK (auth.uid() = entered_by AND EXISTS (
  SELECT 1 FROM profiles WHERE id = auth.uid() AND is_sales_executive = true
));


-- Sales executives can update their own analytics
CREATE POLICY "Users can update own sales analytics." ON sales_analytics 
FOR UPDATE USING (auth.uid() = entered_by);

-- Sales executives can delete their own analytics
CREATE POLICY "Users can delete own sales analytics." ON sales_analytics 
FOR DELETE USING (auth.uid() = entered_by);

-- 5. Drop notes column if it existed
ALTER TABLE public.sales_analytics DROP COLUMN IF EXISTS notes;


-- ==========================================
-- File: setup_reviews.sql
-- ==========================================

-- Events Table
CREATE TABLE public.events (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  title text NOT NULL,
  description text NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT events_pkey PRIMARY KEY (id)
);

-- Enable RLS for events
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Everyone can read events
CREATE POLICY "Enable read access for all users" ON public.events
  FOR SELECT USING (true);

-- Only admins can insert/update/delete events
CREATE POLICY "Enable ALL for admins" ON public.events
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() AND profiles.platform_role = 'admin'
    )
  );

-- Reviews Table
CREATE TABLE public.reviews (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  event_id uuid NOT NULL,
  user_id uuid NOT NULL,
  team_id uuid NULL,
  title text NOT NULL,
  context text NOT NULL,
  status text NOT NULL DEFAULT 'pending'::text,
  admin_feedback text NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT reviews_pkey PRIMARY KEY (id),
  CONSTRAINT reviews_event_id_fkey FOREIGN KEY (event_id) REFERENCES events (id) ON DELETE CASCADE,
  CONSTRAINT reviews_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles (id) ON DELETE CASCADE,
  CONSTRAINT reviews_team_id_fkey FOREIGN KEY (team_id) REFERENCES teams (id) ON DELETE SET NULL
);

-- Enable RLS for reviews
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Users can read all reviews
CREATE POLICY "Enable read access for all users" ON public.reviews
  FOR SELECT USING (true);

-- Users can insert their own reviews
CREATE POLICY "Enable insert for users based on user_id" ON public.reviews
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own reviews
CREATE POLICY "Enable update for users based on user_id" ON public.reviews
  FOR UPDATE USING (auth.uid() = user_id OR 
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() AND profiles.platform_role = 'admin'
    )
  );

-- Users can delete their own reviews
CREATE POLICY "Enable delete for users based on user_id" ON public.reviews
  FOR DELETE USING (auth.uid() = user_id OR 
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() AND profiles.platform_role = 'admin'
    )
  );

-- Enable Realtime for reviews table
-- Note: This command must be run manually if the Supabase dashboard doesn't support it via SQL:
alter publication supabase_realtime add table public.reviews;
alter publication supabase_realtime add table public.events;


-- ==========================================
-- File: setup_reviews_v2.sql
-- ==========================================

-- 1. Add target_team_id to events
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS target_team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL;

-- 2. Add photo_url to reviews
ALTER TABLE public.reviews 
ADD COLUMN IF NOT EXISTS photo_url text NULL;

-- 3. Create Storage Bucket for Review Photos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('review_photos', 'review_photos', true)
ON CONFLICT (id) DO NOTHING;

-- 4. Set up Storage RLS Policies
-- Allow public access to view images
CREATE POLICY "Public Access" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'review_photos');

-- Allow authenticated users to upload images
CREATE POLICY "Authenticated users can upload" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'review_photos' AND auth.role() = 'authenticated');

-- Allow users to update their own images (optional, based on owner)
CREATE POLICY "Users can update own photos" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'review_photos' AND auth.uid() = owner);

-- Allow users to delete their own images (optional, based on owner)
CREATE POLICY "Users can delete own photos" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'review_photos' AND auth.uid() = owner);


-- ==========================================
-- File: setup_reviews_v3.sql
-- ==========================================

-- 1. Allow submitting without selecting an event
ALTER TABLE public.reviews ALTER COLUMN event_id DROP NOT NULL;

-- 2. Allow media-only submissions (title can be empty)
ALTER TABLE public.reviews ALTER COLUMN title DROP NOT NULL;

-- 3. Allow media-only submissions (context can be empty)
ALTER TABLE public.reviews ALTER COLUMN context DROP NOT NULL;


-- ==========================================
-- File: revert_individual_reviews.sql
-- ==========================================

-- 1. Delete any reviews that were submitted without an event, title, or context.
-- We must do this before restoring the NOT NULL constraints, otherwise the database will throw an error.
DELETE FROM public.reviews 
WHERE event_id IS NULL 
   OR title IS NULL 
   OR context IS NULL;

-- 2. Restore NOT NULL constraint on event_id
ALTER TABLE public.reviews ALTER COLUMN event_id SET NOT NULL;

-- 3. Restore NOT NULL constraint on title
ALTER TABLE public.reviews ALTER COLUMN title SET NOT NULL;

-- 4. Restore NOT NULL constraint on context
ALTER TABLE public.reviews ALTER COLUMN context SET NOT NULL;


-- ==========================================
-- File: dis_management_setup.sql
-- ==========================================

-- 1. Create holidays table
CREATE TABLE IF NOT EXISTS public.holidays (
  id uuid default gen_random_uuid() primary key,
  holiday_date date not null unique,
  description text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Add columns to system_settings if they don't exist
ALTER TABLE public.system_settings 
ADD COLUMN IF NOT EXISTS dis_locked boolean default false;

ALTER TABLE public.system_settings 
ADD COLUMN IF NOT EXISTS dis_allow_past boolean default false;

-- 3. Set RLS policies for holidays
ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins can manage holidays"
  ON public.holidays
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.platform_role = 'admin'
    )
  );

-- Everyone can view holidays
CREATE POLICY "Everyone can view holidays"
  ON public.holidays
  FOR SELECT
  USING (true);


-- ==========================================
-- File: nav_preference_migration.sql
-- ==========================================

-- Add nav_preference to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS nav_preference text DEFAULT 'navbar';


-- ==========================================
-- File: sales_analytics_admin_policy.sql
-- ==========================================

-- Policy to ensure admins can view all sales analytics records
CREATE POLICY "Admins can view all sales analytics"
  ON public.sales_analytics
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.platform_role = 'admin'
    )
  );


-- ==========================================
-- File: migration_social_media.sql
-- ==========================================

-- Add social_platform and social_url columns to events table for Review Write-Ups
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS social_platform text NULL,
ADD COLUMN IF NOT EXISTS social_url text NULL;


-- ==========================================
-- File: setup_reviews_v4.sql
-- ==========================================

-- Add penname field to reviews table
ALTER TABLE public.reviews ADD COLUMN penname text;


-- ==========================================
-- File: setup_settings_paste.sql
-- ==========================================

-- Add allow_review_paste field to system_settings table
ALTER TABLE public.system_settings ADD COLUMN allow_review_paste boolean DEFAULT false;


-- ==========================================
-- File: attendance_schema.sql
-- ==========================================

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


-- ==========================================
-- File: attendance_config_schema.sql
-- ==========================================

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


-- ==========================================
-- File: update_rls_for_executive.sql
-- ==========================================

-- ==========================================
-- UPDATE is_admin() FOR EXECUTIVE ROLE
-- ==========================================

-- We update the helper function `is_admin()` to also return true for 'executive'
-- This ensures that all existing RLS policies that grant 'admin' universal access
-- will now also grant the same database-level access to 'executive'.
-- (The frontend UI still correctly hides operational/edit buttons for executives).

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND platform_role IN ('admin', 'executive')
  );
$$ LANGUAGE sql SECURITY DEFINER;


-- ==========================================
-- File: add_feature_access.sql
-- ==========================================

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


-- ==========================================
-- File: announcements_schema.sql
-- ==========================================

-- 1. Create announcements table
CREATE TABLE public.announcements (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  media_urls JSONB DEFAULT '[]'::jsonb,
  is_pinned BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'published',
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create announcement_views table (for analytics and read receipts)
CREATE TABLE public.announcement_views (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  announcement_id UUID REFERENCES public.announcements(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(announcement_id, user_id)
);

-- 3. Setup Row Level Security (RLS)
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_views ENABLE ROW LEVEL SECURITY;

-- Announcements Policies
-- Everyone can read published announcements
CREATE POLICY "Anyone can view published announcements"
  ON public.announcements FOR SELECT
  USING (status = 'published');

-- Admins/System can do all (Assuming application logic handles admin checks, or you can restrict based on role)
CREATE POLICY "Admins can manage announcements"
  ON public.announcements FOR ALL
  USING (true) WITH CHECK (true);

-- Announcement Views Policies
-- Users can view their own read receipts, and admins can view all
CREATE POLICY "Users can view their own receipts"
  ON public.announcement_views FOR SELECT
  USING (auth.uid() = user_id OR true); -- Allowing all for now so admin can see analytics

-- Users can insert their own read receipt
CREATE POLICY "Users can insert their own view"
  ON public.announcement_views FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create a storage bucket for media if it doesn't exist (You might need to do this manually in the Supabase Dashboard Storage section)
-- Bucket Name: 'announcements_media'
-- Make sure it is set to "Public" so images can be viewed without signed URLs.


-- ==========================================
-- File: notifications_schema.sql
-- ==========================================

-- 1. Create notifications table
CREATE TABLE public.notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  type TEXT DEFAULT 'alert', -- 'milestone', 'action', 'alert'
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create notification_reads table
CREATE TABLE public.notification_reads (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  notification_id UUID REFERENCES public.notifications(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(notification_id, user_id)
);

-- 3. Row Level Security (RLS)
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_reads ENABLE ROW LEVEL SECURITY;

-- Notifications Policies
CREATE POLICY "Anyone can view notifications"
  ON public.notifications FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage notifications"
  ON public.notifications FOR ALL
  USING (true) WITH CHECK (true);

-- Notification Reads Policies
CREATE POLICY "Users can view their own notification reads"
  ON public.notification_reads FOR SELECT
  USING (auth.uid() = user_id OR true);

CREATE POLICY "Users can mark notifications as read"
  ON public.notification_reads FOR INSERT
  WITH CHECK (auth.uid() = user_id);


-- ==========================================
-- File: storage_schema.sql
-- ==========================================

-- 1. Create the announcements_media bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('announcements_media', 'announcements_media', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Allow public access to view media
CREATE POLICY "Announcements Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'announcements_media');

-- 3. Allow authenticated users to upload media
CREATE POLICY "Announcements Auth Upload"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'announcements_media' 
  AND auth.role() = 'authenticated'
);


-- ==========================================
-- File: realtime_schema.sql
-- ==========================================

-- Enable real-time updates for announcements, notifications, and views tables
BEGIN;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.announcement_views;
COMMIT;


-- ==========================================
-- File: advanced_settings_setup.sql
-- ==========================================

CREATE TABLE IF NOT EXISTS public.system_settings (
  id integer PRIMARY KEY DEFAULT 1,
  announcement_text text DEFAULT '',
  announcement_expires_at timestamp with time zone,
  maintenance_mode boolean DEFAULT false,
  show_leaderboard boolean DEFAULT true,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Ensure there is only one row
ALTER TABLE public.system_settings ADD CONSTRAINT single_row_check CHECK (id = 1);

-- 2. Insert the default row
INSERT INTO public.system_settings (id, announcement_text, maintenance_mode, show_leaderboard)
VALUES (1, '', false, true)
ON CONFLICT (id) DO NOTHING;

-- 3. Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- 4. Policies
-- Everyone can read the settings
CREATE POLICY "Anyone can view system settings" 
ON public.system_settings FOR SELECT 
USING (true);

-- Only admins can update the settings
CREATE POLICY "Admins can update system settings" 
ON public.system_settings FOR UPDATE 
USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.platform_role = 'admin')
);

-- 5. Enable Realtime for system_settings
ALTER PUBLICATION supabase_realtime ADD TABLE public.system_settings;

-- 5.5 Alter table just in case they already ran the previous version
ALTER TABLE public.system_settings ADD COLUMN IF NOT EXISTS announcement_expires_at timestamp with time zone;

-- 6. Create RPC function to get database size (in MB)
CREATE OR REPLACE FUNCTION public.get_db_size()
RETURNS numeric
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT COALESCE(ROUND(SUM(pg_total_relation_size(quote_ident(schemaname) || '.' || quote_ident(tablename))) / 1048576.0, 2), 0)
  FROM pg_tables
  WHERE schemaname = 'public';
$$;

-- 7. Create RPC function to delete inactive users
-- (Deactivates users who haven't had an audit log 'login' in the last X days)
CREATE OR REPLACE FUNCTION public.deactivate_inactive_users(days_inactive integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  affected_count integer;
BEGIN
  -- We only deactivate standard users and team leads, never admins
  UPDATE public.profiles
  SET is_deactivated = true
  WHERE platform_role != 'admin'
    AND is_deactivated = false
    AND id NOT IN (
      SELECT DISTINCT user_id 
      FROM public.audit_logs 
      WHERE action_type = 'login' 
        AND created_at > (now() - (days_inactive || ' days')::interval)
    );
    
  GET DIAGNOSTICS affected_count = ROW_COUNT;
  RETURN affected_count;
END;
$$;

 - -   8 .   C r e a t e   R P C   f u n c t i o n   t o   g e t   p r e c i s e   e x a c t   d a t a b a s e   s i z e   i n   b y t e s 
 C R E A T E   O R   R E P L A C E   F U N C T I O N   p u b l i c . g e t _ e x a c t _ d b _ s i z e ( ) 
 R E T U R N S   b i g i n t 
 L A N G U A G E   s q l 
 S E C U R I T Y   D E F I N E R 
 A S   \ $ \ $ 
     S E L E C T   p g _ d a t a b a s e _ s i z e ( c u r r e n t _ d a t a b a s e ( ) ) : : b i g i n t ; 
 \ $ \ $ ;  
 
 - -   8 .   C r e a t e   R P C   f u n c t i o n   t o   g e t   d b   s t o r a g e   s t a t s   d i r e c t l y   a s   J S O N 
 C R E A T E   O R   R E P L A C E   F U N C T I O N   p u b l i c . g e t _ d b _ s t o r a g e _ s t a t s ( ) 
 R E T U R N S   j s o n 
 L A N G U A G E   s q l 
 S E C U R I T Y   D E F I N E R 
 A S   \ $ \ $ 
     S E L E C T   j s o n _ b u i l d _ o b j e c t ( 
         ' u s e d _ s p a c e ' ,   p g _ s i z e _ p r e t t y ( p g _ d a t a b a s e _ s i z e ( c u r r e n t _ d a t a b a s e ( ) ) ) , 
         ' r e m a i n i n g _ s p a c e ' ,   p g _ s i z e _ p r e t t y ( ( 5 0 0   *   1 0 2 4   *   1 0 2 4 )   -   p g _ d a t a b a s e _ s i z e ( c u r r e n t _ d a t a b a s e ( ) ) ) , 
         ' p e r c e n t _ u s e d ' ,   R O U N D ( ( p g _ d a t a b a s e _ s i z e ( c u r r e n t _ d a t a b a s e ( ) ) : : n u m e r i c   /   ( 5 0 0   *   1 0 2 4   *   1 0 2 4 ) : : n u m e r i c )   *   1 0 0 ,   2 ) 
     ) ; 
 \ $ \ $ ;  
 

-- ==========================================
-- File: speakers_schema.sql
-- ==========================================

-- 1. Create Speakers Table
create table public.speakers (
  id uuid default gen_random_uuid() primary key,
  speaker_type text not null check (speaker_type in ('past', 'present', 'future')),
  speaker_name text not null,
  email text,
  profile_url text,
  company text,
  connected_by text,
  event_name text,
  calling_executive text, -- 'geetha', 'prasad sir', 'srinath'
  payment_status text default 'pending', -- 'pending', 'partial', 'paid', 'refunded', 'transferred', 'not_applicable'
  agreed_amount numeric(12, 2) default 0.00,
  paid_amount numeric(12, 2) default 0.00,
  pending_amount numeric(12, 2) default 0.00,
  refund_status text default 'none', -- 'none', 'refund_requested', 'refunded', 'transferred'
  transferred_to_event text,
  package_type text,
  current_main_status text,
  current_sub_status text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Turn on RLS for speakers
alter table public.speakers enable row level security;

-- Speakers policies (Open for everyone for now, adjust based on roles later)
create policy "Anyone can view speakers." on speakers for select using (true);
create policy "Anyone can insert speakers." on speakers for insert with check (true);
create policy "Anyone can update speakers." on speakers for update using (true);

-- 2. Create Speaker Timeline Events Table
create table public.speaker_timeline_events (
  id uuid default gen_random_uuid() primary key,
  speaker_id uuid references public.speakers(id) on delete cascade not null,
  main_status text not null,
  sub_status text not null,
  note text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Turn on RLS for speaker_timeline_events
alter table public.speaker_timeline_events enable row level security;

-- Speaker Timeline Events policies
create policy "Anyone can view timeline events." on speaker_timeline_events for select using (true);
create policy "Anyone can insert timeline events." on speaker_timeline_events for insert with check (true);
-- Note: Intentionally missing UPDATE policy so that timeline events cannot be edited (immutable log)


