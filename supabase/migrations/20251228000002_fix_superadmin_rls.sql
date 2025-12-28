-- Fix Super Admin RLS Policies
-- This migration ensures that the super_admin role has full access to core tables

-- 1. Ensure 'super_admin' exists in app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin';

-- 2. Update Businesses Policies
DROP POLICY IF EXISTS "Business owners can update their business" ON public.businesses;

CREATE POLICY "Business owners and super admins can update their business"
ON public.businesses
FOR UPDATE
USING (
  is_business_owner(auth.uid(), id)
  OR owner_id = auth.uid()
  OR has_role(auth.uid(), 'super_admin'::app_role)
);

DROP POLICY IF EXISTS "Super admins can delete businesses" ON public.businesses;

CREATE POLICY "Super admins can delete businesses"
ON public.businesses
FOR DELETE
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
);

-- 3. Update Profiles Policies
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users and super admins can update profiles"
ON public.profiles
FOR UPDATE
USING (
  auth.uid() = id
  OR has_role(auth.uid(), 'super_admin'::app_role)
);

-- 4. Update User Roles Policies
-- Ensure super_admin can manage all roles
DROP POLICY IF EXISTS "Business owners can manage roles" ON public.user_roles;

CREATE POLICY "Business owners and super admins can manage roles"
ON public.user_roles
FOR ALL
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR (business_id IS NOT NULL AND is_business_owner(auth.uid(), business_id))
  OR has_role(auth.uid(), 'branch_manager'::app_role)
);

-- 5. Ensure super_admin can view all user roles
DROP POLICY IF EXISTS "Users can view roles in their business" ON public.user_roles;

CREATE POLICY "Users can view roles in their business"
ON public.user_roles
FOR SELECT
USING (
  auth.uid() = user_id
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'branch_manager'::app_role)
  OR (business_id IS NOT NULL AND is_business_owner(auth.uid(), business_id))
);
