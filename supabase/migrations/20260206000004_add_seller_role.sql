-- Fix RLS for shops to ensure store owners and sellers can see their shops
-- This includes the fix for "text = app_role" type mismatch by using explicit casting.

-- 1. Ensure 'seller' role exists in app_role enum
-- We use a DO block to safely handle the enum addition if it doesn't exist
DO $$
BEGIN
  ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'seller';
EXCEPTION
  WHEN OTHERS THEN NULL; -- Ignore if it fails (likely already exists or transaction issue)
END $$;

-- 2. Fix Shops RLS Policy
-- This ensures that anyone with an assigned shop_id (like sellers) can see that shop.
ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view accessible shops" ON public.shops;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.shops;
DROP POLICY IF EXISTS "access_policy" ON public.shops;

CREATE POLICY "Users can view accessible shops"
ON public.shops
FOR SELECT
USING (
  -- Super Admin sees all
  has_role(auth.uid(), 'super_admin')
  OR
  -- Admin sees all
  has_role(auth.uid(), 'admin')
  OR
  -- Store Owner sees shops of their business
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role::text = 'store_owner' -- Explicit cast to text prevents type mismatch errors
    OR ur.role::text = 'Owner' -- Also check Owner role
    AND ur.business_id = public.shops.business_id
  )
  OR
  -- Staff sees their assigned shop (Sellers, Store Keepers, etc.)
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.shop_id = public.shops.id
  )
);

-- 3. Ensure 'seller' role exists in RBAC system tables (public.roles)
INSERT INTO public.roles (name, description, is_system, business_id)
VALUES ('seller', 'Point of Sale Operator', true, NULL)
ON CONFLICT (name) WHERE business_id IS NULL DO NOTHING;

-- 4. Grant necessary permissions to 'seller' role
DO $$
DECLARE
  r_seller UUID;
  p_pos UUID;
  p_shifts UUID;
  p_invoices UUID;
  p_shops UUID;
  p_products UUID;
  p_orders UUID;
BEGIN
  -- Get Role ID
  SELECT id INTO r_seller FROM public.roles WHERE name = 'seller' AND business_id IS NULL;

  -- Ensure permissions exist
  INSERT INTO public.permissions (code, description, module) VALUES
  ('pos.access', 'Access Point of Sale', 'pos'),
  ('shops.view', 'View shops', 'shops'),
  ('products.view', 'View products', 'products'),
  ('orders.view', 'View orders', 'orders'),
  ('shifts.view', 'View shifts', 'shifts'),
  ('invoices.view', 'View invoices', 'invoices')
  ON CONFLICT (code) DO NOTHING;

  -- Get Permission IDs
  SELECT id INTO p_pos FROM public.permissions WHERE code = 'pos.access';
  SELECT id INTO p_shifts FROM public.permissions WHERE code = 'shifts.view';
  SELECT id INTO p_invoices FROM public.permissions WHERE code = 'invoices.view';
  SELECT id INTO p_shops FROM public.permissions WHERE code = 'shops.view';
  SELECT id INTO p_products FROM public.permissions WHERE code = 'products.view';
  SELECT id INTO p_orders FROM public.permissions WHERE code = 'orders.view';

  -- Assign Permissions to Seller Role
  IF r_seller IS NOT NULL THEN
    INSERT INTO public.role_permissions (role_id, permission_id)
    VALUES
      (r_seller, p_pos),
      (r_seller, p_shifts),
      (r_seller, p_invoices),
      (r_seller, p_shops),
      (r_seller, p_products),
      (r_seller, p_orders)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- 5. Update Products RLS to ensure sellers can view products
-- Note: 'products.view' permission above handles RBAC, but we also need RLS
DROP POLICY IF EXISTS "Users can view accessible products" ON public.products;
CREATE POLICY "Users can view accessible products"
ON public.products
FOR SELECT
USING (
  -- Super Admin
  has_role(auth.uid(), 'super_admin')
  OR
  -- Business Owner / Admin
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.business_id = public.products.business_id
    AND ur.role::text IN ('store_owner', 'Owner', 'admin', 'branch_manager')
  )
  OR
  -- Staff with assigned shop that belongs to the product's business
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.shops s ON ur.shop_id = s.id
    WHERE ur.user_id = auth.uid()
    AND s.business_id = public.products.business_id
  )
  OR
  -- Fallback: If product is active and user has permission (optional, but RLS is primary)
  (is_active = true AND public.has_permission(auth.uid(), 'products.view'))
);
