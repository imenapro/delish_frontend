-- Fix can_access_shop to support business-level access
CREATE OR REPLACE FUNCTION public.can_access_shop(_user_id uuid, _shop_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_business_id uuid;
BEGIN
  -- Get business_id of the shop
  SELECT business_id INTO v_business_id FROM public.shops WHERE id = _shop_id;
  
  -- If shop doesn't exist, return false (unless super_admin)
  IF v_business_id IS NULL THEN
    RETURN has_role(_user_id, 'super_admin'::app_role);
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = _user_id
      AND (
        -- Direct shop access
        ur.shop_id = _shop_id
        OR 
        -- Business-wide access (shop_id is null) for the SAME business
        (ur.shop_id IS NULL AND ur.business_id = v_business_id)
      )
  ) OR has_role(_user_id, 'super_admin'::app_role);
END;
$$;

-- Fix get_user_shops to include all shops if user has business-level access
CREATE OR REPLACE FUNCTION public.get_user_shops(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT s.id
  FROM public.shops s
  JOIN public.user_roles ur ON (
    -- Direct match
    (ur.shop_id = s.id AND ur.user_id = _user_id)
    OR
    -- Business-wide match
    (ur.shop_id IS NULL AND ur.business_id = s.business_id AND ur.user_id = _user_id)
  )
  WHERE s.is_active = true;
END;
$$;

-- Re-apply invoices RLS to ensure it uses the updated function
DROP POLICY IF EXISTS "Users can view invoices for their shops" ON public.invoices;

CREATE POLICY "Users can view invoices for their shops" ON public.invoices
  FOR SELECT
  USING (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
    OR can_access_shop(auth.uid(), shop_id)
  );
