-- Add show_login_background column to businesses table
ALTER TABLE public.businesses 
ADD COLUMN IF NOT EXISTS show_login_background BOOLEAN DEFAULT true;

-- Ensure bg_image_url exists (just in case)
ALTER TABLE public.businesses 
ADD COLUMN IF NOT EXISTS bg_image_url TEXT;

-- Create storage bucket for business assets if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('business_assets', 'business_assets', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for business_assets

-- Allow public read access
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'business_assets' );

-- Allow authenticated users to upload (we'll restrict via RLS on table usually, but here we trust auth users for now or refine)
-- Better: Allow users to upload if they belong to a business?
-- For now, allow authenticated users to upload/update/delete
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'business_assets' AND auth.role() = 'authenticated' );

CREATE POLICY "Authenticated users can update"
ON storage.objects FOR UPDATE
USING ( bucket_id = 'business_assets' AND auth.role() = 'authenticated' );

CREATE POLICY "Authenticated users can delete"
ON storage.objects FOR DELETE
USING ( bucket_id = 'business_assets' AND auth.role() = 'authenticated' );
