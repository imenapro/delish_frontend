
-- Nuclear option to fix user_roles RLS policies
-- This script drops ALL existing policies on user_roles dynamically to ensure no legacy broken policies remain.
-- Then it recreates the robust policies using explicit casting and SECURITY DEFINER functions.

DO $$
DECLARE
  pol record;
BEGIN
  -- Iterate over all policies for the user_roles table and drop them
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'user_roles' AND schemaname = 'public' LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON public.user_roles';
  END LOOP;
END $$;

-- Now recreate the robust policies

-- 1. Policy for viewing roles (SELECT)
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

-- 2. Policy for managing roles (INSERT, UPDATE, DELETE)
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

-- Ensure RLS is enabled
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
