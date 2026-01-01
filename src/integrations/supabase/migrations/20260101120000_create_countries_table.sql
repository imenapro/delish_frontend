-- Create countries table
CREATE TABLE IF NOT EXISTS public.countries (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL UNIQUE,
  code text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Everyone can view active countries" ON public.countries;
CREATE POLICY "Everyone can view active countries" ON public.countries FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Super Admins can manage countries" ON public.countries;
CREATE POLICY "Super Admins can manage countries" ON public.countries FOR ALL USING (has_role(auth.uid(), 'super_admin'::app_role));
