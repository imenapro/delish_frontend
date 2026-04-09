INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p
  ON p.code IN (
    'warehouse.access',
    'recipes.access',
    'production_stock.access',
    'finished_products.access',
    'suppliers.access',
    'stock_reports.access'
  )
WHERE r.name = 'store_owner'
ON CONFLICT DO NOTHING;

