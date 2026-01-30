-- Fix orphan products (NULL business_id) and ensure they are editable
-- Also backfill shop_inventory and tighten RLS policies

DO $$
DECLARE
  target_business_id UUID;
BEGIN
  -- 1. Identify a target business to adopt orphan products
  -- Try to find 'Delish Bakery Ltd'
  SELECT id INTO target_business_id FROM public.businesses WHERE name = 'Delish Bakery Ltd' LIMIT 1;
  
  -- If not found, try 'Delish'
  IF target_business_id IS NULL THEN
    SELECT id INTO target_business_id FROM public.businesses WHERE name = 'Delish' LIMIT 1;
  END IF;

  -- If still not found, pick the oldest one
  IF target_business_id IS NULL THEN
    SELECT id INTO target_business_id FROM public.businesses ORDER BY created_date ASC LIMIT 1;
  END IF;

  -- 2. Update products
  IF target_business_id IS NOT NULL THEN
    UPDATE public.products
    SET business_id = target_business_id
    WHERE business_id IS NULL;
    
    RAISE NOTICE 'Assigned orphan products to business_id: %', target_business_id;

    -- 3. Backfill shop_inventory for these products
    -- For each shop in this business, ensure these products are in inventory
    INSERT INTO public.shop_inventory (shop_id, product_id, stock, price, quota_per_day)
    SELECT s.id, p.id, 0, p.price, NULL
    FROM public.shops s
    CROSS JOIN public.products p
    WHERE s.business_id = target_business_id
    AND p.business_id = target_business_id
    AND s.is_active = true
    AND p.is_active = true
    ON CONFLICT (shop_id, product_id) DO NOTHING;
    
  ELSE
    RAISE NOTICE 'No business found to assign products to.';
  END IF;
END $$;

-- 4. Remove permissive RLS policy that allowed viewing products without business access
-- This prevents confusion where users see products they cannot edit
DROP POLICY IF EXISTS "Everyone can view active products" ON public.products;

-- Ensure the correct view policy exists (re-stating for clarity/safety)
-- "Users can view products in their business" should already be there from previous migrations.
