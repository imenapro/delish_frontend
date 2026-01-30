-- Add audit and soft-delete columns to businesses table
ALTER TABLE public.businesses
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS deleted_status BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS created_date TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deleted_date TIMESTAMPTZ;

-- Function to handle business creation audit
CREATE OR REPLACE FUNCTION public.handle_business_audit_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- Set created_by to current user if not provided
  IF NEW.created_by IS NULL THEN
    NEW.created_by := auth.uid();
  END IF;
  
  -- Set created_date to now if not provided
  IF NEW.created_date IS NULL THEN
    NEW.created_date := NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle business update audit
CREATE OR REPLACE FUNCTION public.handle_business_audit_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Set updated_by to current user
  NEW.updated_by := auth.uid();
  -- Set updated_date to now
  NEW.updated_date := NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers
DROP TRIGGER IF EXISTS on_business_insert_audit ON public.businesses;
CREATE TRIGGER on_business_insert_audit
BEFORE INSERT ON public.businesses
FOR EACH ROW EXECUTE FUNCTION public.handle_business_audit_insert();

DROP TRIGGER IF EXISTS on_business_update_audit ON public.businesses;
CREATE TRIGGER on_business_update_audit
BEFORE UPDATE ON public.businesses
FOR EACH ROW EXECUTE FUNCTION public.handle_business_audit_update();

-- Cascading Soft Delete Function
CREATE OR REPLACE FUNCTION public.soft_delete_business(target_business_id UUID)
RETURNS VOID AS $$
DECLARE
  current_user_id UUID;
BEGIN
  current_user_id := auth.uid();

  -- 1. Soft delete the business
  UPDATE public.businesses
  SET 
    deleted_status = TRUE,
    deleted_by = current_user_id,
    deleted_date = NOW(),
    updated_by = current_user_id,
    updated_date = NOW()
  WHERE id = target_business_id;

  -- 2. Soft delete related shops (Cascade)
  -- We assume is_active is the flag for shops
  UPDATE public.shops
  SET is_active = FALSE,
      updated_at = NOW() -- Assuming updated_at exists
  WHERE business_id = target_business_id;

  -- 3. Soft delete related products (Cascade)
  -- We assume is_active is the flag for products
  UPDATE public.products
  SET is_active = FALSE,
      updated_at = NOW() -- Assuming updated_at exists
  WHERE business_id = target_business_id;

  -- Add other cascading logic here if necessary (e.g., cancelling subscriptions, etc.)
  -- For now, shops and products are the main content entities.
  
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.soft_delete_business(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.soft_delete_business(UUID) TO service_role;
