-- Fix menu permissions for Dashboard, Orders, and Chat
-- These menus should require specific permissions instead of being open to everyone

UPDATE public.menus
SET permission_required_id = (SELECT id FROM public.permissions WHERE code = 'pos.access')
WHERE path = '/dashboard' AND permission_required_id IS NULL;

UPDATE public.menus
SET permission_required_id = (SELECT id FROM public.permissions WHERE code = 'orders.view')
WHERE path = '/orders' AND permission_required_id IS NULL;
UPDATE public.menus
SET permission_required_id = (SELECT id FROM public.permissions WHERE code = 'wallet.view')
WHERE (path = '/wallet' OR lower(label) = 'wallet') AND permission_required_id IS NULL;
UPDATE public.menus
SET permission_required_id = (SELECT id FROM public.permissions WHERE code = 'chat.view')
WHERE path = '/chat' AND permission_required_id IS NULL;