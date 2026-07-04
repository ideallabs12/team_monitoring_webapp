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
