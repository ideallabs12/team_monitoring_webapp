-- Add nav_preference to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS nav_preference text DEFAULT 'navbar';
