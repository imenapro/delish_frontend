-- Create business_types table
CREATE TABLE IF NOT EXISTS public.business_types (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.business_types ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Everyone can view active business types" ON public.business_types;
CREATE POLICY "Everyone can view active business types" ON public.business_types FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Super Admins can manage business types" ON public.business_types;
CREATE POLICY "Super Admins can manage business types" ON public.business_types FOR ALL USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Seed data
INSERT INTO public.business_types (name, slug) VALUES
  ('Grocery Store', 'grocery-store'),
  ('Restaurant', 'restaurant'),
  ('Smoke Shop', 'smoke-shop'),
  ('Butcher Shop', 'butcher-shop'),
  ('Printing House', 'printing-house'),
  ('Electronics Store', 'electronics-store'),
  ('Home Décor', 'home-decor'),
  ('Liquor Store', 'liquor-store'),
  ('Pharmacy', 'pharmacy'),
  ('Other', 'other')
ON CONFLICT (name) DO NOTHING;
