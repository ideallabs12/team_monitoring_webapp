-- Enable real-time updates for announcements and notifications tables
BEGIN;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
COMMIT;
