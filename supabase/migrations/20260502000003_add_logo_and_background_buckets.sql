-- Create storage buckets for logos and background images
INSERT INTO storage.buckets (id, name, public) VALUES 
  ('logos', 'logos', true),
  ('backgrounds', 'backgrounds', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for logos (public)
DROP POLICY IF EXISTS "Anyone can view logos" ON storage.objects;
CREATE POLICY "Anyone can view logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'logos');

DROP POLICY IF EXISTS "Authenticated users can upload logos" ON storage.objects;
CREATE POLICY "Authenticated users can upload logos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'logos' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can update logos" ON storage.objects;
CREATE POLICY "Authenticated users can update logos"
ON storage.objects FOR UPDATE
WITH CHECK (bucket_id = 'logos' AND auth.role() = 'authenticated');

-- Storage policies for background images (public)
DROP POLICY IF EXISTS "Anyone can view background images" ON storage.objects;
CREATE POLICY "Anyone can view background images"
ON storage.objects FOR SELECT
USING (bucket_id = 'backgrounds');

DROP POLICY IF EXISTS "Authenticated users can upload background images" ON storage.objects;
CREATE POLICY "Authenticated users can upload background images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'backgrounds' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can update background images" ON storage.objects;
CREATE POLICY "Authenticated users can update background images"
ON storage.objects FOR UPDATE
WITH CHECK (bucket_id = 'backgrounds' AND auth.role() = 'authenticated');
