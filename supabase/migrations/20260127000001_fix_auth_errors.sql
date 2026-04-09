-- Fix for "Error fetching roles" and "Error fetching profile"
-- 1. Ensure public.has_role is defined and SECURITY DEFINER (to prevent recursion)
-- 2. Ensure app_role enum contains all necessary values
-- 3. Ensure profiles table has necessary columns and correct RLS policies

-- Ensure app_role has all required values
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'store_owner';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'Owner';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'branch_manager';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'store_keeper';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'manpower';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'accountant';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'seller';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'manager';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'delivery';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'customer';

-- Ensure has_role function exists and is SECURITY DEFINER
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

-- Ensure profiles table has is_suspended column (used in RLS policies)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'is_suspended') THEN
        ALTER TABLE public.profiles ADD COLUMN is_suspended BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Fix Profiles RLS Policies
-- Ensure users can view profiles (needed for user_roles policy check)
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

-- Allow authenticated users to view all profiles (necessary for name resolution, etc.)
CREATE POLICY "Users can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- Ensure User Roles RLS Policies are safe
-- We don't drop existing policies on user_roles here as they seem complex, 
-- but we ensure the dependencies (profiles access and has_role) are fixed.

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON public.profiles TO authenticated;
GRANT SELECT ON public.user_roles TO authenticated;
