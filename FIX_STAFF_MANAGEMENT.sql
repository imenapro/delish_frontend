-- FIX_STAFF_MANAGEMENT.sql
-- This script ensures that Super Admins and Store Owners have full control over staff management.

-- 1. Ensure granular permissions exist
INSERT INTO public.permissions (code, description, module)
VALUES
  ('staff.view', 'View staff list and details', 'staff'),
  ('staff.create', 'Invite or add new staff members', 'staff'),
  ('staff.edit', 'Edit staff details and assignments', 'staff'),
  ('staff.delete', 'Remove staff members', 'staff'),
  ('roles.view', 'View roles and permissions', 'roles'),
  ('roles.manage', 'Manage roles and assignments', 'roles')
ON CONFLICT (code) DO UPDATE 
SET description = EXCLUDED.description, module = EXCLUDED.module;

-- 2. Grant permissions to key roles
DO $$
DECLARE
  role_record RECORD;
  perm_record RECORD;
BEGIN
  FOR role_record IN SELECT id, name FROM public.roles WHERE name IN ('super_admin', 'store_owner', 'Owner', 'admin') LOOP
    FOR perm_record IN SELECT id FROM public.permissions WHERE module IN ('staff', 'roles') LOOP
      INSERT INTO public.role_permissions (role_id, permission_id)
      VALUES (role_record.id, perm_record.id)
      ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;
END $$;

-- 3. Robust handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_shop_id uuid;
  v_business_id uuid;
  v_role text;
BEGIN
  -- 1. Extract metadata safely
  BEGIN
    v_shop_id := NULLIF(NEW.raw_user_meta_data->>'shop_id', '')::uuid;
  EXCEPTION WHEN OTHERS THEN
    v_shop_id := NULL;
  END;

  BEGIN
    v_business_id := NULLIF(NEW.raw_user_meta_data->>'business_id', '')::uuid;
  EXCEPTION WHEN OTHERS THEN
    v_business_id := NULL;
  END;

  v_role := COALESCE(NULLIF(NEW.raw_user_meta_data->>'role', ''), 'customer');

  -- 2. Insert/Update Profile
  INSERT INTO public.profiles (id, name, email, phone, shop_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email, 'User'),
    NEW.email,
    NEW.raw_user_meta_data->>'phone',
    v_shop_id
  )
  ON CONFLICT (id) DO UPDATE 
  SET name = EXCLUDED.name,
      email = EXCLUDED.email,
      phone = EXCLUDED.phone,
      shop_id = EXCLUDED.shop_id;

  -- 3. Create Wallet
  INSERT INTO public.wallets (user_id, balance, currency)
  VALUES (NEW.id, 0.00, 'RWF')
  ON CONFLICT (user_id) DO NOTHING;

  -- 4. Assign Role (using dynamic casting to app_role)
  BEGIN
    INSERT INTO public.user_roles (user_id, role, business_id, shop_id)
    VALUES (
      NEW.id,
      v_role::public.app_role,
      v_business_id,
      v_shop_id
    )
    ON CONFLICT (user_id, role, business_id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    -- Fallback if role cast fails
    INSERT INTO public.user_roles (user_id, role, business_id, shop_id)
    VALUES (NEW.id, 'customer'::public.app_role, v_business_id, v_shop_id)
    ON CONFLICT DO NOTHING;
  END;

  -- 5. Link Business
  IF v_business_id IS NOT NULL THEN
    INSERT INTO public.user_businesses (user_id, business_id)
    VALUES (NEW.id, v_business_id)
    ON CONFLICT (user_id, business_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Fix user_roles policies to be absolutely permissive for Super Admin and Store Owners
DROP POLICY IF EXISTS "Business owners and super admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view roles in their business" ON public.user_roles;

CREATE POLICY "Manage user roles"
ON public.user_roles
FOR ALL
USING (
  public.is_super_admin(auth.uid())
  OR (business_id IS NOT NULL AND (
    public.is_business_owner(auth.uid(), business_id)
    OR public.is_business_manager(auth.uid(), business_id)
  ))
);

CREATE POLICY "View user roles"
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

-- 5. Ensure Super Admin can manage ALL businesses
DROP POLICY IF EXISTS "Super admins can manage all businesses" ON public.businesses;
CREATE POLICY "Super admins can manage all businesses"
ON public.businesses
FOR ALL
USING (public.is_super_admin(auth.uid()));

-- 6. Ensure Super Admin can manage ALL profiles
DROP POLICY IF EXISTS "Super admins can manage all profiles" ON public.profiles;
CREATE POLICY "Super admins can manage all profiles"
ON public.profiles
FOR ALL
USING (public.is_super_admin(auth.uid()));
