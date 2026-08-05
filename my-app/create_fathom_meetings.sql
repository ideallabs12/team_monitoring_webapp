-- Create fathom_meetings table to store webhook data from Fathom Video

CREATE TABLE IF NOT EXISTS public.fathom_meetings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    fathom_id TEXT UNIQUE NOT NULL,
    speaker_name TEXT,
    email TEXT,
    meeting_date DATE NOT NULL,
    meeting_time TIME,
    transcript TEXT,
    summary TEXT,
    action_items JSONB,
    fathom_link TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.fathom_meetings ENABLE ROW LEVEL SECURITY;

-- Allow read access to authenticated users
CREATE POLICY "Allow read access to authenticated users on fathom_meetings" 
ON public.fathom_meetings
FOR SELECT 
TO authenticated 
USING (true);

-- We only insert into this table via the Supabase Edge Function (Service Role),
-- so we don't necessarily need an INSERT policy for authenticated users, 
-- but let's add one just in case the edge function acts as the user (unlikely, as webhooks are unauthenticated by users).
-- Usually, Edge Functions use the service_role key to bypass RLS.
