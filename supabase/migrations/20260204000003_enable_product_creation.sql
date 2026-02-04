-- Migration to enable Product creation for Owner, Super Admin, and Admin

-- 1. Ensure permissions exist (idempotent)
INSERT INTO public.permissions (code, description, module) VALUES
  ('products.create', 'Create new products', 'products'),
  ('products.edit', 'Edit existing products', 'products'),
  ('products.delete', 'Delete products', 'products')
ON CONFLICT (code) DO NOTHING;

-- 2. Grant permissions to roles
DO $$
DECLARE
  r_owner UUID;
  r_admin UUID;
  r_super UUID;
  p_create UUID;
  p_edit UUID;
  p_delete UUID;
BEGIN
  -- Get Role IDs
  SELECT id INTO r_owner FROM public.roles WHERE name = 'store_owner' LIMIT 1;
  SELECT id INTO r_admin FROM public.roles WHERE name = 'admin' LIMIT 1;
  SELECT id INTO r_super FROM public.roles WHERE name = 'super_admin' LIMIT 1;

  -- Get Permission IDs
  SELECT id INTO p_create FROM public.permissions WHERE code = 'products.create';
  SELECT id INTO p_edit FROM public.permissions WHERE code = 'products.edit';
  SELECT id INTO p_delete FROM public.permissions WHERE code = 'products.delete';

  -- Grant to Store Owner
  IF r_owner IS NOT NULL THEN
    INSERT INTO public.role_permissions (role_id, permission_id) VALUES 
      (r_owner, p_create), (r_owner, p_edit), (r_owner, p_delete)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Grant to Admin
  IF r_admin IS NOT NULL THEN
    INSERT INTO public.role_permissions (role_id, permission_id) VALUES 
      (r_admin, p_create), (r_admin, p_edit), (r_admin, p_delete)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Grant to Super Admin
  IF r_super IS NOT NULL THEN
    INSERT INTO public.role_permissions (role_id, permission_id) VALUES 
      (r_super, p_create), (r_super, p_edit), (r_super, p_delete)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- 3. Update RLS Policies on products table
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.products;
DROP POLICY IF EXISTS "Users can create products" ON public.products;
DROP POLICY IF EXISTS "Store owners and admins can create products" ON public.products;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.products;
DROP POLICY IF EXISTS "Users can update products" ON public.products;
DROP POLICY IF EXISTS "Store owners and admins can update products" ON public.products;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.products;
DROP POLICY IF EXISTS "Store owners and admins can delete products" ON public.products;

-- Create INSERT Policy
CREATE POLICY "Store owners and admins can create products"
ON public.products
FOR INSERT
WITH CHECK (
  -- 1. Super Admin (Global) - via user_roles
  (EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() 
    AND ur.role::text = 'super_admin'
  ))
  OR
  -- 2. Owner or Admin for the specific business - via user_roles
  (EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() 
    AND ur.business_id = products.business_id
    AND ur.role::text IN ('store_owner', 'admin')
  ))
  OR
  -- 3. New RBAC system (user_role_assignments)
  (EXISTS (
    SELECT 1 FROM public.user_role_assignments ura
    JOIN public.roles r ON ura.role_id = r.id
    WHERE ura.user_id = auth.uid()
    AND (
      r.name = 'super_admin'
      OR (r.name IN ('store_owner', 'admin') AND (r.business_id IS NULL OR r.business_id = products.business_id))
    )
  ))
);

-- Create UPDATE Policy
CREATE POLICY "Store owners and admins can update products"
ON public.products
FOR UPDATE
USING (
  -- 1. Super Admin (Global) - via user_roles
  (EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() 
    AND ur.role::text = 'super_admin'
  ))
  OR
  -- 2. Owner or Admin for the specific business - via user_roles
  (EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() 
    AND ur.business_id = products.business_id
    AND ur.role::text IN ('store_owner', 'admin')
  ))
  OR
  -- 3. New RBAC system (user_role_assignments)
  (EXISTS (
    SELECT 1 FROM public.user_role_assignments ura
    JOIN public.roles r ON ura.role_id = r.id
    WHERE ura.user_id = auth.uid()
    AND (
      r.name = 'super_admin'
      OR (r.name IN ('store_owner', 'admin') AND (r.business_id IS NULL OR r.business_id = products.business_id))
    )
  ))
);

-- Create DELETE Policy
CREATE POLICY "Store owners and admins can delete products"
ON public.products
FOR DELETE
USING (
  -- 1. Super Admin (Global) - via user_roles
  (EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() 
    AND ur.role::text = 'super_admin'
  ))
  OR
  -- 2. Owner or Admin for the specific business - via user_roles
  (EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() 
    AND ur.business_id = products.business_id
    AND ur.role::text IN ('store_owner', 'admin')
  ))
  OR
  -- 3. New RBAC system (user_role_assignments)
  (EXISTS (
    SELECT 1 FROM public.user_role_assignments ura
    JOIN public.roles r ON ura.role_id = r.id
    WHERE ura.user_id = auth.uid()
    AND (
      r.name = 'super_admin'
      OR (r.name IN ('store_owner', 'admin') AND (r.business_id IS NULL OR r.business_id = products.business_id))
    )
  ))
);
