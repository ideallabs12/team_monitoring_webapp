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
