-- Add unit field to products table for unit-based pricing
-- Change order_items quantity to numeric for fractional quantities

-- Add unit column to products table
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS unit TEXT NOT NULL DEFAULT 'piece';

-- Update existing products to have appropriate units based on category
UPDATE public.products SET unit = 'kg' WHERE category ILIKE '%flour%' OR category ILIKE '%sugar%' OR category ILIKE '%ingredient%';
UPDATE public.products SET unit = 'piece' WHERE category ILIKE '%bread%' OR category ILIKE '%pastry%' OR category ILIKE '%cake%';
UPDATE public.products SET unit = 'box' WHERE category ILIKE '%egg%' OR category ILIKE '%packaging%';

-- Change order_items quantity from INTEGER to NUMERIC for fractional support
ALTER TABLE public.order_items ALTER COLUMN quantity TYPE NUMERIC USING quantity::NUMERIC;

-- Add constraint to ensure quantity is positive
ALTER TABLE public.order_items ADD CONSTRAINT order_items_quantity_positive CHECK (quantity > 0);

-- Update RLS policies if needed (products table already has policies)
-- The existing policies should work with the new unit field