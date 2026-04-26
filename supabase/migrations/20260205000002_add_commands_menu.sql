-- Add Commands/Production Dashboard menu item

-- First, create a permission for commands if it doesn't exist
INSERT INTO public.permissions (code, description, module)
VALUES ('commands.access', 'Access Commands/Production Dashboard', 'production')
ON CONFLICT (code) DO NOTHING;

-- Get the permission ID
DO $$
DECLARE
  v_permission_id UUID;
BEGIN
  SELECT id INTO v_permission_id FROM public.permissions WHERE code = 'commands.access';
  
  -- Insert the commands menu if it doesn't exist
  INSERT INTO public.menus (label, path, icon, sort_order, permission_required_id, is_active)
  SELECT 'Commands', 'commands', 'ChefHat', 6, v_permission_id, true
  WHERE NOT EXISTS (
      SELECT 1 FROM public.menus
      WHERE path = 'commands'
  )
  ON CONFLICT (path) DO UPDATE SET
      is_active = true,
      label = 'Commands',
      permission_required_id = v_permission_id
  WHERE menus.path = 'commands';
END $$;

-- Update the order of existing menus if needed (optional)
UPDATE public.menus SET sort_order = 1 WHERE path = 'dashboard';
UPDATE public.menus SET sort_order = 2 WHERE path = 'pos';
UPDATE public.menus SET sort_order = 3 WHERE path = 'orders';
UPDATE public.menus SET sort_order = 4 WHERE path = 'kitchen';
UPDATE public.menus SET sort_order = 5 WHERE path = 'commands';
UPDATE public.menus SET sort_order = 6 WHERE path = 'inventory';
UPDATE public.menus SET sort_order = 7 WHERE path = 'finance';
UPDATE public.menus SET sort_order = 8 WHERE path = 'workforce';
UPDATE public.menus SET sort_order = 9 WHERE path = 'reports';
UPDATE public.menus SET sort_order = 10 WHERE path = 'delivery';
UPDATE public.menus SET sort_order = 11 WHERE path = 'staff';
UPDATE public.menus SET sort_order = 12 WHERE path = 'admin';
UPDATE public.menus SET sort_order = 13 WHERE path = 'chat';
UPDATE public.menus SET sort_order = 14 WHERE path = 'wallet';
