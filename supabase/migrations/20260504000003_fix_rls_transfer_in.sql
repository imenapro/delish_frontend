
-- Final attempt to fix RLS for inventory transactions, specifically handling transfers
-- This policy allows Production and Distributor roles to record transactions 
-- even when they involve a shop they don't directly manage (e.g. Distribution) 
-- as long as they are one side of the transfer.

-- 1. Drop existing policies to ensure a clean slate
DROP POLICY IF EXISTS "Store keepers can manage inventory" ON public.inventory_transactions;
DROP POLICY IF EXISTS "Inventory management for staff" ON public.inventory_transactions;
DROP POLICY IF EXISTS "Users can view their business inventory transactions" ON public.inventory_transactions;
DROP POLICY IF EXISTS "Staff can view inventory transactions" ON public.inventory_transactions;
DROP POLICY IF EXISTS "Staff can manage inventory transactions" ON public.inventory_transactions;

-- 2. Create the View Policy (Read)
CREATE POLICY "inventory_transactions_select_policy"
ON public.inventory_transactions
FOR SELECT
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND (
      ur.shop_id IS NULL 
      OR ur.shop_id = inventory_transactions.shop_id
      OR ur.shop_id = inventory_transactions.from_shop_id
      OR ur.shop_id = inventory_transactions.to_shop_id
    )
  )
);

-- 3. Create the Manage Policy (Insert/Update/Delete)
CREATE POLICY "inventory_transactions_all_policy"
ON public.inventory_transactions
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND (
      -- Roles authorized to manage inventory
      ur.role::text IN ('super_admin', 'admin', 'branch_manager', 'store_keeper', 'production', 'distributor', 'seller')
    )
    AND (
      -- Shop access: either business-wide (null) or user is involved in any side of the transaction
      ur.shop_id IS NULL 
      OR ur.shop_id = inventory_transactions.shop_id
      OR ur.shop_id = inventory_transactions.from_shop_id
      OR ur.shop_id = inventory_transactions.to_shop_id
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND (
      -- Roles authorized to manage inventory
      ur.role::text IN ('super_admin', 'admin', 'branch_manager', 'store_keeper', 'production', 'distributor', 'seller')
    )
    AND (
      -- Shop access: either business-wide (null) or user is involved in any side of the transaction
      ur.shop_id IS NULL 
      OR ur.shop_id = inventory_transactions.shop_id
      OR ur.shop_id = inventory_transactions.from_shop_id
      OR ur.shop_id = inventory_transactions.to_shop_id
    )
  )
);

-- 4. Apply similar logic to stock_transfers for consistency
DROP POLICY IF EXISTS "Branch managers and store keepers can manage transfers" ON public.stock_transfers;
DROP POLICY IF EXISTS "Transfer management for staff" ON public.stock_transfers;
DROP POLICY IF EXISTS "Staff can manage stock transfers" ON public.stock_transfers;

CREATE POLICY "stock_transfers_all_policy"
ON public.stock_transfers
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND (
      ur.role::text IN ('super_admin', 'admin', 'branch_manager', 'store_keeper', 'production', 'distributor', 'seller')
    )
    AND (
      ur.shop_id IS NULL 
      OR ur.shop_id = from_shop_id 
      OR ur.shop_id = to_shop_id
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND (
      ur.role::text IN ('super_admin', 'admin', 'branch_manager', 'store_keeper', 'production', 'distributor', 'seller')
    )
    AND (
      ur.shop_id IS NULL 
      OR ur.shop_id = from_shop_id 
      OR ur.shop_id = to_shop_id
    )
  )
);
