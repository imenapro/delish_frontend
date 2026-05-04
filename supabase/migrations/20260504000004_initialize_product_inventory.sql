
-- Trigger to automatically initialize shop_inventory with 0 stock for all shops 
-- when a new product is added to a business.

CREATE OR REPLACE FUNCTION public.initialize_product_inventory()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert a record for each active shop belonging to the same business
    INSERT INTO public.shop_inventory (shop_id, product_id, stock, price)
    SELECT 
        s.id, 
        NEW.id, 
        0, -- Default stock is 0
        NEW.price -- Use the product's base price
    FROM public.shops s
    WHERE s.business_id = NEW.business_id
      AND s.is_active = true;
      
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trigger_initialize_product_inventory ON public.products;
CREATE TRIGGER trigger_initialize_product_inventory
AFTER INSERT ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.initialize_product_inventory();
