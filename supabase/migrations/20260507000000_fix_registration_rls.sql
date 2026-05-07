-- Fix RLS for registration flow
-- This migration allows the registration process to complete even if the user is not yet fully authenticated (e.g., email confirmation pending)

-- 1. Businesses: Allow insertion during registration
DROP POLICY IF EXISTS "Users can create businesses" ON public.businesses;
DROP POLICY IF EXISTS "Allow business creation during registration" ON public.businesses;

CREATE POLICY "Allow business creation during registration"
ON public.businesses
FOR INSERT
TO public
WITH CHECK (true);

-- 2. User Roles: Allow initial role creation
-- First, drop the overly restrictive ALL policy if it exists
DROP POLICY IF EXISTS "Business owners and super admins can manage roles" ON public.user_roles;

-- Ensure SELECT policy exists and is correct
DROP POLICY IF EXISTS "Users can view roles in their business" ON public.user_roles;
CREATE POLICY "Users can view roles in their business"
ON public.user_roles
FOR SELECT
USING (
  auth.uid() = user_id
  OR public.is_super_admin(auth.uid())
  OR (business_id IS NOT NULL AND (
    public.is_business_owner(auth.uid(), business_id)
    OR public.is_business_manager(auth.uid(), business_id)
  ))
);

-- Allow INSERT for registration (to public to handle email confirmation delay)
DROP POLICY IF EXISTS "Allow role creation during registration" ON public.user_roles;
CREATE POLICY "Allow role creation during registration"
ON public.user_roles
FOR INSERT
TO public
WITH CHECK (true);

-- Restricted UPDATE/DELETE for authenticated owners/admins
DROP POLICY IF EXISTS "Owners and admins can manage roles" ON public.user_roles;
CREATE POLICY "Owners and admins can manage roles"
ON public.user_roles
FOR UPDATE
USING (
  public.is_super_admin(auth.uid())
  OR (business_id IS NOT NULL AND (
    public.is_business_owner(auth.uid(), business_id)
    OR public.is_business_manager(auth.uid(), business_id)
  ))
);

DROP POLICY IF EXISTS "Owners and admins can delete roles" ON public.user_roles;
CREATE POLICY "Owners and admins can delete roles"
ON public.user_roles
FOR DELETE
USING (
  public.is_super_admin(auth.uid())
  OR (business_id IS NOT NULL AND (
    public.is_business_owner(auth.uid(), business_id)
    OR public.is_business_manager(auth.uid(), business_id)
  ))
);

-- 3. Shops: Allow shop creation during registration
DROP POLICY IF EXISTS "Shops insert" ON public.shops;
DROP POLICY IF EXISTS "Allow shop creation during registration" ON public.shops;

CREATE POLICY "Allow shop creation during registration"
ON public.shops
FOR INSERT
TO public
WITH CHECK (true);

-- 4. Products: Allow product creation during registration
DROP POLICY IF EXISTS "Admins and managers can manage products" ON public.products;
DROP POLICY IF EXISTS "Allow product creation during registration" ON public.products;

CREATE POLICY "Allow product creation during registration"
ON public.products
FOR INSERT
TO public
WITH CHECK (true);

-- Re-add the management policy for products
CREATE POLICY "Admins and managers can manage products"
ON public.products
FOR ALL
TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR (business_id IS NOT NULL AND (
    public.is_business_owner(auth.uid(), business_id)
    OR public.is_business_manager(auth.uid(), business_id)
  ))
);

-- 5. SMS Logs: Ensure they can be created
ALTER TABLE public.sms_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow sms log creation during registration" ON public.sms_logs;
CREATE POLICY "Allow sms log creation during registration"
ON public.sms_logs
FOR INSERT
TO public
WITH CHECK (true);
