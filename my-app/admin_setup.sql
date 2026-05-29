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
