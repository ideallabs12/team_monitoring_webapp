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
