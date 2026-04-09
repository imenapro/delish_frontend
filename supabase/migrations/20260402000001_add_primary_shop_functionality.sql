-- Add primary shop functionality
-- Add is_primary column to shops table
ALTER TABLE public.shops
ADD COLUMN IF NOT EXISTS is_primary BOOLEAN DEFAULT FALSE;

-- Ensure only one primary shop per business
CREATE OR REPLACE FUNCTION public.ensure_single_primary_shop()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- If setting a shop as primary, unset all other shops for this business
  IF NEW.is_primary = TRUE THEN
    UPDATE public.shops
    SET is_primary = FALSE
    WHERE business_id = NEW.business_id
      AND id != NEW.id
      AND is_primary = TRUE;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger to enforce single primary shop per business
DROP TRIGGER IF EXISTS ensure_single_primary_shop_trigger ON public.shops;
CREATE TRIGGER ensure_single_primary_shop_trigger
  BEFORE INSERT OR UPDATE ON public.shops
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_single_primary_shop();

-- Update RLS policies to include primary shop access
-- (This will be handled by existing policies since is_primary doesn't affect access control)

-- Make RUBIRIZI SHOP the primary shop (if it exists)
UPDATE public.shops
SET is_primary = TRUE
WHERE name = 'RUBIRIZI SHOP'
  AND is_active = TRUE;