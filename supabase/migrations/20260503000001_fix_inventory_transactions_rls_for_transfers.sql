-- Fix RLS policies for inventory_transactions to allow stock transfers
-- The existing policies were too restrictive for transfer operations

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view inventory for their shops" ON public.inventory_transactions;
DROP POLICY IF EXISTS "Store keepers can manage inventory" ON public.inventory_transactions;

-- Recreate policies with proper transfer support
CREATE POLICY "Users can view inventory for their shops"
ON public.inventory_transactions
FOR SELECT
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR can_access_shop(auth.uid(), shop_id)
  OR can_access_shop(auth.uid(), from_shop_id)
  OR can_access_shop(auth.uid(), to_shop_id)
);

CREATE POLICY "Store keepers can manage inventory"
ON public.inventory_transactions
FOR ALL
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR (
    -- Allow if user can access the primary shop_id
    can_access_shop(auth.uid(), shop_id) AND (
      has_role(auth.uid(), 'branch_manager'::app_role)
      OR has_role(auth.uid(), 'store_keeper'::app_role)
    )
  )
  OR (
    -- Allow transfers: user can access from_shop_id for 'out' transactions
    transaction_type = 'out' AND can_access_shop(auth.uid(), from_shop_id) AND (
      has_role(auth.uid(), 'branch_manager'::app_role)
      OR has_role(auth.uid(), 'store_keeper'::app_role)
    )
  )
  OR (
    -- Allow transfers: user can access to_shop_id for 'in' transactions
    transaction_type = 'in' AND can_access_shop(auth.uid(), to_shop_id) AND (
      has_role(auth.uid(), 'branch_manager'::app_role)
      OR has_role(auth.uid(), 'store_keeper'::app_role)
    )
  )
)
WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR (
    -- Allow if user can access the primary shop_id
    can_access_shop(auth.uid(), shop_id) AND (
      has_role(auth.uid(), 'branch_manager'::app_role)
      OR has_role(auth.uid(), 'store_keeper'::app_role)
    )
  )
  OR (
    -- Allow transfers: user can access from_shop_id for 'out' transactions
    transaction_type = 'out' AND can_access_shop(auth.uid(), from_shop_id) AND (
      has_role(auth.uid(), 'branch_manager'::app_role)
      OR has_role(auth.uid(), 'store_keeper'::app_role)
    )
  )
  OR (
    -- Allow transfers: user can access to_shop_id for 'in' transactions
    transaction_type = 'in' AND can_access_shop(auth.uid(), to_shop_id) AND (
      has_role(auth.uid(), 'branch_manager'::app_role)
      OR has_role(auth.uid(), 'store_keeper'::app_role)
    )
  )
);
