-- Fix for double counting in inventory
-- This migration moves the stock update logic from frontend to a database trigger
-- ensuring consistency and atomic updates.

-- Function to handle inventory updates
CREATE OR REPLACE FUNCTION public.handle_inventory_transaction()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the stock in shop_inventory
  -- We simply add the quantity because 'out' transactions should have negative quantity
  -- or we handle based on type if quantity is absolute. 
  -- Based on frontend code: 
  -- const adjustedQuantity = type === 'out' ? -Math.abs(quantity) : Math.abs(quantity);
  -- So quantity is already signed.
  
  UPDATE public.shop_inventory
  SET stock = GREATEST(0, stock + NEW.quantity), -- Prevent negative stock
      updated_at = NOW()
  WHERE shop_id = NEW.shop_id 
    AND product_id = NEW.product_id;
    
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists (to prevent triple counting if we are fixing a double count)
DROP TRIGGER IF EXISTS on_inventory_transaction_created ON public.inventory_transactions;

-- Create the trigger
CREATE TRIGGER on_inventory_transaction_created
AFTER INSERT ON public.inventory_transactions
FOR EACH ROW
EXECUTE FUNCTION public.handle_inventory_transaction();
