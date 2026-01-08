-- Migration to add granular permissions (Create, Update, Delete) for key modules

-- Insert new permissions
INSERT INTO public.permissions (code, description, module) VALUES
  -- Staff Management
  ('staff.create', 'Create new staff members', 'staff'),
  ('staff.edit', 'Edit existing staff members', 'staff'),
  ('staff.delete', 'Remove staff members', 'staff'),
  
  -- Product Management
  ('products.create', 'Create new products', 'products'),
  ('products.edit', 'Edit existing products', 'products'),
  ('products.delete', 'Delete products', 'products'),
  
  -- Order Management
  ('orders.create', 'Create new orders', 'orders'),
  ('orders.edit', 'Modify existing orders', 'orders'),
  ('orders.delete', 'Cancel/Delete orders', 'orders'),
  
  -- Inventory Management
  ('inventory.manage', 'Manage inventory levels and settings', 'inventory'),
  
  -- Shift Management
  ('shifts.manage', 'Create and manage shifts', 'shifts'),
  
  -- Finance Management
  ('finance.manage', 'Manage financial records', 'finance')
ON CONFLICT (code) DO NOTHING;

-- Grant these new permissions to 'super_admin' and 'branch_manager' roles to maintain access
DO $$
DECLARE
  super_admin_id uuid;
  branch_manager_id uuid;
  perm_id uuid;
  perm_code text;
  permissions text[] := ARRAY[
    'staff.create', 'staff.edit', 'staff.delete',
    'products.create', 'products.edit', 'products.delete',
    'orders.create', 'orders.edit', 'orders.delete',
    'inventory.manage', 'shifts.manage', 'finance.manage'
  ];
BEGIN
  -- Get Role IDs
  SELECT id INTO super_admin_id FROM public.roles WHERE name = 'super_admin';
  SELECT id INTO branch_manager_id FROM public.roles WHERE name = 'branch_manager';

  -- Assign permissions
  FOREACH perm_code IN ARRAY permissions
  LOOP
    SELECT id INTO perm_id FROM public.permissions WHERE code = perm_code;
    
    IF perm_id IS NOT NULL THEN
      -- Grant to super_admin
      IF super_admin_id IS NOT NULL THEN
        INSERT INTO public.role_permissions (role_id, permission_id)
        VALUES (super_admin_id, perm_id)
        ON CONFLICT DO NOTHING;
      END IF;
      
      -- Grant to branch_manager
      IF branch_manager_id IS NOT NULL THEN
        INSERT INTO public.role_permissions (role_id, permission_id)
        VALUES (branch_manager_id, perm_id)
        ON CONFLICT DO NOTHING;
      END IF;
    END IF;
  END LOOP;
END $$;
