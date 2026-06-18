-- 1. Add is_sales_executive to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_sales_executive BOOLEAN DEFAULT false;

-- 2. Create sales_analytics table
CREATE TABLE IF NOT EXISTS public.sales_analytics (
  id uuid default gen_random_uuid() primary key,
  team_id uuid references public.teams(id) on delete cascade not null,
  member_id uuid references public.profiles(id) on delete cascade not null,
  speaker_name text not null,
  notes text,
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

-- 5. Add notes column if table already existed without it (for safe migrations)
ALTER TABLE public.sales_analytics ADD COLUMN IF NOT EXISTS notes text;
