-- Add social_platform and social_url columns to events table for Review Write-Ups
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS social_platform text NULL,
ADD COLUMN IF NOT EXISTS social_url text NULL;
