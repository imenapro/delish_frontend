-- Restrict menu visibility to only explicitly permissioned items.
-- This prevents menu items with a NULL permission_required_id from being exposed to all users.

CREATE OR REPLACE FUNCTION public.get_user_menus(_user_id UUID)
RETURNS TABLE (
  id UUID,
  label TEXT,
  path TEXT,
  icon TEXT,
  parent_id UUID,
  sort_order INTEGER,
  children JSONB
) AS $$
BEGIN
  RETURN QUERY
  WITH accessible_menus AS (
    SELECT m.*
    FROM public.menus m
    LEFT JOIN public.permissions p ON m.permission_required_id = p.id
    WHERE m.is_active = true
      AND m.permission_required_id IS NOT NULL
      AND public.has_permission(_user_id, p.code)
  )
  SELECT 
    am.id,
    am.label,
    am.path,
    am.icon,
    am.parent_id,
    am.sort_order,
    (
       SELECT jsonb_agg(jsonb_build_object(
         'id', child.id,
         'label', child.label,
         'path', child.path,
         'icon', child.icon,
         'sort_order', child.sort_order
       ) ORDER BY child.sort_order)
       FROM accessible_menus child
       WHERE child.parent_id = am.id
    ) as children
  FROM accessible_menus am
  WHERE am.parent_id IS NULL
  ORDER BY am.sort_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
