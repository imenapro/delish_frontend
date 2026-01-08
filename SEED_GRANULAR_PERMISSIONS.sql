
-- Insert standard granular permissions for all key modules
-- This ensures that for each module we have View, Create, Edit, Delete capabilities

INSERT INTO public.permissions (code, description, module)
VALUES
  -- Roles
  ('roles.view', 'View roles and permissions', 'roles'),
  ('roles.create', 'Create new roles', 'roles'),
  ('roles.edit', 'Edit existing roles', 'roles'),
  ('roles.delete', 'Delete roles', 'roles'),
  
  -- Staff
  ('staff.view', 'View staff list and details', 'staff'),
  ('staff.create', 'Invite or add new staff members', 'staff'),
  ('staff.edit', 'Edit staff details and assignments', 'staff'),
  ('staff.delete', 'Remove staff members', 'staff'),

  -- Orders
  ('orders.view', 'View orders and history', 'orders'),
  ('orders.create', 'Create new orders', 'orders'),
  ('orders.edit', 'Edit or update existing orders', 'orders'),
  ('orders.delete', 'Delete or cancel orders', 'orders'),

  -- Products
  ('products.view', 'View product list', 'products'),
  ('products.create', 'Add new products', 'products'),
  ('products.edit', 'Edit product details', 'products'),
  ('products.delete', 'Delete products', 'products'),

  -- Inventory
  ('inventory.view', 'View inventory levels', 'inventory'),
  ('inventory.create', 'Add stock items', 'inventory'),
  ('inventory.edit', 'Adjust stock levels', 'inventory'),
  ('inventory.delete', 'Remove inventory items', 'inventory'),

  -- Shops
  ('shops.view', 'View shop details', 'shops'),
  ('shops.create', 'Create new shops', 'shops'),
  ('shops.edit', 'Edit shop configurations', 'shops'),
  ('shops.delete', 'Delete shops', 'shops'),

  -- Finance
  ('finance.view', 'View financial records and dashboards', 'finance'),
  ('finance.create', 'Record transactions', 'finance'),
  ('finance.edit', 'Edit financial records', 'finance'),
  ('finance.delete', 'Delete financial records', 'finance'),

  -- Audit
  ('audit.view', 'View audit logs', 'audit'),
  
  -- Menus
  ('menus.view', 'View menu configurations', 'menus'),
  ('menus.create', 'Create menu items', 'menus'),
  ('menus.edit', 'Edit menu items', 'menus'),
  ('menus.delete', 'Delete menu items', 'menus')

ON CONFLICT (code) DO UPDATE 
SET description = EXCLUDED.description,
    module = EXCLUDED.module;
