-- Function to sync product price to shop_inventory
CREATE OR REPLACE FUNCTION public.sync_product_price_to_inventory()
RETURNS TRIGGER AS $$
BEGIN
  -- Update shop_inventory price to match the new product price
  -- This ensures that when the master product price changes, all shop inventories reflect it.
  -- We only update if the price actually changed.
  IF OLD.price IS DISTINCT FROM NEW.price THEN
    UPDATE public.shop_inventory
    SET price = NEW.price
    WHERE product_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call the function
DROP TRIGGER IF EXISTS on_product_price_update ON public.products;
CREATE TRIGGER on_product_price_update
AFTER UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.sync_product_price_to_inventory();
