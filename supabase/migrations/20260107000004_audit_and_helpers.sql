-- Create audit_logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name TEXT NOT NULL,
    record_id UUID,
    operation TEXT NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
    old_data JSONB,
    new_data JSONB,
    changed_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view audit logs" ON public.audit_logs FOR SELECT USING (
  public.has_permission(auth.uid(), 'audit.view')
  OR public.has_role(auth.uid(), 'super_admin')
);

-- Function to create audit log entry
CREATE OR REPLACE FUNCTION public.log_audit_event()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.audit_logs (
        table_name,
        record_id,
        operation,
        old_data,
        new_data,
        changed_by
    )
    VALUES (
        TG_TABLE_NAME::TEXT,
        COALESCE(NEW.id, OLD.id),
        TG_OP,
        row_to_json(OLD),
        row_to_json(NEW),
        auth.uid()
    );
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add triggers to RBAC tables
CREATE TRIGGER audit_roles_changes
AFTER INSERT OR UPDATE OR DELETE ON public.roles
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

CREATE TRIGGER audit_permissions_changes
AFTER INSERT OR UPDATE OR DELETE ON public.permissions
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

CREATE TRIGGER audit_role_permissions_changes
AFTER INSERT OR UPDATE OR DELETE ON public.role_permissions
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

CREATE TRIGGER audit_user_role_assignments_changes
AFTER INSERT OR UPDATE OR DELETE ON public.user_role_assignments
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

CREATE TRIGGER audit_user_permissions_changes
AFTER INSERT OR UPDATE OR DELETE ON public.user_permissions
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();


-- Update has_permission to support DENY overrides
CREATE OR REPLACE FUNCTION public.has_permission(
  _user_id UUID,
  _permission_code TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  _role_ids UUID[];
  _enum_role_names TEXT[];
BEGIN
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


-- Function to get ALL effective permissions for a user
CREATE OR REPLACE FUNCTION public.get_user_effective_permissions(_user_id UUID)
RETURNS TEXT[] AS $$
DECLARE
  _role_ids UUID[];
  _enum_role_names TEXT[];
  _permissions TEXT[];
BEGIN
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

-- Add audit.view permission
INSERT INTO public.permissions (code, description, module)
VALUES ('audit.view', 'View audit logs', 'system')
ON CONFLICT (code) DO NOTHING;

-- Grant audit.view to super_admin
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'super_admin' AND p.code = 'audit.view'
ON CONFLICT DO NOTHING;
