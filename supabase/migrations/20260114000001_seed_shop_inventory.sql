-- Migration: Auto-seed shop inventory
-- Description: Automatically adds all existing business products to a new shop's inventory with 0 stock.

-- Function to seed inventory for a new shop
CREATE OR REPLACE FUNCTION public.seed_shop_inventory_for_new_shop()
RETURNS TRIGGER AS $$
BEGIN
    -- Only proceed if business_id is present on the shop
    IF NEW.business_id IS NOT NULL THEN
        -- Insert all active products belonging to the same business into the new shop's inventory
        INSERT INTO public.shop_inventory (
            shop_id, 
            product_id, 
            stock, 
            price, 
            quota_per_day
        )
        SELECT 
            NEW.id,             -- The new shop's ID
            p.id,               -- The product ID
            0,                  -- Initial stock is 0 (Out of Stock)
            p.price,            -- Inherit the base price from the product
            NULL                -- Default quota (NULL usually implies no specific limit or default behavior)
        FROM public.products p
        WHERE p.business_id = NEW.business_id
        AND p.is_active = true  -- Only include active products
        ON CONFLICT (shop_id, product_id) DO NOTHING; -- Prevent errors if somehow already exists
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS on_shop_created_seed_inventory ON public.shops;

CREATE TRIGGER on_shop_created_seed_inventory
AFTER INSERT ON public.shops
FOR EACH ROW
EXECUTE FUNCTION public.seed_shop_inventory_for_new_shop();
