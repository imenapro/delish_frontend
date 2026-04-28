
-- Add missing roles to app_role enum
-- Note: PostgreSQL doesn't support adding enum values within a transaction block easily
-- but since this is a migration, it should work if not using ALTER TYPE in a complex transaction.
-- If this fails, you might need to run it outside a transaction or use a different approach.

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'app_role' AND e.enumlabel = 'distributor') THEN
        ALTER TYPE public.app_role ADD VALUE 'distributor';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'app_role' AND e.enumlabel = 'production') THEN
        ALTER TYPE public.app_role ADD VALUE 'production';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'app_role' AND e.enumlabel = 'logistics') THEN
        ALTER TYPE public.app_role ADD VALUE 'logistics';
    END IF;
END
$$;

-- Add missing roles to role hierarchy
-- This allows super_admin and branch_manager to manage these roles
INSERT INTO public.role_hierarchy (parent_role, child_role) VALUES
  ('super_admin', 'distributor'),
  ('super_admin', 'production'),
  ('super_admin', 'logistics'),
  ('branch_manager', 'distributor'),
  ('branch_manager', 'production'),
  ('branch_manager', 'logistics'),
  ('admin', 'distributor'),
  ('admin', 'production'),
  ('admin', 'logistics')
ON CONFLICT (parent_role, child_role) DO NOTHING;

-- Grant basic permissions to these roles
-- For now, they get POS access and inventory view access
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name IN ('distributor', 'production', 'logistics')
AND p.code IN ('pos.access', 'inventory.view', 'inventory.accept_transfer')
ON CONFLICT DO NOTHING;

-- Ensure all roles exist in the roles table
INSERT INTO public.roles (name, description, is_system)
VALUES 
  ('distributor', 'System role: distributor', true),
  ('production', 'System role: production', true),
  ('logistics', 'System role: logistics', true)
ON CONFLICT (name) DO NOTHING;
