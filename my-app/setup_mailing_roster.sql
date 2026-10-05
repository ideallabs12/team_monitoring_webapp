-- Create the mass_mailing_roster table
CREATE TABLE IF NOT EXISTS public.mass_mailing_roster (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    week_number INTEGER NOT NULL,
    day_of_week TEXT NOT NULL,
    team_name TEXT NOT NULL,
    allocations JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(week_number, day_of_week)
);

-- Enable RLS
ALTER TABLE public.mass_mailing_roster ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read and write
CREATE POLICY "Enable read access for authenticated users" 
ON public.mass_mailing_roster FOR SELECT 
TO authenticated USING (true);

CREATE POLICY "Enable insert/update access for authenticated users" 
ON public.mass_mailing_roster FOR ALL
TO authenticated USING (true) WITH CHECK (true);
