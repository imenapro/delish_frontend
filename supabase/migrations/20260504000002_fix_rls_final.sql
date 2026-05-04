
-- 1. Ensure the app_role enum is up to date (handling potential existing values)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'app_role' AND e.enumlabel = 'production') THEN
    ALTER TYPE public.app_role ADD VALUE 'production';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'app_role' AND e.enumlabel = 'distributor') THEN
    ALTER TYPE public.app_role ADD VALUE 'distributor';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2. Drop all existing policies on inventory_transactions to start fresh and avoid conflicts
DROP POLICY IF EXISTS "Store keepers can manage inventory" ON public.inventory_transactions;
DROP POLICY IF EXISTS "Inventory management for staff" ON public.inventory_transactions;
DROP POLICY IF EXISTS "Users can view their business inventory transactions" ON public.inventory_transactions;

-- 3. Create a robust view policy (for reading)
CREATE POLICY "Staff can view inventory transactions"
ON public.inventory_transactions
FOR SELECT
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND (ur.shop_id IS NULL OR ur.shop_id = inventory_transactions.shop_id)
  )
);

-- 4. Create a robust insert/update policy (for writing)
-- We use direct JOIN to user_roles to avoid any issues with the app_role enum casting in RLS
CREATE POLICY "Staff can manage inventory transactions"
ON public.inventory_transactions
FOR ALL -- Covers INSERT, UPDATE, DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND (
      -- Roles allowed to manage inventory
      ur.role::text IN ('super_admin', 'admin', 'branch_manager', 'store_keeper', 'production', 'distributor')
    )
    AND (
      -- Shop access: either business-wide (null) or specific shop
      ur.shop_id IS NULL 
      OR ur.shop_id = inventory_transactions.shop_id
      OR (transaction_type = 'out' AND ur.shop_id = from_shop_id)
      OR (transaction_type = 'in' AND ur.shop_id = to_shop_id)
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND (
      -- Roles allowed to manage inventory
      ur.role::text IN ('super_admin', 'admin', 'branch_manager', 'store_keeper', 'production', 'distributor')
    )
    AND (
      -- Shop access: either business-wide (null) or specific shop
      ur.shop_id IS NULL 
      OR ur.shop_id = inventory_transactions.shop_id
      OR (transaction_type = 'out' AND ur.shop_id = from_shop_id)
      OR (transaction_type = 'in' AND ur.shop_id = to_shop_id)
    )
  )
);

-- 5. Similarly update stock_transfers policies
DROP POLICY IF EXISTS "Branch managers and store keepers can manage transfers" ON public.stock_transfers;
DROP POLICY IF EXISTS "Transfer management for staff" ON public.stock_transfers;

CREATE POLICY "Staff can manage stock transfers"
ON public.stock_transfers
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND (
      ur.role::text IN ('super_admin', 'admin', 'branch_manager', 'store_keeper', 'production', 'distributor')
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
      ur.role::text IN ('super_admin', 'admin', 'branch_manager', 'store_keeper', 'production', 'distributor')
    )
    AND (
      ur.shop_id IS NULL 
      OR ur.shop_id = from_shop_id 
      OR ur.shop_id = to_shop_id
    )
  )
);
