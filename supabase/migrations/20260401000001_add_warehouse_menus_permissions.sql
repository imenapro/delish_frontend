INSERT INTO public.permissions (code, description, module) VALUES
('warehouse.access', 'Access warehouse module', 'warehouse'),
('recipes.access', 'Access recipes module', 'warehouse'),
('production_stock.access', 'Access production stock module', 'warehouse'),
('finished_products.access', 'Access finished products module', 'warehouse'),
('suppliers.access', 'Access suppliers module', 'warehouse'),
('stock_reports.access', 'Access stock reports module', 'warehouse')
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.code IN (
  'warehouse.access',
  'recipes.access',
  'production_stock.access',
  'finished_products.access',
  'suppliers.access',
  'stock_reports.access'
)
WHERE r.name IN ('admin', 'manager', 'branch_manager', 'super_admin', 'warehouse_manager','owner')
ON CONFLICT DO NOTHING;

INSERT INTO public.menus (label, path, icon, sort_order, permission_required_id) VALUES
('Warehouse', '/warehouse', 'Factory', 180, (SELECT id FROM public.permissions WHERE code = 'warehouse.access')),
('Suppliers', '/suppliers', 'Users', 190, (SELECT id FROM public.permissions WHERE code = 'suppliers.access')),
('Recipes (BOM)', '/recipes', 'Utensils', 200, (SELECT id FROM public.permissions WHERE code = 'recipes.access')),
('Production', '/production-stock', 'ChefHat', 210, (SELECT id FROM public.permissions WHERE code = 'production_stock.access')),
('Finished Products', '/finished-products', 'Package', 220, (SELECT id FROM public.permissions WHERE code = 'finished_products.access')),
('Stock Reports', '/stock-reports', 'FileBarChart', 230, (SELECT id FROM public.permissions WHERE code = 'stock_reports.access'))
ON CONFLICT (path) DO NOTHING;

