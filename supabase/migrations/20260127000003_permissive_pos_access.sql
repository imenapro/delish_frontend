-- Enable permissive access to shops, products, and inventory for POS
-- This allows any authenticated user to view active shops, products, and inventory
-- This is a "nuclear option" requested by the user to unblock POS access

-- 1. Shops: Allow any authenticated user to view active shops
DROP POLICY IF EXISTS "Users can view accessible shops" ON public.shops;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.shops;

CREATE POLICY "Enable read access for all users"
ON public.shops
FOR SELECT
TO authenticated
USING (
  is_active = true
);

-- 2. Products: Allow any authenticated user to view active products
DROP POLICY IF EXISTS "Enable read access for all users" ON public.products;
-- Note: Check if there's an existing restrictive policy
-- Usually products are viewable by everyone, but let's be sure

CREATE POLICY "Enable read access for all users"
ON public.products
FOR SELECT
TO authenticated
USING (
  is_active = true
);

-- 3. Shop Inventory: Allow any authenticated user to view inventory
DROP POLICY IF EXISTS "Enable read access for all users" ON public.shop_inventory;

CREATE POLICY "Enable read access for all users"
ON public.shop_inventory
FOR SELECT
TO authenticated
USING (true);

-- 4. User Roles: Ensure users can see their own roles (already done, but reinforcing)
-- The previous migration 20260127000001_fix_auth_errors.sql handled user_roles and profiles
