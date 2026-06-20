-- 1. Allow submitting without selecting an event
ALTER TABLE public.reviews ALTER COLUMN event_id DROP NOT NULL;

-- 2. Allow media-only submissions (title can be empty)
ALTER TABLE public.reviews ALTER COLUMN title DROP NOT NULL;

-- 3. Allow media-only submissions (context can be empty)
ALTER TABLE public.reviews ALTER COLUMN context DROP NOT NULL;
