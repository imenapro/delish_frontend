-- Seed Data for RBAC System

-- 1. Insert Permissions
INSERT INTO public.permissions (code, description, module) VALUES
('pos.access', 'Access Point of Sale', 'pos'),
('shifts.view', 'View and manage shifts', 'shifts'),
('invoices.view', 'View and manage invoices', 'invoices'),
('shops.view', 'View and manage shops', 'shops'),
('products.view', 'View and manage products', 'products'),
('orders.view', 'View orders', 'orders'),
('kitchen.view', 'View kitchen orders', 'kitchen'),
('inventory.view', 'View and manage inventory', 'inventory'),
('finance.view', 'View financial data', 'finance'),
('workforce.view', 'Manage workforce', 'workforce'),
('reports.view', 'View reports', 'reports'),
('delivery.view', 'View delivery tasks', 'delivery'),
('staff.view', 'View and manage staff', 'staff'),
('admin.view', 'Access admin settings', 'admin'),
('chat.view', 'Access chat', 'chat'),
('wallet.view', 'Access wallet', 'wallet')
ON CONFLICT (code) DO NOTHING;

-- 2. Map Permissions to Roles
DO $$
DECLARE
  p_pos UUID; p_shifts UUID; p_invoices UUID; p_shops UUID; p_products UUID;
  p_orders UUID; p_kitchen UUID; p_inventory UUID; p_finance UUID; p_workforce UUID;
  p_reports UUID; p_delivery UUID; p_staff UUID; p_admin UUID; p_chat UUID; p_wallet UUID;
  
  r_admin UUID; r_seller UUID; r_manager UUID; r_owner UUID; r_super UUID;
  r_keeper UUID; r_accountant UUID; r_delivery UUID;
BEGIN
  -- Get Permissions
  SELECT id INTO p_pos FROM public.permissions WHERE code = 'pos.access';
  SELECT id INTO p_shifts FROM public.permissions WHERE code = 'shifts.view';
  SELECT id INTO p_invoices FROM public.permissions WHERE code = 'invoices.view';
  SELECT id INTO p_shops FROM public.permissions WHERE code = 'shops.view';
  SELECT id INTO p_products FROM public.permissions WHERE code = 'products.view';
  SELECT id INTO p_orders FROM public.permissions WHERE code = 'orders.view';
  SELECT id INTO p_kitchen FROM public.permissions WHERE code = 'kitchen.view';
  SELECT id INTO p_inventory FROM public.permissions WHERE code = 'inventory.view';
  SELECT id INTO p_finance FROM public.permissions WHERE code = 'finance.view';
  SELECT id INTO p_workforce FROM public.permissions WHERE code = 'workforce.view';
  SELECT id INTO p_reports FROM public.permissions WHERE code = 'reports.view';
  SELECT id INTO p_delivery FROM public.permissions WHERE code = 'delivery.view';
  SELECT id INTO p_staff FROM public.permissions WHERE code = 'staff.view';
  SELECT id INTO p_admin FROM public.permissions WHERE code = 'admin.view';
  SELECT id INTO p_chat FROM public.permissions WHERE code = 'chat.view';
  SELECT id INTO p_wallet FROM public.permissions WHERE code = 'wallet.view';

  -- Get Roles (using names from app_role enum)
  SELECT id INTO r_admin FROM public.roles WHERE name = 'admin';
  SELECT id INTO r_seller FROM public.roles WHERE name = 'seller';
  SELECT id INTO r_manager FROM public.roles WHERE name = 'branch_manager';
  SELECT id INTO r_owner FROM public.roles WHERE name = 'store_owner';
  SELECT id INTO r_super FROM public.roles WHERE name = 'super_admin';
  SELECT id INTO r_keeper FROM public.roles WHERE name = 'store_keeper';
  SELECT id INTO r_accountant FROM public.roles WHERE name = 'accountant';
  SELECT id INTO r_delivery FROM public.roles WHERE name = 'delivery';
  
  -- POS: seller, admin, branch_manager, store_owner, super_admin
  INSERT INTO public.role_permissions (role_id, permission_id) VALUES
  (r_seller, p_pos), (r_admin, p_pos), (r_manager, p_pos), (r_owner, p_pos), (r_super, p_pos)
  ON CONFLICT DO NOTHING;
  
  -- Shifts: admin, store_owner, branch_manager, seller, super_admin
  INSERT INTO public.role_permissions (role_id, permission_id) VALUES
  (r_admin, p_shifts), (r_owner, p_shifts), (r_manager, p_shifts), (r_seller, p_shifts), (r_super, p_shifts)
  ON CONFLICT DO NOTHING;

  -- Invoices: admin, store_owner, branch_manager, seller, super_admin
  INSERT INTO public.role_permissions (role_id, permission_id) VALUES
  (r_admin, p_invoices), (r_owner, p_invoices), (r_manager, p_invoices), (r_seller, p_invoices), (r_super, p_invoices)
  ON CONFLICT DO NOTHING;

  -- Shops: admin, store_owner, branch_manager, super_admin
  INSERT INTO public.role_permissions (role_id, permission_id) VALUES
  (r_admin, p_shops), (r_owner, p_shops), (r_manager, p_shops), (r_super, p_shops)
  ON CONFLICT DO NOTHING;

  -- Products: admin, branch_manager, store_owner, super_admin
  INSERT INTO public.role_permissions (role_id, permission_id) VALUES
  (r_admin, p_products), (r_manager, p_products), (r_owner, p_products), (r_super, p_products)
  ON CONFLICT DO NOTHING;
  
  -- Kitchen: admin, branch_manager, store_owner
  INSERT INTO public.role_permissions (role_id, permission_id) VALUES
  (r_admin, p_kitchen), (r_manager, p_kitchen), (r_owner, p_kitchen)
  ON CONFLICT DO NOTHING;

  -- Inventory: store_keeper, admin, branch_manager, store_owner
  INSERT INTO public.role_permissions (role_id, permission_id) VALUES
  (r_keeper, p_inventory), (r_admin, p_inventory), (r_manager, p_inventory), (r_owner, p_inventory)
  ON CONFLICT DO NOTHING;
  
  -- Finance: accountant, admin, store_owner
  INSERT INTO public.role_permissions (role_id, permission_id) VALUES
  (r_accountant, p_finance), (r_admin, p_finance), (r_owner, p_finance)
  ON CONFLICT DO NOTHING;
  
  -- Workforce: admin, branch_manager, store_owner
  INSERT INTO public.role_permissions (role_id, permission_id) VALUES
  (r_admin, p_workforce), (r_manager, p_workforce), (r_owner, p_workforce)
  ON CONFLICT DO NOTHING;

  -- Reports: accountant, admin, branch_manager, store_owner
  INSERT INTO public.role_permissions (role_id, permission_id) VALUES
  (r_accountant, p_reports), (r_admin, p_reports), (r_manager, p_reports), (r_owner, p_reports)
  ON CONFLICT DO NOTHING;

  -- Delivery: delivery, admin, store_owner
  INSERT INTO public.role_permissions (role_id, permission_id) VALUES
  (r_delivery, p_delivery), (r_admin, p_delivery), (r_owner, p_delivery)
  ON CONFLICT DO NOTHING;
  
  -- Staff: branch_manager, store_owner
  INSERT INTO public.role_permissions (role_id, permission_id) VALUES
  (r_manager, p_staff), (r_owner, p_staff)
  ON CONFLICT DO NOTHING;
  
  -- Admin: admin, store_owner
  INSERT INTO public.role_permissions (role_id, permission_id) VALUES
  (r_admin, p_admin), (r_owner, p_admin)
  ON CONFLICT DO NOTHING;
  
  -- Grant all to super_admin (ensure coverage)
  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT r_super, id FROM public.permissions
  ON CONFLICT DO NOTHING;
  
END $$;

-- 3. Insert Menus
INSERT INTO public.menus (label, path, icon, sort_order, permission_required_id) VALUES
('Dashboard', '/dashboard', 'LayoutDashboard', 10, NULL),
('POS', '/pos', 'CreditCard', 20, (SELECT id FROM public.permissions WHERE code = 'pos.access')),
('Shifts', '/shifts', 'ClipboardList', 30, (SELECT id FROM public.permissions WHERE code = 'shifts.view')),
('Invoices', '/invoices', 'Receipt', 40, (SELECT id FROM public.permissions WHERE code = 'invoices.view')),
('Shops', '/shops', 'Store', 50, (SELECT id FROM public.permissions WHERE code = 'shops.view')),
('Products', '/products', 'Package', 60, (SELECT id FROM public.permissions WHERE code = 'products.view')),
('Orders', '/orders', 'ShoppingCart', 70, NULL),
('Kitchen', '/kitchen', 'ChefHat', 80, (SELECT id FROM public.permissions WHERE code = 'kitchen.view')),
('Inventory', '/inventory', 'PackageOpen', 90, (SELECT id FROM public.permissions WHERE code = 'inventory.view')),
('Finance', '/finance', 'DollarSign', 100, (SELECT id FROM public.permissions WHERE code = 'finance.view')),
('Workforce', '/workforce', 'Calendar', 110, (SELECT id FROM public.permissions WHERE code = 'workforce.view')),
('Reports', '/reports', 'FileText', 120, (SELECT id FROM public.permissions WHERE code = 'reports.view')),
('Delivery', '/delivery', 'Truck', 130, (SELECT id FROM public.permissions WHERE code = 'delivery.view')),
('Staff', '/staff', 'Users', 140, (SELECT id FROM public.permissions WHERE code = 'staff.view')),
('Admin', '/admin', 'Shield', 150, (SELECT id FROM public.permissions WHERE code = 'admin.view')),
('Chat', '/chat', 'MessageSquare', 160, NULL),
('Wallet', '/wallet', 'Wallet', 170, NULL)
ON CONFLICT (path) DO NOTHING;
