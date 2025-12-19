-- Phase 3: Comprehensive Management System

-- ============================================
-- INVENTORY & STOCK MANAGEMENT
-- ============================================

-- Inventory transactions for tracking all stock movements
CREATE TABLE public.inventory_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id),
  product_id uuid NOT NULL REFERENCES public.products(id),
  transaction_type text NOT NULL CHECK (transaction_type IN ('in', 'out', 'transfer', 'adjustment', 'waste')),
  quantity integer NOT NULL,
  from_shop_id uuid REFERENCES public.shops(id),
  to_shop_id uuid REFERENCES public.shops(id),
  reference_order_id uuid REFERENCES public.orders(id),
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view inventory for their shops"
ON public.inventory_transactions
FOR SELECT
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR can_access_shop(auth.uid(), shop_id)
);

CREATE POLICY "Store keepers can manage inventory"
ON public.inventory_transactions
FOR ALL
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR (can_access_shop(auth.uid(), shop_id) AND (
    has_role(auth.uid(), 'branch_manager'::app_role)
    OR has_role(auth.uid(), 'store_keeper'::app_role)
  ))
);

-- Stock transfer requests
CREATE TABLE public.stock_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_shop_id uuid NOT NULL REFERENCES public.shops(id),
  to_shop_id uuid NOT NULL REFERENCES public.shops(id),
  product_id uuid NOT NULL REFERENCES public.products(id),
  quantity integer NOT NULL CHECK (quantity > 0),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'in_transit', 'completed', 'rejected')),
  requested_by uuid NOT NULL REFERENCES auth.users(id),
  approved_by uuid REFERENCES auth.users(id),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.stock_transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view transfers for their shops"
ON public.stock_transfers
FOR SELECT
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR can_access_shop(auth.uid(), from_shop_id)
  OR can_access_shop(auth.uid(), to_shop_id)
);

CREATE POLICY "Branch managers and store keepers can manage transfers"
ON public.stock_transfers
FOR ALL
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR ((can_access_shop(auth.uid(), from_shop_id) OR can_access_shop(auth.uid(), to_shop_id)) AND (
    has_role(auth.uid(), 'branch_manager'::app_role)
    OR has_role(auth.uid(), 'store_keeper'::app_role)
  ))
);

-- ============================================
-- FINANCIAL & ACCOUNTING
-- ============================================

-- Expenses tracking
CREATE TABLE public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid REFERENCES public.shops(id),
  category text NOT NULL,
  amount numeric NOT NULL CHECK (amount >= 0),
  currency text DEFAULT 'RWF',
  description text NOT NULL,
  receipt_url text,
  expense_date date NOT NULL,
  recorded_by uuid NOT NULL REFERENCES auth.users(id),
  approved_by uuid REFERENCES auth.users(id),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view expenses for their shops"
ON public.expenses
FOR SELECT
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'accountant'::app_role)
  OR (shop_id IS NOT NULL AND can_access_shop(auth.uid(), shop_id))
);

CREATE POLICY "Staff can create expenses"
ON public.expenses
FOR INSERT
WITH CHECK (
  auth.uid() = recorded_by
);

CREATE POLICY "Accountants and admins can manage expenses"
ON public.expenses
FOR UPDATE
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'accountant'::app_role)
);

-- Payroll records
CREATE TABLE public.payroll (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  shop_id uuid REFERENCES public.shops(id),
  period_start date NOT NULL,
  period_end date NOT NULL,
  base_salary numeric NOT NULL,
  bonuses numeric DEFAULT 0,
  deductions numeric DEFAULT 0,
  total_amount numeric NOT NULL,
  currency text DEFAULT 'RWF',
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid')),
  payment_date date,
  notes text,
  processed_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.payroll ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own payroll"
ON public.payroll
FOR SELECT
USING (
  auth.uid() = user_id
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'accountant'::app_role)
);

CREATE POLICY "Accountants can manage payroll"
ON public.payroll
FOR ALL
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'accountant'::app_role)
);

-- ============================================
-- WORKFORCE MANAGEMENT
-- ============================================

-- Shifts scheduling
CREATE TABLE public.shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  shop_id uuid NOT NULL REFERENCES public.shops(id),
  shift_date date NOT NULL,
  shift_type text NOT NULL CHECK (shift_type IN ('morning', 'afternoon', 'evening', 'full_day')),
  start_time time NOT NULL,
  end_time time NOT NULL,
  status text DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'no_show')),
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own shifts"
ON public.shifts
FOR SELECT
USING (
  auth.uid() = user_id
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR (can_access_shop(auth.uid(), shop_id) AND has_role(auth.uid(), 'branch_manager'::app_role))
);

CREATE POLICY "Branch managers can manage shifts"
ON public.shifts
FOR ALL
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR (can_access_shop(auth.uid(), shop_id) AND has_role(auth.uid(), 'branch_manager'::app_role))
);

-- Leave requests
CREATE TABLE public.leave_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  leave_type text NOT NULL CHECK (leave_type IN ('vacation', 'sick', 'personal', 'emergency')),
  start_date date NOT NULL,
  end_date date NOT NULL,
  days_count integer NOT NULL,
  reason text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by uuid REFERENCES auth.users(id),
  review_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own leave requests"
ON public.leave_requests
FOR SELECT
USING (
  auth.uid() = user_id
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'branch_manager'::app_role)
);

CREATE POLICY "Users can create own leave requests"
ON public.leave_requests
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Managers can update leave requests"
ON public.leave_requests
FOR UPDATE
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'branch_manager'::app_role)
);

-- ============================================
-- ADVANCED OPERATIONS
-- ============================================

-- Customer loyalty program
CREATE TABLE public.customer_loyalty (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES auth.users(id),
  points integer DEFAULT 0 CHECK (points >= 0),
  tier text DEFAULT 'bronze' CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum')),
  total_spent numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(customer_id)
);

ALTER TABLE public.customer_loyalty ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own loyalty info"
ON public.customer_loyalty
FOR SELECT
USING (
  auth.uid() = customer_id
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'seller'::app_role)
);

CREATE POLICY "System can manage loyalty"
ON public.customer_loyalty
FOR ALL
USING (true);

-- Loyalty transactions
CREATE TABLE public.loyalty_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES auth.users(id),
  points_change integer NOT NULL,
  transaction_type text NOT NULL CHECK (transaction_type IN ('earned', 'redeemed', 'expired', 'bonus', 'adjustment')),
  reference_order_id uuid REFERENCES public.orders(id),
  description text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.loyalty_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own loyalty transactions"
ON public.loyalty_transactions
FOR SELECT
USING (
  auth.uid() = customer_id
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "System can create loyalty transactions"
ON public.loyalty_transactions
FOR INSERT
WITH CHECK (true);

-- Delivery zones
CREATE TABLE public.delivery_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id),
  zone_name text NOT NULL,
  delivery_fee numeric NOT NULL CHECK (delivery_fee >= 0),
  estimated_time_minutes integer,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.delivery_zones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view active delivery zones"
ON public.delivery_zones
FOR SELECT
USING (is_active = true);

CREATE POLICY "Branch managers can manage delivery zones"
ON public.delivery_zones
FOR ALL
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR (can_access_shop(auth.uid(), shop_id) AND has_role(auth.uid(), 'branch_manager'::app_role))
);

-- Update triggers
CREATE TRIGGER update_stock_transfers_updated_at
BEFORE UPDATE ON public.stock_transfers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_leave_requests_updated_at
BEFORE UPDATE ON public.leave_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_customer_loyalty_updated_at
BEFORE UPDATE ON public.customer_loyalty
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();