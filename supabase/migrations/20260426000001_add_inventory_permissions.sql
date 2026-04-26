-- Add inventory permissions and update RLS policies for shop_inventory and stock_transfers
-- This migration adds granular inventory permissions and restricts sellers to their assigned shop

-- 1. Add inventory permissions
INSERT INTO public.permissions (code, description, module) VALUES
  ('inventory.view', 'View inventory for assigned shop', 'inventory'),
  ('inventory.edit', 'Edit inventory records', 'inventory'),
  ('inventory.delete', 'Delete inventory records', 'inventory'),
  ('inventory.transfer', 'Request stock transfers', 'inventory'),
  ('inventory.accept_transfer', 'Accept or reject stock transfers to own shop', 'inventory')
ON CONFLICT (code) DO NOTHING;

-- 2. Update shop_inventory RLS policies to use permission-based checks and restrict sellers to their assigned shop

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view inventory for their assigned shop" ON public.shop_inventory;
DROP POLICY IF EXISTS "Managers and admins can manage inventory" ON public.shop_inventory;
DROP POLICY IF EXISTS "Users can manage inventory for their assigned shop" ON public.shop_inventory;

-- Create new SELECT policy - sellers can only view their assigned shop's inventory
CREATE POLICY "Users can view inventory for their assigned shop" ON public.shop_inventory
  FOR SELECT USING (
    -- Permission-based: users with inventory.view can see their assigned shop's inventory
    (public.has_permission(auth.uid(), 'inventory.view') AND 
     shop_id IN (SELECT shop_id FROM public.user_roles WHERE user_id = auth.uid() AND shop_id IS NOT NULL))
    OR
    -- Admin roles can see all inventory
    public.has_role(auth.uid(), 'admin'::app_role) OR
    public.has_role(auth.uid(), 'super_admin'::app_role) OR
    public.has_role(auth.uid(), 'Owner'::app_role) OR
    public.has_role(auth.uid(), 'store_owner'::app_role) OR
    public.has_role(auth.uid(), 'manager'::app_role) OR
    public.has_role(auth.uid(), 'branch_manager'::app_role) OR
    public.has_role(auth.uid(), 'store_keeper'::app_role)
  );

-- Create new ALL policy (INSERT, UPDATE, DELETE) - requires inventory.edit for assigned shop
CREATE POLICY "Users can manage inventory for their assigned shop" ON public.shop_inventory
  FOR ALL
  USING (
    -- Permission-based: users with inventory.edit can manage their assigned shop's inventory
    (public.has_permission(auth.uid(), 'inventory.edit') AND 
     shop_id IN (SELECT shop_id FROM public.user_roles WHERE user_id = auth.uid() AND shop_id IS NOT NULL))
    OR
    -- Admin roles can manage all inventory
    public.has_role(auth.uid(), 'admin'::app_role) OR
    public.has_role(auth.uid(), 'super_admin'::app_role) OR
    public.has_role(auth.uid(), 'Owner'::app_role) OR
    public.has_role(auth.uid(), 'store_owner'::app_role) OR
    public.has_role(auth.uid(), 'manager'::app_role) OR
    public.has_role(auth.uid(), 'branch_manager'::app_role) OR
    public.has_role(auth.uid(), 'store_keeper'::app_role)
  )
  WITH CHECK (
    -- Permission-based: users with inventory.edit can manage their assigned shop's inventory
    (public.has_permission(auth.uid(), 'inventory.edit') AND 
     shop_id IN (SELECT shop_id FROM public.user_roles WHERE user_id = auth.uid() AND shop_id IS NOT NULL))
    OR
    -- Admin roles can manage all inventory
    public.has_role(auth.uid(), 'admin'::app_role) OR
    public.has_role(auth.uid(), 'super_admin'::app_role) OR
    public.has_role(auth.uid(), 'Owner'::app_role) OR
    public.has_role(auth.uid(), 'store_owner'::app_role) OR
    public.has_role(auth.uid(), 'manager'::app_role) OR
    public.has_role(auth.uid(), 'branch_manager'::app_role) OR
    public.has_role(auth.uid(), 'store_keeper'::app_role)
  );

-- 3. Update stock_transfers RLS policies to allow sellers to accept/reject transfers to their shop

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view transfers for their shops" ON public.stock_transfers;
DROP POLICY IF EXISTS "Branch managers and store keepers can manage transfers" ON public.stock_transfers;

-- Create new SELECT policy - users can view transfers involving their assigned shop
CREATE POLICY "Users can view transfers for their assigned shop" ON public.stock_transfers
  FOR SELECT USING (
    -- Permission-based: users with inventory.view can see transfers for their assigned shop
    (public.has_permission(auth.uid(), 'inventory.view') AND 
     (to_shop_id IN (SELECT shop_id FROM public.user_roles WHERE user_id = auth.uid() AND shop_id IS NOT NULL) OR
      from_shop_id IN (SELECT shop_id FROM public.user_roles WHERE user_id = auth.uid() AND shop_id IS NOT NULL)))
    OR
    -- Admin roles can see all transfers
    public.has_role(auth.uid(), 'admin'::app_role) OR
    public.has_role(auth.uid(), 'super_admin'::app_role) OR
    public.has_role(auth.uid(), 'Owner'::app_role) OR
    public.has_role(auth.uid(), 'store_owner'::app_role) OR
    public.has_role(auth.uid(), 'manager'::app_role) OR
    public.has_role(auth.uid(), 'branch_manager'::app_role) OR
    public.has_role(auth.uid(), 'store_keeper'::app_role)
  );

-- Create new INSERT policy - requires inventory.transfer for assigned shop
CREATE POLICY "Users can create transfers from their assigned shop" ON public.stock_transfers
  FOR INSERT
  WITH CHECK (
    -- Permission-based: users with inventory.transfer can create transfers from their assigned shop
    (public.has_permission(auth.uid(), 'inventory.transfer') AND 
     from_shop_id IN (SELECT shop_id FROM public.user_roles WHERE user_id = auth.uid() AND shop_id IS NOT NULL))
    OR
    -- Admin roles can create any transfers
    public.has_role(auth.uid(), 'admin'::app_role) OR
    public.has_role(auth.uid(), 'super_admin'::app_role) OR
    public.has_role(auth.uid(), 'Owner'::app_role) OR
    public.has_role(auth.uid(), 'store_owner'::app_role) OR
    public.has_role(auth.uid(), 'manager'::app_role) OR
    public.has_role(auth.uid(), 'branch_manager'::app_role) OR
    public.has_role(auth.uid(), 'store_keeper'::app_role)
  );

-- Create new UPDATE policy - allows sellers to accept/reject transfers to their shop
CREATE POLICY "Users can accept transfers to their assigned shop" ON public.stock_transfers
  FOR UPDATE
  USING (
    -- Permission-based: users with inventory.accept_transfer can accept/reject transfers to their assigned shop
    (public.has_permission(auth.uid(), 'inventory.accept_transfer') AND 
     to_shop_id IN (SELECT shop_id FROM public.user_roles WHERE user_id = auth.uid() AND shop_id IS NOT NULL))
    OR
    -- Admin roles can manage all transfers
    public.has_role(auth.uid(), 'admin'::app_role) OR
    public.has_role(auth.uid(), 'super_admin'::app_role) OR
    public.has_role(auth.uid(), 'Owner'::app_role) OR
    public.has_role(auth.uid(), 'store_owner'::app_role) OR
    public.has_role(auth.uid(), 'manager'::app_role) OR
    public.has_role(auth.uid(), 'branch_manager'::app_role) OR
    public.has_role(auth.uid(), 'store_keeper'::app_role)
  )
  WITH CHECK (
    -- Permission-based: users with inventory.accept_transfer can accept/reject transfers to their assigned shop
    (public.has_permission(auth.uid(), 'inventory.accept_transfer') AND 
     to_shop_id IN (SELECT shop_id FROM public.user_roles WHERE user_id = auth.uid() AND shop_id IS NOT NULL))
    OR
    -- Admin roles can manage all transfers
    public.has_role(auth.uid(), 'admin'::app_role) OR
    public.has_role(auth.uid(), 'super_admin'::app_role) OR
    public.has_role(auth.uid(), 'Owner'::app_role) OR
    public.has_role(auth.uid(), 'store_owner'::app_role) OR
    public.has_role(auth.uid(), 'manager'::app_role) OR
    public.has_role(auth.uid(), 'branch_manager'::app_role) OR
    public.has_role(auth.uid(), 'store_keeper'::app_role)
  );

-- 4. Grant inventory permissions to appropriate roles
-- Store keepers get full inventory access
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'store_keeper'
AND p.code IN ('inventory.view', 'inventory.edit', 'inventory.transfer', 'inventory.accept_transfer')
ON CONFLICT DO NOTHING;

-- Branch managers get full inventory access
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'branch_manager'
AND p.code IN ('inventory.view', 'inventory.edit', 'inventory.transfer', 'inventory.accept_transfer', 'inventory.delete')
ON CONFLICT DO NOTHING;

-- Sellers get view and accept_transfer permissions for their shop
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'seller'
AND p.code IN ('inventory.view', 'inventory.accept_transfer')
ON CONFLICT DO NOTHING;
