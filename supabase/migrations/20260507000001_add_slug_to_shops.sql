-- Add missing columns to shops table
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id);
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS primary_color TEXT DEFAULT '#3B82F6';
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS secondary_color TEXT DEFAULT '#10B981';

-- Update existing shops to have a slug if they don't
UPDATE public.shops SET slug = LOWER(REPLACE(name, ' ', '-')) WHERE slug IS NULL;
