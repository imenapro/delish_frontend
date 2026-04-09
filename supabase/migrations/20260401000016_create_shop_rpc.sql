CREATE OR REPLACE FUNCTION public.create_shop(
  p_business_id uuid,
  p_name text,
  p_address text,
  p_phone text DEFAULT NULL,
  p_open_hours text DEFAULT NULL,
  p_owner_id uuid DEFAULT NULL,
  p_is_active boolean DEFAULT true,
  p_status text DEFAULT 'active'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_allowed boolean;
BEGIN
  IF p_business_id IS NULL THEN
    RAISE EXCEPTION 'business_id is required';
  END IF;

  IF p_name IS NULL OR length(trim(p_name)) = 0 THEN
    RAISE EXCEPTION 'name is required';
  END IF;

  IF p_address IS NULL OR length(trim(p_address)) = 0 THEN
    RAISE EXCEPTION 'address is required';
  END IF;

  v_allowed :=
    has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'store_owner'::app_role)
    OR has_role(auth.uid(), 'Owner'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'manager'::app_role)
    OR has_role(auth.uid(), 'branch_manager'::app_role)
    OR has_business_access(auth.uid(), p_business_id);

  IF NOT v_allowed THEN
    RAISE EXCEPTION 'permission denied';
  END IF;

  INSERT INTO public.shops (
    business_id,
    name,
    address,
    phone,
    open_hours,
    owner_id,
    is_active,
    status
  )
  VALUES (
    p_business_id,
    trim(p_name),
    trim(p_address),
    NULLIF(trim(coalesce(p_phone, '')), ''),
    NULLIF(trim(coalesce(p_open_hours, '')), ''),
    p_owner_id,
    COALESCE(p_is_active, true),
    COALESCE(NULLIF(trim(p_status), ''), 'active')
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_shop(uuid, text, text, text, text, uuid, boolean, text) TO authenticated;

