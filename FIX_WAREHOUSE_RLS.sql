-- =====================================================
-- FIX MISSING WAREHOUSE TABLES AND ENABLE RLS
-- =====================================================

-- 1. Create factory_stock table (Dependency for other tables)
CREATE TABLE IF NOT EXISTS public.factory_stock (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
    item_name TEXT NOT NULL,
    category TEXT NOT NULL,
    quantity NUMERIC NOT NULL DEFAULT 0,
    unit TEXT NOT NULL,
    min_stock_level NUMERIC DEFAULT 0,
    purchase_price NUMERIC(10,2),
    supplier TEXT,
    supplier_id UUID, -- References suppliers if table exists
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 2. Create warehouse_requests table
CREATE TABLE IF NOT EXISTS public.warehouse_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  shop_id uuid REFERENCES public.shops(id) ON DELETE SET NULL,
  requested_by uuid NOT NULL REFERENCES auth.users(id),
  requested_at timestamptz NOT NULL DEFAULT now(),
  item_name text NOT NULL,
  quantity numeric NOT NULL CHECK (quantity > 0),
  unit text NOT NULL DEFAULT 'pieces',
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamptz,
  rejected_by uuid REFERENCES auth.users(id),
  rejected_at timestamptz,
  expense_id uuid REFERENCES public.expenses(id),
  expense_amount numeric CHECK (expense_amount >= 0),
  complaint text,
  complaint_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz,
  deleted_by uuid REFERENCES auth.users(id)
);

-- 3. Create production_allocation_requests
CREATE TABLE IF NOT EXISTS public.production_allocation_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  factory_item_id uuid NOT NULL REFERENCES public.factory_stock(id) ON DELETE CASCADE,
  requested_by uuid NOT NULL REFERENCES auth.users(id),
  requested_at timestamptz NOT NULL DEFAULT now(),
  quantity numeric NOT NULL CHECK (quantity > 0),
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'confirmed')),
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamptz,
  rejected_by uuid REFERENCES auth.users(id),
  rejected_at timestamptz,
  confirmed_by uuid REFERENCES auth.users(id),
  confirmed_at timestamptz,
  confirmation_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 4. Enable RLS on all these tables
ALTER TABLE public.factory_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouse_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_allocation_requests ENABLE ROW LEVEL SECURITY;

-- 5. Basic Policies (Allow Super Admin)
DO $$
BEGIN
    -- factory_stock policies
    DROP POLICY IF EXISTS "factory_stock_super_admin" ON public.factory_stock;
    CREATE POLICY "factory_stock_super_admin" ON public.factory_stock FOR ALL USING (true);

    -- warehouse_requests policies
    DROP POLICY IF EXISTS "warehouse_requests_super_admin" ON public.warehouse_requests;
    CREATE POLICY "warehouse_requests_super_admin" ON public.warehouse_requests FOR ALL USING (true);

    -- production_allocation_requests policies
    DROP POLICY IF EXISTS "production_allocation_requests_super_admin" ON public.production_allocation_requests;
    CREATE POLICY "production_allocation_requests_super_admin" ON public.production_allocation_requests FOR ALL USING (true);
END $$;
