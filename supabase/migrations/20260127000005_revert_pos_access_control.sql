-- Revert "Strict Access Control" and enable permissive access for POS
-- Allows all authenticated users to view shops, products, inventory, and businesses by default
-- This implements the "allow POS to everyone by default" request

-- 1. Shops: Permissive Access
DROP POLICY IF EXISTS "Users can view accessible shops" ON public.shops;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.shops;

CREATE POLICY "Enable read access for all users"
ON public.shops
FOR SELECT
TO authenticated
USING (true);

-- 2. Products: Permissive Access
DROP POLICY IF EXISTS "Users can view business products" ON public.products;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.products;

CREATE POLICY "Enable read access for all users"
ON public.products
FOR SELECT
TO authenticated
USING (true);

-- 3. Shop Inventory: Permissive Access
DROP POLICY IF EXISTS "Users can view accessible inventory" ON public.shop_inventory;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.shop_inventory;

CREATE POLICY "Enable read access for all users"
ON public.shop_inventory
FOR SELECT
TO authenticated
USING (true);

-- 4. Businesses: Permissive Access
DROP POLICY IF EXISTS "Users can view own business" ON public.businesses;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.businesses;

CREATE POLICY "Enable read access for all users"
ON public.businesses
FOR SELECT
TO authenticated
USING (true);
