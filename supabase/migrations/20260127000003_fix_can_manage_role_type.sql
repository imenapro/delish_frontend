-- Fix type mismatch in can_manage_role function
-- We create two versions of the function to handle both app_role and text inputs
-- and we cast everything to text inside to handle both text and enum column types in tables

-- Version 1: Input is app_role
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
    -- Explicitly cast everything to text to ensure safe comparisons
    JOIN public.role_hierarchy rh ON ur.role::text = rh.parent_role::text
    WHERE ur.user_id = _manager_id
      AND rh.child_role::text = _target_role::text
  )
$$;

-- Version 2: Input is text (overload for safety)
CREATE OR REPLACE FUNCTION public.can_manage_role(_manager_id uuid, _target_role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    -- Explicitly cast everything to text to ensure safe comparisons
    JOIN public.role_hierarchy rh ON ur.role::text = rh.parent_role::text
    WHERE ur.user_id = _manager_id
      AND rh.child_role::text = _target_role
  )
$$;
