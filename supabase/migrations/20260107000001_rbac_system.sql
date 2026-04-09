-- Create tables for RBAC System

-- 1. Roles Table (Extending beyond enum)
CREATE TABLE IF NOT EXISTS public.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    is_system BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on roles
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

-- 2. Permissions Table
CREATE TABLE IF NOT EXISTS public.permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL, -- e.g. 'inventory.view', 'users.manage'
    description TEXT,
    module TEXT, -- 'inventory', 'users', 'finance'
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on permissions
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;

-- 3. Role Permissions (Many-to-Many)
CREATE TABLE IF NOT EXISTS public.role_permissions (
    role_id UUID REFERENCES public.roles(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES public.permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (role_id, permission_id)
);

-- Enable RLS
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- 4. User Role Assignments (For dynamic roles not in enum)
CREATE TABLE IF NOT EXISTS public.user_role_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role_id UUID REFERENCES public.roles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, role_id)
);

-- Enable RLS
ALTER TABLE public.user_role_assignments ENABLE ROW LEVEL SECURITY;

-- 5. User Additional Permissions (Granular overrides)
CREATE TABLE IF NOT EXISTS public.user_permissions (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES public.permissions(id) ON DELETE CASCADE,
    is_granted BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (user_id, permission_id)
);

-- Enable RLS
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- 6. Menus Table
CREATE TABLE IF NOT EXISTS public.menus (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    label TEXT NOT NULL,
    path TEXT NOT NULL,
    icon TEXT,
    parent_id UUID REFERENCES public.menus(id) ON DELETE SET NULL,
    sort_order INTEGER DEFAULT 0,
    permission_required_id UUID REFERENCES public.permissions(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.menus ENABLE ROW LEVEL SECURITY;


-- FUNCTIONS

-- Sync existing enum roles to roles table
INSERT INTO public.roles (name, description, is_system)
SELECT 
  val as name, 
  'System role: ' || val as description, 
  true as is_system
FROM (
  SELECT unnest(enum_range(NULL::public.app_role))::text as val
) s
ON CONFLICT (name) DO NOTHING;

-- Function to check permission
CREATE OR REPLACE FUNCTION public.has_permission(
  _user_id UUID,
  _permission_code TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  _role_ids UUID[];
  _enum_role_names TEXT[];
BEGIN
  -- 1. Get role IDs from dynamic assignments
  SELECT array_agg(role_id) INTO _role_ids
  FROM public.user_role_assignments
  WHERE user_id = _user_id;

  -- 2. Get legacy enum roles and find their corresponding IDs in roles table
  SELECT array_agg(role::text) INTO _enum_role_names
  FROM public.user_roles
  WHERE user_id = _user_id;
  
  -- Add IDs of legacy roles to _role_ids
  SELECT array_cat(_role_ids, array_agg(id)) INTO _role_ids
  FROM public.roles
  WHERE name = ANY(_enum_role_names);

  -- 3. Check if any of these roles have the permission
  IF EXISTS (
    SELECT 1
    FROM public.role_permissions rp
    JOIN public.permissions p ON rp.permission_id = p.id
    WHERE rp.role_id = ANY(_role_ids)
    AND p.code = _permission_code
  ) THEN
    RETURN TRUE;
  END IF;

  -- 4. Check direct user permissions
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

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user accessible menus
CREATE OR REPLACE FUNCTION public.get_user_menus(_user_id UUID)
RETURNS TABLE (
  id UUID,
  label TEXT,
  path TEXT,
  icon TEXT,
  parent_id UUID,
  sort_order INTEGER,
  children JSONB
) AS $$
BEGIN
  RETURN QUERY
  WITH accessible_menus AS (
    SELECT m.*
    FROM public.menus m
    LEFT JOIN public.permissions p ON m.permission_required_id = p.id
    WHERE m.is_active = true
    AND m.permission_required_id IS NOT NULL
    AND public.has_permission(_user_id, p.code)
  )
  SELECT 
    am.id,
    am.label,
    am.path,
    am.icon,
    am.parent_id,
    am.sort_order,
    (
       SELECT jsonb_agg(jsonb_build_object(
         'id', child.id,
         'label', child.label,
         'path', child.path,
         'icon', child.icon,
         'sort_order', child.sort_order
       ) ORDER BY child.sort_order)
       FROM accessible_menus child
       WHERE child.parent_id = am.id
    ) as children
  FROM accessible_menus am
  WHERE am.parent_id IS NULL
  ORDER BY am.sort_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies

-- Roles: Public read, Admin write
CREATE POLICY "Roles are viewable by everyone" ON public.roles FOR SELECT USING (true);
CREATE POLICY "Only admins can manage roles" ON public.roles FOR ALL USING (
  public.has_permission(auth.uid(), 'roles.manage') 
  OR public.has_role(auth.uid(), 'super_admin') -- bootstrapping
);

-- Permissions: Public read, Admin write
CREATE POLICY "Permissions are viewable by everyone" ON public.permissions FOR SELECT USING (true);
CREATE POLICY "Only admins can manage permissions" ON public.permissions FOR ALL USING (
  public.has_permission(auth.uid(), 'permissions.manage')
  OR public.has_role(auth.uid(), 'super_admin')
);

-- Role Permissions: Public read, Admin write
CREATE POLICY "Role permissions are viewable by everyone" ON public.role_permissions FOR SELECT USING (true);
CREATE POLICY "Only admins can manage role permissions" ON public.role_permissions FOR ALL USING (
  public.has_permission(auth.uid(), 'roles.manage')
  OR public.has_role(auth.uid(), 'super_admin')
);

-- User Role Assignments: Users can view own, Admins manage
CREATE POLICY "Users can view own assignments" ON public.user_role_assignments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage assignments" ON public.user_role_assignments FOR ALL USING (
  public.has_permission(auth.uid(), 'users.manage')
  OR public.has_role(auth.uid(), 'super_admin')
);

-- Menus: Public read (filtered by function usually, but table access is needed)
CREATE POLICY "Menus are viewable by everyone" ON public.menus FOR SELECT USING (true);
CREATE POLICY "Only admins can manage menus" ON public.menus FOR ALL USING (
  public.has_permission(auth.uid(), 'menus.manage')
  OR public.has_role(auth.uid(), 'super_admin')
);

-- Seed basic permissions
INSERT INTO public.permissions (code, description, module) VALUES
('roles.view', 'View roles', 'system'),
('roles.manage', 'Create, update, delete roles', 'system'),
('permissions.view', 'View permissions', 'system'),
('permissions.manage', 'Manage permissions', 'system'),
('users.view', 'View users', 'users'),
('users.manage', 'Manage users', 'users'),
('menus.view', 'View menus', 'system'),
('menus.manage', 'Manage menus', 'system'),
('dashboard.view', 'View dashboard', 'dashboard')
ON CONFLICT (code) DO NOTHING;

-- Grant super_admin all permissions
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'super_admin'
ON CONFLICT DO NOTHING;

