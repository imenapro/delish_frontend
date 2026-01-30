-- Fix handle_inventory_transaction to UPSERT shop_inventory
-- This ensures that if a product is sold or stock is added but no inventory record exists, it is created.

CREATE OR REPLACE FUNCTION public.handle_inventory_transaction()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if inventory record exists
  IF EXISTS (SELECT 1 FROM public.shop_inventory WHERE shop_id = NEW.shop_id AND product_id = NEW.product_id) THEN
      -- Update existing
      UPDATE public.shop_inventory
      SET stock = GREATEST(0, stock + NEW.quantity),
          updated_at = NOW()
      WHERE shop_id = NEW.shop_id 
        AND product_id = NEW.product_id;
  ELSE
      -- Insert new record
      -- We need to fetch the master price from products table to initialize price
      INSERT INTO public.shop_inventory (shop_id, product_id, stock, price)
      SELECT 
          NEW.shop_id, 
          NEW.product_id, 
          GREATEST(0, NEW.quantity), -- Initial stock
          p.price -- Master price
      FROM public.products p
      WHERE p.id = NEW.product_id;
  END IF;
    
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
