
-- Nuclear fix for user_roles AND helper functions
-- This script:
-- 1. Drops ALL policies on user_roles.
-- 2. Redefines helper functions (is_business_owner, is_super_admin, is_business_manager) to be SECURITY DEFINER and type-safe.
-- 3. Recreates robust policies on user_roles.

-- 1. Drop all policies on user_roles
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'user_roles' AND schemaname = 'public' LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON public.user_roles';
  END LOOP;
END $$;

-- 2. Redefine helper functions safely

-- is_business_owner: Checks user_roles for store_owner or Owner role with matching business_id
CREATE OR REPLACE FUNCTION public.is_business_owner(_user_id UUID, _business_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.businesses
    WHERE id = _business_id
    AND owner_id = _user_id
  );
END;
$$;

-- is_super_admin: Checks against user_roles with explicit casting
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

-- is_business_manager: Checks against user_roles with explicit casting
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

-- 3. Recreate robust policies

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

-- Ensure RLS is enabled
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
