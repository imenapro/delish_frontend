-- Fix user_roles RLS policies to use explicit casting for role comparisons
-- This resolves the "operator does not exist: text = app_role" error

-- 1. Update check_user_role_for_business function (already fixed in 20260126000001 but reinforcing)
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
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
    AND role::text = _role_name
    AND business_id = _business_id
  );
END;
$$;

-- 2. Fix policies on public.user_roles

-- Drop potentially problematic policies
DROP POLICY IF EXISTS "Business owners and super admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view roles in their business" ON public.user_roles;
DROP POLICY IF EXISTS "Store owners can manage roles for their business" ON public.user_roles;

-- Recreate policies with explicit casting

-- Policy for managing roles (INSERT, UPDATE, DELETE)
CREATE POLICY "Business owners and super admins can manage roles"
ON public.user_roles
FOR ALL
USING (
  -- Super Admin check
  (EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role::text = 'super_admin'
  ))
  OR 
  -- Business Owner / Manager check
  (business_id IS NOT NULL AND (
    is_business_owner(auth.uid(), business_id)
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.business_id = user_roles.business_id
      AND ur.role::text IN ('branch_manager', 'store_owner', 'admin')
    )
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
  -- Super Admin can see all
  (EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role::text = 'super_admin'
  ))
  OR 
  -- Managers can see roles in their business
  (business_id IS NOT NULL AND (
    is_business_owner(auth.uid(), business_id)
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.business_id = user_roles.business_id
      AND ur.role::text IN ('branch_manager', 'store_owner', 'admin')
    )
  ))
);

-- 3. Fix has_role function just in case
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role::text = _role::text
  );
$$;

-- 4. Overload has_role to accept text to prevent type errors in calls
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role text)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role::text = _role
  );
$$;
