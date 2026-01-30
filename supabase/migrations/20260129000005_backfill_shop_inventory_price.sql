-- Backfill shop_inventory prices from products table
-- This fixes existing discrepancies
UPDATE public.shop_inventory si
SET price = p.price
FROM public.products p
WHERE si.product_id = p.id
AND (si.price IS NULL OR si.price IS DISTINCT FROM p.price);
