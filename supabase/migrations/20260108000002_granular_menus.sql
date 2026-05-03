-- Enhance Menus with granular module-based permissions

-- 1. Add module column to menus
ALTER TABLE public.menus ADD COLUMN IF NOT EXISTS module TEXT;

-- 2. Update existing menus with modules
UPDATE public.menus SET module = 'pos' WHERE label = 'POS';
UPDATE public.menus SET module = 'shifts' WHERE label = 'Shifts';
UPDATE public.menus SET module = 'invoices' WHERE label = 'Invoices';
UPDATE public.menus SET module = 'shops' WHERE label = 'Shops';
UPDATE public.menus SET module = 'products' WHERE label = 'Products';
UPDATE public.menus SET module = 'orders' WHERE label = 'Orders';
UPDATE public.menus SET module = 'kitchen' WHERE label = 'Kitchen';
UPDATE public.menus SET module = 'inventory' WHERE label = 'Inventory';
UPDATE public.menus SET module = 'finance' WHERE label = 'Finance';
UPDATE public.menus SET module = 'workforce' WHERE label = 'Workforce';
UPDATE public.menus SET module = 'reports' WHERE label = 'Reports';
UPDATE public.menus SET module = 'delivery' WHERE label = 'Delivery';
UPDATE public.menus SET module = 'staff' WHERE label = 'Staff';
UPDATE public.menus SET module = 'admin' WHERE label = 'Admin';
UPDATE public.menus SET module = 'chat' WHERE label = 'Chat';
UPDATE public.menus SET module = 'wallet' WHERE label = 'Wallet';
UPDATE public.menus SET module = 'dashboard' WHERE label = 'Dashboard';

-- 3. Update get_user_menus to return granular permission flags
CREATE OR REPLACE FUNCTION public.get_user_menus(_user_id UUID)
RETURNS TABLE (
  id UUID,
  label TEXT,
  path TEXT,
  icon TEXT,
  parent_id UUID,
  sort_order INTEGER,
  module TEXT,
  can_view BOOLEAN,
  can_create BOOLEAN,
  can_edit BOOLEAN,
  can_delete BOOLEAN,
  children JSONB
) AS $$
BEGIN
  RETURN QUERY
  WITH accessible_menus AS (
    SELECT m.*
    FROM public.menus m
    LEFT JOIN public.permissions p ON m.permission_required_id = p.id
    WHERE m.is_active = true
    AND (
      m.permission_required_id IS NULL
      OR public.has_permission(_user_id, p.code)
    )
  )
  SELECT
    am.id,
    am.label,
    am.path,
    am.icon,
    am.parent_id,
    am.sort_order,
    am.module,
    -- Calculate granular flags
    CASE
      WHEN am.module IS NULL THEN true
      ELSE public.has_permission(_user_id, am.module || '.view') OR public.has_permission(_user_id, am.module || '.access')
    END as can_view,
    CASE
      WHEN am.module IS NULL THEN false
      ELSE public.has_permission(_user_id, am.module || '.create')
    END as can_create,
    CASE
      WHEN am.module IS NULL THEN false
      ELSE public.has_permission(_user_id, am.module || '.edit') OR public.has_permission(_user_id, am.module || '.manage')
    END as can_edit,
    CASE
      WHEN am.module IS NULL THEN false
      ELSE public.has_permission(_user_id, am.module || '.delete')
    END as can_delete,
    (
       SELECT jsonb_agg(jsonb_build_object(
         'id', child.id,
         'label', child.label,
         'path', child.path,
         'icon', child.icon,
         'sort_order', child.sort_order,
         'module', child.module,
         'can_view', (CASE WHEN child.module IS NULL THEN true ELSE public.has_permission(_user_id, child.module || '.view') OR public.has_permission(_user_id, child.module || '.access') END),
         'can_create', (CASE WHEN child.module IS NULL THEN false ELSE public.has_permission(_user_id, child.module || '.create') END),
         'can_edit', (CASE WHEN child.module IS NULL THEN false ELSE public.has_permission(_user_id, child.module || '.edit') OR public.has_permission(_user_id, child.module || '.manage') END),
         'can_delete', (CASE WHEN child.module IS NULL THEN false ELSE public.has_permission(_user_id, child.module || '.delete') END)
       ) ORDER BY child.sort_order)
       FROM accessible_menus child
       WHERE child.parent_id = am.id
    ) as children
  FROM accessible_menus am
  WHERE am.parent_id IS NULL
  ORDER BY am.sort_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
