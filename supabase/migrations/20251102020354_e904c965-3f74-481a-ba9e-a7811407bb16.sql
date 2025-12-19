-- Create storage buckets for images and documents
INSERT INTO storage.buckets (id, name, public) VALUES 
  ('product-images', 'product-images', true),
  ('shop-documents', 'shop-documents', false),
  ('time-tracking-images', 'time-tracking-images', false);

-- Storage policies for product images (public)
CREATE POLICY "Anyone can view product images"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-images');

CREATE POLICY "Authenticated users can upload product images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'product-images' AND auth.role() = 'authenticated');

-- Storage policies for shop documents (private, admin only)
CREATE POLICY "Admins can view shop documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'shop-documents' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can upload shop documents"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'shop-documents' AND public.has_role(auth.uid(), 'admin'));

-- Storage policies for time tracking images
CREATE POLICY "Users can view own time tracking images"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'time-tracking-images' AND (
    auth.uid()::text = (storage.foldername(name))[1] OR 
    public.has_role(auth.uid(), 'admin')
  )
);

CREATE POLICY "Users can upload own time tracking images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'time-tracking-images' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);