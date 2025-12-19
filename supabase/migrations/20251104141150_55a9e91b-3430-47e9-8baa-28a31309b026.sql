-- Phase 1: Enhanced Role System & Hierarchy
-- Part 2: Add profile columns, role_hierarchy table, and policies

-- 1. Add password management and suspension fields to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS must_change_password boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS password_changed_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS is_suspended boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS suspended_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS suspended_by uuid REFERENCES auth.users(id);

-- 2. Create role_hierarchy table to define which roles can manage other roles
CREATE TABLE IF NOT EXISTS public.role_hierarchy (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_role app_role NOT NULL,
  child_role app_role NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(parent_role, child_role)
);

-- Enable RLS
ALTER TABLE public.role_hierarchy ENABLE ROW LEVEL SECURITY;

-- RLS policies for role_hierarchy
CREATE POLICY "Everyone can view role hierarchy"
ON public.role_hierarchy FOR SELECT
USING (true);

CREATE POLICY "Only super admins can manage role hierarchy"
ON public.role_hierarchy FOR ALL
USING (has_role(auth.uid(), 'super_admin'));

-- 3. Insert role hierarchy rules
INSERT INTO public.role_hierarchy (parent_role, child_role) VALUES
  ('super_admin', 'branch_manager'),
  ('super_admin', 'admin'),
  ('super_admin', 'store_keeper'),
  ('super_admin', 'manpower'),
  ('super_admin', 'accountant'),
  ('super_admin', 'seller'),
  ('super_admin', 'manager'),
  ('super_admin', 'delivery'),
  ('super_admin', 'customer'),
  ('branch_manager', 'store_keeper'),
  ('branch_manager', 'manpower'),
  ('branch_manager', 'accountant'),
  ('branch_manager', 'seller'),
  ('branch_manager', 'customer'),
  ('admin', 'seller'),
  ('admin', 'manager'),
  ('admin', 'delivery'),
  ('manager', 'seller')
ON CONFLICT (parent_role, child_role) DO NOTHING;

-- 4. Create function to check if a role can manage another role
CREATE OR REPLACE FUNCTION public.can_manage_role(_manager_id uuid, _target_role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.role_hierarchy rh ON ur.role = rh.parent_role
    WHERE ur.user_id = _manager_id
      AND rh.child_role = _target_role
  )
$$;

-- 5. Update user_roles RLS policies to respect suspension and hierarchy
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Super admins and managers can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Super admins and branch managers can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Super admins and branch managers can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Super admins and branch managers can delete roles" ON public.user_roles;

-- View policies
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
USING (
  auth.uid() = user_id AND
  NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND is_suspended = true
  )
);

CREATE POLICY "Super admins and managers can view all roles"
ON public.user_roles FOR SELECT
USING (
  has_role(auth.uid(), 'super_admin') OR
  has_role(auth.uid(), 'branch_manager') OR
  has_role(auth.uid(), 'admin')
);

-- Insert policy
CREATE POLICY "Super admins and branch managers can create roles"
ON public.user_roles FOR INSERT
WITH CHECK (
  (has_role(auth.uid(), 'super_admin') OR 
   (has_role(auth.uid(), 'branch_manager') AND can_manage_role(auth.uid(), role)))
  AND NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND is_suspended = true
  )
);

-- Update policy
CREATE POLICY "Super admins and branch managers can update roles"
ON public.user_roles FOR UPDATE
USING (
  (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'branch_manager'))
  AND NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND is_suspended = true
  )
);

-- Delete policy
CREATE POLICY "Super admins and branch managers can delete roles"
ON public.user_roles FOR DELETE
USING (
  (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'branch_manager'))
  AND NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND is_suspended = true
  )
);

-- 6. Update profiles RLS to allow profile suspension
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Branch managers and super admins can suspend profiles" ON public.profiles;

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id);

CREATE POLICY "Branch managers and super admins can manage profiles"
ON public.profiles FOR UPDATE
USING (
  has_role(auth.uid(), 'super_admin') OR
  has_role(auth.uid(), 'branch_manager')
);