-- Enforce menu items always require a permission assignment

UPDATE public.menus
SET permission_required_id = (SELECT id FROM public.permissions WHERE code = 'pos.access')
WHERE path = '/dashboard' AND permission_required_id IS NULL;

UPDATE public.menus
SET permission_required_id = (SELECT id FROM public.permissions WHERE code = 'orders.view')
WHERE path = '/orders' AND permission_required_id IS NULL;

UPDATE public.menus
SET permission_required_id = (SELECT id FROM public.permissions WHERE code = 'chat.view')
WHERE path = '/chat' AND permission_required_id IS NULL;

UPDATE public.menus
SET permission_required_id = (SELECT id FROM public.permissions WHERE code = 'wallet.view')
WHERE path = '/wallet' AND permission_required_id IS NULL;

-- Prevent future inserts/updates without a required permission
CREATE OR REPLACE FUNCTION public.validate_menu_permission_required()
RETURNS trigger AS $$
BEGIN
  IF NEW.permission_required_id IS NULL THEN
    RAISE EXCEPTION 'Menu item "%" must have a permission_required_id', NEW.path;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS enforce_menu_permission_required ON public.menus;
CREATE TRIGGER enforce_menu_permission_required
BEFORE INSERT OR UPDATE ON public.menus
FOR EACH ROW EXECUTE FUNCTION public.validate_menu_permission_required();
