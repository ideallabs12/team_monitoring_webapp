-- ==============================================================================
-- PWA PUSH NOTIFICATIONS SCHEMA
-- ==============================================================================

-- 1. Create table for storing Web Push subscriptions
CREATE TABLE IF NOT EXISTS public.user_push_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  device_type TEXT DEFAULT 'desktop', -- 'ios', 'android', 'desktop'
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_push_sub_user_id ON public.user_push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_sub_device_type ON public.user_push_subscriptions(device_type);

-- Enable RLS
ALTER TABLE public.user_push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Drop any prior policies
DROP POLICY IF EXISTS "Users can manage own subscriptions" ON public.user_push_subscriptions;
DROP POLICY IF EXISTS "Admins can view all subscriptions" ON public.user_push_subscriptions;
DROP POLICY IF EXISTS "Admins can delete any subscriptions" ON public.user_push_subscriptions;

-- Policy: Users can select, insert, update and delete their own subscriptions
CREATE POLICY "Users can manage own subscriptions" 
ON public.user_push_subscriptions 
FOR ALL 
TO authenticated 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

-- Policy: Admins can view all subscriptions to select targets
CREATE POLICY "Admins can view all subscriptions" 
ON public.user_push_subscriptions 
FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND platform_role = 'admin'
  )
);

-- Policy: Admins can clean up stale subscriptions
CREATE POLICY "Admins can delete any subscriptions" 
ON public.user_push_subscriptions 
FOR DELETE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND platform_role = 'admin'
  )
);

-- 2. Create table for logging dispatched push notifications
CREATE TABLE IF NOT EXISTS public.push_notifications_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  url TEXT DEFAULT '/home',
  target_type TEXT NOT NULL, -- 'user' or 'all'
  target_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  sent_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  devices_targeted INT DEFAULT 0,
  success_count INT DEFAULT 0,
  failure_count INT DEFAULT 0,
  status TEXT DEFAULT 'sent', -- 'pending', 'sent', 'failed'
  error_details TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on log
ALTER TABLE public.push_notifications_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage push logs" ON public.push_notifications_log;
CREATE POLICY "Admins can manage push logs" 
ON public.push_notifications_log 
FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND platform_role = 'admin'
  )
);

-- Enable Supabase Realtime for instant UI updates on subscriptions and logs
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_push_subscriptions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.push_notifications_log;

