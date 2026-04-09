-- Clean up all existing policies on user_roles before creating new ones to avoid conflicts
-- and ensure the new robust policies are applied correctly.

-- 1. Drop all known policies on user_roles
DROP POLICY IF EXISTS "Business owners and super admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view roles in their business" ON public.user_roles;
DROP POLICY IF EXISTS "Store owners can manage roles for their business" ON public.user_roles;
DROP POLICY IF EXISTS "Business owners can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view own role" ON public.user_roles;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.user_roles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.user_roles;
DROP POLICY IF EXISTS "Enable update for users based on email" ON public.user_roles;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON public.user_roles;

-- 2. Define SECURITY DEFINER helpers (ensure they are up to date)
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
    AND role::text IN ('branch_manager', 'store_owner', 'Owner', 'admin')
  );
END;
$$;

-- 3. Create robust policies
-- Policy for managing roles (INSERT, UPDATE, DELETE)
CREATE POLICY "Business owners and super admins can manage roles"
ON public.user_roles
FOR ALL
USING (
  -- Super Admin check
  public.is_super_admin(auth.uid())
  OR 
  -- Business Owner / Manager check
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
  -- Super Admin check
  public.is_super_admin(auth.uid())
  OR 
  -- Managers can see roles in their business
  (business_id IS NOT NULL AND (
    public.is_business_owner(auth.uid(), business_id)
    OR public.is_business_manager(auth.uid(), business_id)
  ))
);
