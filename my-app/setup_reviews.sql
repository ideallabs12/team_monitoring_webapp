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
