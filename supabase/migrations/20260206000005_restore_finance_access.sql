-- Restore access for Sellers, Finance (Accountant), and Managers
-- This ensures that 'seller', 'accountant', and 'manager' roles can view shops, products, and orders.
-- Specifically addresses the issue where unassigned sellers (Finance) lost access.

-- 1. Grant permissions to 'accountant', 'manager' (and ensure 'seller' has them)
DO $$
DECLARE
  r_accountant UUID;
  r_manager UUID;
  r_seller UUID;
  p_pos UUID;
  p_shops UUID;
  p_products UUID;
  p_orders UUID;
  p_shifts UUID;
  p_invoices UUID;
BEGIN
  -- Get Role IDs
  SELECT id INTO r_accountant FROM public.roles WHERE name = 'accountant' AND business_id IS NULL;
  SELECT id INTO r_manager FROM public.roles WHERE name = 'manager' AND business_id IS NULL;
  SELECT id INTO r_seller FROM public.roles WHERE name = 'seller' AND business_id IS NULL;

  -- Get Permission IDs
  SELECT id INTO p_pos FROM public.permissions WHERE code = 'pos.access';
  SELECT id INTO p_shops FROM public.permissions WHERE code = 'shops.view';
  SELECT id INTO p_products FROM public.permissions WHERE code = 'products.view';
  SELECT id INTO p_orders FROM public.permissions WHERE code = 'orders.view';
  SELECT id INTO p_shifts FROM public.permissions WHERE code = 'shifts.view';
  SELECT id INTO p_invoices FROM public.permissions WHERE code = 'invoices.view';

  -- Assign Permissions to Accountant
  IF r_accountant IS NOT NULL THEN
    INSERT INTO public.role_permissions (role_id, permission_id)
    VALUES
      (r_accountant, p_pos),
      (r_accountant, p_shops),
      (r_accountant, p_products),
      (r_accountant, p_orders),
      (r_accountant, p_shifts),
      (r_accountant, p_invoices)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Assign Permissions to Manager
  IF r_manager IS NOT NULL THEN
    INSERT INTO public.role_permissions (role_id, permission_id)
    VALUES
      (r_manager, p_pos),
      (r_manager, p_shops),
      (r_manager, p_products),
      (r_manager, p_orders),
      (r_manager, p_shifts),
      (r_manager, p_invoices)
    ON CONFLICT DO NOTHING;
  END IF;
  
  -- Assign Permissions to Seller (Double check)
  IF r_seller IS NOT NULL THEN
    INSERT INTO public.role_permissions (role_id, permission_id)
    VALUES
      (r_seller, p_pos),
      (r_seller, p_shops),
      (r_seller, p_products),
      (r_seller, p_orders),
      (r_seller, p_shifts),
      (r_seller, p_invoices)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- 2. Update Shops RLS to include accountant, manager, and UNASSIGNED sellers
DROP POLICY IF EXISTS "Users can view accessible shops" ON public.shops;

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
  -- Store Owner, Accountant, Manager see shops of their business (or all if global)
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role::text IN ('store_owner', 'accountant', 'manager', 'branch_manager')
    AND (ur.business_id = public.shops.business_id OR ur.business_id IS NULL)
  )
  OR
  -- Seller visibility logic:
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role::text = 'seller'
    AND (
       -- 1. Assigned to this shop
       ur.shop_id = public.shops.id 
       OR 
       -- 2. Assigned to the business (sees all shops in business)
       ur.business_id = public.shops.business_id
       OR 
       -- 3. Unassigned/Global Seller (sees ALL shops - restores legacy access for Finance/Floating)
       (ur.shop_id IS NULL AND ur.business_id IS NULL)
    )
  )
);

-- 3. Update Products RLS
DROP POLICY IF EXISTS "Users can view accessible products" ON public.products;

CREATE POLICY "Users can view accessible products"
ON public.products
FOR SELECT
USING (
  -- Super Admin
  has_role(auth.uid(), 'super_admin')
  OR
  -- Business Owner / Admin / Accountant / Manager
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.business_id = public.products.business_id
    AND ur.role::text IN ('store_owner', 'admin', 'branch_manager', 'accountant', 'manager')
  )
  OR
  -- Seller (Assigned or Global)
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role::text = 'seller'
    AND (
       -- Assigned to a shop in this business
       EXISTS (SELECT 1 FROM public.shops s WHERE s.id = ur.shop_id AND s.business_id = public.products.business_id)
       OR
       -- Assigned to this business
       ur.business_id = public.products.business_id
       OR
       -- Global/Unassigned Seller (Sees all products)
       (ur.shop_id IS NULL AND ur.business_id IS NULL)
    )
  )
  OR
  -- Fallback
  (is_active = true AND public.has_permission(auth.uid(), 'products.view'))
);

-- 4. Update Orders RLS
DROP POLICY IF EXISTS "Users can view accessible orders" ON public.orders;

CREATE POLICY "Users can view accessible orders"
ON public.orders
FOR SELECT
USING (
  -- User is customer or seller
  auth.uid() = customer_id
  OR auth.uid() = seller_id
  OR
  -- Super Admin
  has_role(auth.uid(), 'super_admin')
  OR
  -- Business Level Roles (Owner, Admin, Accountant, Manager)
  EXISTS (
    SELECT 1 FROM public.shops s
    JOIN public.user_roles ur ON s.business_id = ur.business_id
    WHERE s.id = public.orders.shop_id_origin
    AND ur.user_id = auth.uid()
    AND ur.role::text IN ('store_owner', 'admin', 'accountant', 'manager', 'branch_manager')
  )
  OR
  -- Seller Access
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role::text = 'seller'
    AND (
       -- Assigned to the shop origin
       ur.shop_id = public.orders.shop_id_origin
       OR
       -- Assigned to business of shop origin
       EXISTS (SELECT 1 FROM public.shops s WHERE s.id = public.orders.shop_id_origin AND s.business_id = ur.business_id)
       OR
       -- Global/Unassigned Seller (Sees all orders)
       (ur.shop_id IS NULL AND ur.business_id IS NULL)
    )
  )
);
