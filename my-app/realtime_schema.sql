-- Enable real-time updates for announcements, notifications, and views tables
BEGIN;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.announcement_views;
COMMIT;
