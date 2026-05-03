-- Enhance RBAC functions to grant Super Admin full access

-- 1. Update has_role (app_role version) to be more robust
-- We use the existing parameter name '_role' to avoid dependency errors
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN AS $$
BEGIN
  -- 1. Check user_roles (enum version)
  IF EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = _user_id AND role = _role
  ) THEN
    RETURN TRUE;
  END IF;

  -- 2. Check user_role_assignments (dynamic roles)
  IF EXISTS (
    SELECT 1 FROM public.user_role_assignments ura
    JOIN public.roles r ON ura.role_id = r.id
    WHERE ura.user_id = _user_id AND r.name = _role::text
  ) THEN
    RETURN TRUE;
  END IF;

  -- 3. Super Admin Bypass: If checking for any role, super_admin should usually pass 
  -- except if we are checking specifically for a different role.
  -- But usually, if you have super_admin, you have everything.
  IF EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = _user_id AND role::text = 'super_admin'
  ) THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create/Update has_role (TEXT version) for dynamic checks
-- We use '_role' here to match existing function parameter name and avoid 42P13 error
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  -- 1. Check user_roles (legacy enum)
  IF EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = _user_id AND role::text = _role
  ) THEN
    RETURN TRUE;
  END IF;

  -- 2. Check user_role_assignments (dynamic roles)
  IF EXISTS (
    SELECT 1 FROM public.user_role_assignments ura
    JOIN public.roles r ON ura.role_id = r.id
    WHERE ura.user_id = _user_id AND r.name = _role
  ) THEN
    RETURN TRUE;
  END IF;

  -- 3. Super Admin Bypass
  IF _role != 'super_admin' AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = _user_id AND role::text = 'super_admin'
  ) THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Update has_permission to bypass checks for super_admin
CREATE OR REPLACE FUNCTION public.has_permission(
  _user_id UUID,
  _permission_code TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  _role_ids UUID[];
  _enum_role_names TEXT[];
BEGIN
  -- 0. SUPER ADMIN BYPASS
  -- Use the text version of has_role
  IF public.has_role(_user_id, 'super_admin'::text) THEN
    RETURN TRUE;
  END IF;

  -- 1. Check for explicit DENY (is_granted = false)
  IF EXISTS (
    SELECT 1
    FROM public.user_permissions up
    JOIN public.permissions p ON up.permission_id = p.id
    WHERE up.user_id = _user_id
    AND p.code = _permission_code
    AND up.is_granted = false
  ) THEN
    RETURN FALSE;
  END IF;

  -- 2. Check for explicit ALLOW (is_granted = true)
  IF EXISTS (
    SELECT 1
    FROM public.user_permissions up
    JOIN public.permissions p ON up.permission_id = p.id
    WHERE up.user_id = _user_id
    AND p.code = _permission_code
    AND up.is_granted = true
  ) THEN
    RETURN TRUE;
  END IF;

  -- 3. Check Role Permissions
  -- Get role IDs from dynamic assignments
  SELECT array_agg(role_id) INTO _role_ids
  FROM public.user_role_assignments
  WHERE user_id = _user_id;

  -- Get legacy enum roles
  SELECT array_agg(role::text) INTO _enum_role_names
  FROM public.user_roles
  WHERE user_id = _user_id;
  
  -- Add IDs of legacy roles to _role_ids
  SELECT array_cat(_role_ids, array_agg(id)) INTO _role_ids
  FROM public.roles
  WHERE name = ANY(_enum_role_names);

  -- Check if any of these roles have the permission
  IF EXISTS (
    SELECT 1
    FROM public.role_permissions rp
    JOIN public.permissions p ON rp.permission_id = p.id
    WHERE rp.role_id = ANY(_role_ids)
    AND p.code = _permission_code
  ) THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Update get_user_effective_permissions to include everything for super_admin
CREATE OR REPLACE FUNCTION public.get_user_effective_permissions(_user_id UUID)
RETURNS TEXT[] AS $$
DECLARE
  _role_ids UUID[];
  _enum_role_names TEXT[];
  _permissions TEXT[];
BEGIN
  -- SUPER ADMIN BYPASS: Return all permission codes
  IF public.has_role(_user_id, 'super_admin') THEN
    SELECT array_agg(code) INTO _permissions FROM public.permissions;
    RETURN COALESCE(_permissions, ARRAY[]::TEXT[]);
  END IF;

  -- 1. Get role IDs from dynamic assignments
  SELECT array_agg(role_id) INTO _role_ids
  FROM public.user_role_assignments
  WHERE user_id = _user_id;

  -- 2. Get legacy enum roles
  SELECT array_agg(role::text) INTO _enum_role_names
  FROM public.user_roles
  WHERE user_id = _user_id;
  
  -- Add IDs of legacy roles to _role_ids
  SELECT array_cat(_role_ids, array_agg(id)) INTO _role_ids
  FROM public.roles
  WHERE name = ANY(_enum_role_names);

  -- 3. Collect all permissions from Roles
  SELECT array_agg(DISTINCT p.code) INTO _permissions
  FROM public.role_permissions rp
  JOIN public.permissions p ON rp.permission_id = p.id
  WHERE rp.role_id = ANY(_role_ids);

  -- 4. Apply User Overrides
  -- Remove permissions that are explicitly DENIED
  IF EXISTS (
    SELECT 1 FROM public.user_permissions WHERE user_id = _user_id AND is_granted = false
  ) THEN
    SELECT array_agg(p) INTO _permissions
    FROM unnest(_permissions) p
    WHERE p NOT IN (
      SELECT perm.code
      FROM public.user_permissions up
      JOIN public.permissions perm ON up.permission_id = perm.id
      WHERE up.user_id = _user_id AND up.is_granted = false
    );
  END IF;

  -- Add permissions that are explicitly GRANTED
  SELECT array_cat(_permissions, array_agg(perm.code)) INTO _permissions
  FROM public.user_permissions up
  JOIN public.permissions perm ON up.permission_id = perm.id
  WHERE up.user_id = _user_id AND up.is_granted = true;

  -- Return unique permissions
  SELECT array_agg(DISTINCT p) INTO _permissions FROM unnest(_permissions) p;
  
  RETURN COALESCE(_permissions, ARRAY[]::TEXT[]);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
