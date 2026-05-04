
-- Update RLS policies for inventory_transactions to include production and distributor roles
-- This allows these roles to perform stock-in and stock-out operations

DROP POLICY IF EXISTS "Store keepers can manage inventory" ON public.inventory_transactions;

CREATE POLICY "Inventory management for staff"
ON public.inventory_transactions
FOR ALL
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR (
    -- Allow if user can access the primary shop_id and has an appropriate role
    can_access_shop(auth.uid(), shop_id) AND (
      has_role(auth.uid(), 'branch_manager'::app_role)
      OR has_role(auth.uid(), 'store_keeper'::app_role)
      OR has_role(auth.uid(), 'production'::app_role)
      OR has_role(auth.uid(), 'distributor'::app_role)
    )
  )
  OR (
    -- Allow transfers: user can access from_shop_id for 'out' transactions
    transaction_type = 'out' AND can_access_shop(auth.uid(), from_shop_id) AND (
      has_role(auth.uid(), 'branch_manager'::app_role)
      OR has_role(auth.uid(), 'store_keeper'::app_role)
      OR has_role(auth.uid(), 'production'::app_role)
      OR has_role(auth.uid(), 'distributor'::app_role)
    )
  )
  OR (
    -- Allow transfers: user can access to_shop_id for 'in' transactions
    transaction_type = 'in' AND can_access_shop(auth.uid(), to_shop_id) AND (
      has_role(auth.uid(), 'branch_manager'::app_role)
      OR has_role(auth.uid(), 'store_keeper'::app_role)
      OR has_role(auth.uid(), 'production'::app_role)
      OR has_role(auth.uid(), 'distributor'::app_role)
    )
  )
)
WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR (
    -- Allow if user can access the primary shop_id and has an appropriate role
    can_access_shop(auth.uid(), shop_id) AND (
      has_role(auth.uid(), 'branch_manager'::app_role)
      OR has_role(auth.uid(), 'store_keeper'::app_role)
      OR has_role(auth.uid(), 'production'::app_role)
      OR has_role(auth.uid(), 'distributor'::app_role)
    )
  )
  OR (
    -- Allow transfers: user can access from_shop_id for 'out' transactions
    transaction_type = 'out' AND can_access_shop(auth.uid(), from_shop_id) AND (
      has_role(auth.uid(), 'branch_manager'::app_role)
      OR has_role(auth.uid(), 'store_keeper'::app_role)
      OR has_role(auth.uid(), 'production'::app_role)
      OR has_role(auth.uid(), 'distributor'::app_role)
    )
  )
  OR (
    -- Allow transfers: user can access to_shop_id for 'in' transactions
    transaction_type = 'in' AND can_access_shop(auth.uid(), to_shop_id) AND (
      has_role(auth.uid(), 'branch_manager'::app_role)
      OR has_role(auth.uid(), 'store_keeper'::app_role)
      OR has_role(auth.uid(), 'production'::app_role)
      OR has_role(auth.uid(), 'distributor'::app_role)
    )
  )
);

-- Update RLS policies for stock_transfers to include production and distributor roles
DROP POLICY IF EXISTS "Branch managers and store keepers can manage transfers" ON public.stock_transfers;

CREATE POLICY "Transfer management for staff"
ON public.stock_transfers
FOR ALL
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR ((can_access_shop(auth.uid(), from_shop_id) OR can_access_shop(auth.uid(), to_shop_id)) AND (
    has_role(auth.uid(), 'branch_manager'::app_role)
    OR has_role(auth.uid(), 'store_keeper'::app_role)
    OR has_role(auth.uid(), 'production'::app_role)
    OR has_role(auth.uid(), 'distributor'::app_role)
  ))
)
WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR ((can_access_shop(auth.uid(), from_shop_id) OR can_access_shop(auth.uid(), to_shop_id)) AND (
    has_role(auth.uid(), 'branch_manager'::app_role)
    OR has_role(auth.uid(), 'store_keeper'::app_role)
    OR has_role(auth.uid(), 'production'::app_role)
    OR has_role(auth.uid(), 'distributor'::app_role)
  ))
);
