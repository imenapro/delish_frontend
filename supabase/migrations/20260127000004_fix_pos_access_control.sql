-- Secure access to shops, products, inventory, and businesses
-- Reverts the "permissive" access and implements strict multi-tenant isolation
-- Ensures users can only see data for their assigned business and shops

-- 1. Shops: Strict Access Control
DROP POLICY IF EXISTS "Enable read access for all users" ON public.shops;
DROP POLICY IF EXISTS "Users can view accessible shops" ON public.shops;

CREATE POLICY "Users can view accessible shops"
ON public.shops
FOR SELECT
USING (
  -- 1. Super Admin (System-wide)
  has_role(auth.uid(), 'super_admin')
  OR
  -- 2. Business Admin/Owner/Manager (Business-wide access)
  -- User has a role for this business that allows seeing all shops
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.business_id = shops.business_id
    AND ur.role IN ('admin', 'store_owner', 'Owner', 'branch_manager', 'accountant')
  )
  OR
  -- 3. Assigned Staff (Shop-specific access)
  -- User is explicitly assigned to this shop (e.g., Seller, Store Keeper)
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.shop_id = shops.id
  )
);

-- 2. Products: Business Isolation
DROP POLICY IF EXISTS "Enable read access for all users" ON public.products;
DROP POLICY IF EXISTS "Users can view business products" ON public.products;

CREATE POLICY "Users can view business products"
ON public.products
FOR SELECT
USING (
  -- 1. Super Admin
  has_role(auth.uid(), 'super_admin')
  OR
  -- 2. User belongs to the business of the product
  -- Any staff member of the business can view the product list (menu)
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.business_id = products.business_id
  )
);

-- 3. Shop Inventory: Inherit Shop Access
DROP POLICY IF EXISTS "Enable read access for all users" ON public.shop_inventory;
DROP POLICY IF EXISTS "Users can view accessible inventory" ON public.shop_inventory;

CREATE POLICY "Users can view accessible inventory"
ON public.shop_inventory
FOR SELECT
USING (
  -- Access is allowed if the user can see the shop this inventory belongs to.
  -- This leverages the "Users can view accessible shops" policy above.
  shop_id IN (SELECT id FROM public.shops)
);

-- 4. Businesses: Self-Isolation
-- Users should only see their own business details
DROP POLICY IF EXISTS "Users can view own business" ON public.businesses;

CREATE POLICY "Users can view own business"
ON public.businesses
FOR SELECT
USING (
  -- 1. Super Admin
  has_role(auth.uid(), 'super_admin')
  OR
  -- 2. User belongs to the business
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.business_id = businesses.id
  )
);
