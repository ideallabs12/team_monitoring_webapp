-- 1. Add target_team_id to events
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS target_team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL;

-- 2. Add photo_url to reviews
ALTER TABLE public.reviews 
ADD COLUMN IF NOT EXISTS photo_url text NULL;

-- 3. Create Storage Bucket for Review Photos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('review_photos', 'review_photos', true)
ON CONFLICT (id) DO NOTHING;

-- 4. Set up Storage RLS Policies
-- Allow public access to view images
CREATE POLICY "Public Access" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'review_photos');

-- Allow authenticated users to upload images
CREATE POLICY "Authenticated users can upload" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'review_photos' AND auth.role() = 'authenticated');

-- Allow users to update their own images (optional, based on owner)
CREATE POLICY "Users can update own photos" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'review_photos' AND auth.uid() = owner);

-- Allow users to delete their own images (optional, based on owner)
CREATE POLICY "Users can delete own photos" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'review_photos' AND auth.uid() = owner);
