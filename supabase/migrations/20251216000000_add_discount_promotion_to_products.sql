-- Add discount and promotion fields to products table
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS discount_price NUMERIC,
ADD COLUMN IF NOT EXISTS promotion_description TEXT;
