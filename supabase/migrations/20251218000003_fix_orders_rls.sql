
-- Fix RLS policy for orders to include store_owner
-- The previous policy (from migration 20251105000854) allows super_admin, admin, and branch_manager (via can_access_shop + role check in some places, but here it is can_access_shop)
-- can_access_shop checks if user has a role for that shop OR is super_admin.
-- But store_owner role might not be fully covered if can_access_shop relies on specific roles or if store_owner needs explicit access.
-- Let's make sure store_owner can see all orders.

-- Recreate policy for orders
DROP POLICY IF EXISTS "Users can view accessible orders" ON public.orders;

CREATE POLICY "Users can view accessible orders"
ON public.orders
FOR SELECT
USING (
  auth.uid() = customer_id
  OR auth.uid() = seller_id
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'store_owner'::app_role)
  OR can_access_shop(auth.uid(), shop_id_origin)
  OR can_access_shop(auth.uid(), shop_id_fulfill)
);

-- Also ensure 'store_owner' is in the app_role enum if not already (it seems it is from useAuth, but migration 20251101224129 didn't have it initially? 
-- Wait, migration 20251101224129 has 'admin', 'seller', 'manager', 'delivery', 'customer'. 
-- It seems 'store_owner' was added later or might be missing from the enum definition in DB vs Code.
-- Let's check if we need to add it to the enum.
-- If the enum doesn't have it, we can't use it in has_role cast.
-- But has_role function takes app_role.
-- Let's safely add it if missing.

ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'store_owner';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'branch_manager';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'store_keeper';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'accountant';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'manpower';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin';

