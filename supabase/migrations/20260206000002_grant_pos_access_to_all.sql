-- Grant POS access to all business staff roles
-- This ensures that everyone within a business (except customers) can access the POS module

-- 1. Ensure all enum roles exist in the roles table
INSERT INTO public.roles (name, description, is_system)
SELECT 
  val as name, 
  'System role: ' || val as description, 
  true as is_system
FROM (
  SELECT unnest(enum_range(NULL::public.app_role))::text as val
) s
ON CONFLICT (name) DO NOTHING;

-- 2. Grant 'pos.access' to all roles except 'customer'
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE p.code = 'pos.access'
AND r.name NOT IN ('customer') -- Exclude external customers
ON CONFLICT DO NOTHING;
