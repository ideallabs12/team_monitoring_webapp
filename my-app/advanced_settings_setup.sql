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
