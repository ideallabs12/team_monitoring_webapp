-- Add allow_review_paste field to system_settings table
ALTER TABLE public.system_settings ADD COLUMN allow_review_paste boolean DEFAULT false;
