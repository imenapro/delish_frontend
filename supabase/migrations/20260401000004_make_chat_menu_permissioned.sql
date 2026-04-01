UPDATE public.menus
SET permission_required_id = (
  SELECT id FROM public.permissions WHERE code = 'chat.view'
)
WHERE path = '/chat'
AND (permission_required_id IS NULL OR permission_required_id <> (SELECT id FROM public.permissions WHERE code = 'chat.view'));

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.code = 'chat.view'
WHERE r.name IN ('admin', 'store_owner', 'branch_manager', 'seller', 'super_admin')
ON CONFLICT DO NOTHING;

