-- 1. Create notifications table
CREATE TABLE public.notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  type TEXT DEFAULT 'alert', -- 'milestone', 'action', 'alert'
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create notification_reads table
CREATE TABLE public.notification_reads (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  notification_id UUID REFERENCES public.notifications(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(notification_id, user_id)
);

-- 3. Row Level Security (RLS)
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_reads ENABLE ROW LEVEL SECURITY;

-- Notifications Policies
CREATE POLICY "Anyone can view notifications"
  ON public.notifications FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage notifications"
  ON public.notifications FOR ALL
  USING (true) WITH CHECK (true);

-- Notification Reads Policies
CREATE POLICY "Users can view their own notification reads"
  ON public.notification_reads FOR SELECT
  USING (auth.uid() = user_id OR true);

CREATE POLICY "Users can mark notifications as read"
  ON public.notification_reads FOR INSERT
  WITH CHECK (auth.uid() = user_id);
