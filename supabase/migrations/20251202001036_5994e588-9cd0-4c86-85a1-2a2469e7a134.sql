-- Migration: Add price to shop_inventory for per-shop pricing
-- This allows each shop to have different prices for the same product

-- 1. Add price column to shop_inventory
ALTER TABLE public.shop_inventory 
ADD COLUMN IF NOT EXISTS price NUMERIC DEFAULT 0 NOT NULL;

-- 2. Add comment explaining the structure
COMMENT ON COLUMN public.shop_inventory.price IS 'Price for this product in this specific shop. Each shop can have different prices for the same product.';

-- 3. Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_shop_inventory_shop_product 
ON public.shop_inventory(shop_id, product_id);

-- 4. Update products table comment - price is now per shop
COMMENT ON COLUMN public.products.price IS 'DEPRECATED: Price is now stored per shop in shop_inventory table for multi-shop support.';