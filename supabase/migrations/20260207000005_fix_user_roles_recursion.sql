-- Fix infinite recursion in user_roles policies
-- The previous policies were causing infinite recursion because they queried user_roles within the user_roles policy itself
-- without using the SECURITY DEFINER functions that bypass RLS.

-- 1. Ensure check_user_role_for_business is definitely available and correct
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
  -- Direct query bypassing RLS to avoid recursion
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
    AND role::text = _role_name
    AND business_id = _business_id
  );
END;
$$;

-- 2. Create a similar helper for super_admin check to avoid recursion
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
    AND role::text = 'super_admin'
  );
END;
$$;

-- 3. Create a helper for general role checking in business (admin/manager/owner)
CREATE OR REPLACE FUNCTION public.is_business_manager(_user_id UUID, _business_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
    AND business_id = _business_id
    AND role::text IN ('branch_manager', 'store_owner', 'admin')
  );
END;
$$;

-- 4. Fix policies on public.user_roles using the SECURITY DEFINER functions

DROP POLICY IF EXISTS "Business owners and super admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view roles in their business" ON public.user_roles;
DROP POLICY IF EXISTS "Store owners can manage roles for their business" ON public.user_roles;

-- Policy for managing roles (INSERT, UPDATE, DELETE)
CREATE POLICY "Business owners and super admins can manage roles"
ON public.user_roles
FOR ALL
USING (
  -- Super Admin check (using function)
  public.is_super_admin(auth.uid())
  OR 
  -- Business Owner / Manager check (using functions)
  (business_id IS NOT NULL AND (
    public.is_business_owner(auth.uid(), business_id)
    OR public.is_business_manager(auth.uid(), business_id)
  ))
);

-- Policy for viewing roles (SELECT)
CREATE POLICY "Users can view roles in their business"
ON public.user_roles
FOR SELECT
USING (
  -- User can see their own roles
  auth.uid() = user_id
  OR 
  -- Super Admin check (using function)
  public.is_super_admin(auth.uid())
  OR 
  -- Managers can see roles in their business (using functions)
  (business_id IS NOT NULL AND (
    public.is_business_owner(auth.uid(), business_id)
    OR public.is_business_manager(auth.uid(), business_id)
  ))
);
