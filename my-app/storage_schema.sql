-- 1. Create the announcements_media bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('announcements_media', 'announcements_media', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Allow public access to view media
CREATE POLICY "Announcements Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'announcements_media');

-- 3. Allow authenticated users to upload media
CREATE POLICY "Announcements Auth Upload"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'announcements_media' 
  AND auth.role() = 'authenticated'
);
