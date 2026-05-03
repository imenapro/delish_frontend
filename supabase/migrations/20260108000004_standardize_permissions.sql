-- Ensure all modules have standard CRUD permissions

INSERT INTO public.permissions (code, description, module) VALUES
  -- Standardizing existing and missing permissions for all modules
  ('pos.view', 'View POS', 'pos'),
  ('pos.create', 'Create POS transactions', 'pos'),
  ('pos.edit', 'Edit POS transactions', 'pos'),
  ('pos.delete', 'Delete POS transactions', 'pos'),

  ('shifts.create', 'Create shifts', 'shifts'),
  ('shifts.edit', 'Edit shifts', 'shifts'),
  ('shifts.delete', 'Delete shifts', 'shifts'),

  ('invoices.create', 'Create invoices', 'invoices'),
  ('invoices.edit', 'Edit invoices', 'invoices'),
  ('invoices.delete', 'Delete invoices', 'invoices'),

  ('shops.create', 'Create shops', 'shops'),
  ('shops.edit', 'Edit shops', 'shops'),
  ('shops.delete', 'Delete shops', 'shops'),

  ('kitchen.create', 'Create kitchen orders', 'kitchen'),
  ('kitchen.edit', 'Edit kitchen orders', 'kitchen'),
  ('kitchen.delete', 'Delete kitchen orders', 'kitchen'),

  ('workforce.create', 'Manage workforce assignments', 'workforce'),
  ('workforce.edit', 'Edit workforce data', 'workforce'),
  ('workforce.delete', 'Delete workforce data', 'workforce'),

  ('reports.create', 'Generate custom reports', 'reports'),
  ('reports.edit', 'Modify report settings', 'reports'),
  ('reports.delete', 'Delete reports', 'reports'),

  ('delivery.create', 'Create delivery tasks', 'delivery'),
  ('delivery.edit', 'Edit delivery tasks', 'delivery'),
  ('delivery.delete', 'Delete delivery tasks', 'delivery'),

  ('chat.create', 'Send messages', 'chat'),
  ('chat.edit', 'Edit messages', 'chat'),
  ('chat.delete', 'Delete messages', 'chat'),

  ('wallet.create', 'Initiate wallet transactions', 'wallet'),
  ('wallet.edit', 'Manage wallet settings', 'wallet'),
  ('wallet.delete', 'Delete wallet records', 'wallet'),

  ('dashboard.create', 'Configure dashboard widgets', 'dashboard'),
  ('dashboard.edit', 'Edit dashboard settings', 'dashboard'),
  ('dashboard.delete', 'Reset dashboard settings', 'dashboard')
ON CONFLICT (code) DO NOTHING;
