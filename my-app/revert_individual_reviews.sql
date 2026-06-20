-- 1. Delete any reviews that were submitted without an event, title, or context.
-- We must do this before restoring the NOT NULL constraints, otherwise the database will throw an error.
DELETE FROM public.reviews 
WHERE event_id IS NULL 
   OR title IS NULL 
   OR context IS NULL;

-- 2. Restore NOT NULL constraint on event_id
ALTER TABLE public.reviews ALTER COLUMN event_id SET NOT NULL;

-- 3. Restore NOT NULL constraint on title
ALTER TABLE public.reviews ALTER COLUMN title SET NOT NULL;

-- 4. Restore NOT NULL constraint on context
ALTER TABLE public.reviews ALTER COLUMN context SET NOT NULL;
