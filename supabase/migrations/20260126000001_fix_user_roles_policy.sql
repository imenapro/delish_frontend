-- Fix RLS policy for user_roles to explicitly allow store owners to manage roles
-- This ensures that store owners can add staff to their business
-- We use a SECURITY DEFINER function to avoid infinite recursion

-- Function to check role without triggering RLS recursion
CREATE OR REPLACE FUNCTION public.check_user_role_for_business(
  _user_id UUID,
  _role_name TEXT,
  _business_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- This function runs with the privileges of the creator (postgres/superuser)
  -- Bypassing RLS on user_roles to avoid recursion
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
    AND role::text = _role_name
    AND business_id = _business_id
  );
END;
$$;

DROP POLICY IF EXISTS "Store owners can manage roles for their business" ON public.user_roles;

CREATE POLICY "Store owners can manage roles for their business"
ON public.user_roles
FOR ALL
USING (
  business_id IS NOT NULL AND
  public.check_user_role_for_business(auth.uid(), 'store_owner', business_id)
);
