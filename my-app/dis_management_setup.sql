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
