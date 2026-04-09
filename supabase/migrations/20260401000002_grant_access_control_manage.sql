INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p
  ON p.code IN ('roles.manage', 'menus.manage')
WHERE r.name IN ('admin', 'store_owner', 'Owner', 'super_admin')
ON CONFLICT DO NOTHING;

