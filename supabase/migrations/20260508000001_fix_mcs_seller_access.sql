-- Fix Money Collection Permissions and Menu for Sellers
-- This migration ensures sellers can see the Collections menu and have access to report funds.

-- 1. Create a specific permission for Collections access
INSERT INTO public.permissions (code, description, module)
VALUES ('finance.collections.access', 'Access the money collection reporting system', 'finance')
ON CONFLICT (code) DO NOTHING;

-- 2. Grant this permission to relevant roles (including seller)
DO $$
DECLARE
  perm_id uuid;
  role_rec record;
  target_roles text[] := ARRAY['super_admin', 'store_owner', 'admin', 'branch_manager', 'accountant', 'seller'];
BEGIN
  SELECT id INTO perm_id FROM public.permissions WHERE code = 'finance.collections.access';
  
  IF perm_id IS NOT NULL THEN
    FOR role_rec IN SELECT id, name FROM public.roles WHERE name = ANY(target_roles)
    LOOP
      INSERT INTO public.role_permissions (role_id, permission_id)
      VALUES (role_rec.id, perm_id)
      ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;
END $$;

-- 3. Update the Collections menu to use this new permission
-- This ensures sellers can see the menu in the sidebar
UPDATE public.menus 
SET permission_required_id = (SELECT id FROM public.permissions WHERE code = 'finance.collections.access'),
    sort_order = 1 -- Move it higher if needed, or keep it as is
WHERE path = 'finance/collections';

-- 4. Ensure the Finance menu itself (if it exists) doesn't block the sub-menu access logic
-- (Usually sub-menus are handled by the UI, but we want the Collections menu to be visible)
