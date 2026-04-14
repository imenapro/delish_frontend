-- Create warehouse_requests table for warehouse staff to request items from finance
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

-- Create production_allocation_requests table for production staff to request items from warehouse
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

-- Create production_stock table for items allocated to production
CREATE TABLE IF NOT EXISTS public.production_stock (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  factory_item_id uuid NOT NULL REFERENCES public.factory_stock(id) ON DELETE CASCADE,
  allocation_request_id uuid REFERENCES public.production_allocation_requests(id) ON DELETE SET NULL,
  quantity numeric NOT NULL CHECK (quantity > 0),
  allocated_by uuid NOT NULL REFERENCES auth.users(id),
  allocated_at timestamptz NOT NULL DEFAULT now(),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create stock_movements table for tracking all stock movements
CREATE TABLE IF NOT EXISTS public.stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  factory_item_id uuid NOT NULL REFERENCES public.factory_stock(id) ON DELETE CASCADE,
  movement_type text NOT NULL CHECK (movement_type IN ('inbound', 'allocation', 'usage', 'return')),
  quantity numeric NOT NULL,
  from_stock text, -- 'warehouse', 'production', etc.
  to_stock text, -- 'warehouse', 'production', etc.
  reference_id uuid, -- allocation_request_id, etc.
  notes text,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_warehouse_requests_business ON public.warehouse_requests(business_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_requests_status ON public.warehouse_requests(status);
CREATE INDEX IF NOT EXISTS idx_warehouse_requests_requested_by ON public.warehouse_requests(requested_by);
CREATE INDEX IF NOT EXISTS idx_warehouse_requests_requested_at ON public.warehouse_requests(requested_at);

-- Indexes for production_allocation_requests
CREATE INDEX IF NOT EXISTS idx_production_allocation_requests_business ON public.production_allocation_requests(business_id);
CREATE INDEX IF NOT EXISTS idx_production_allocation_requests_status ON public.production_allocation_requests(status);
CREATE INDEX IF NOT EXISTS idx_production_allocation_requests_requested_by ON public.production_allocation_requests(requested_by);
CREATE INDEX IF NOT EXISTS idx_production_allocation_requests_factory_item ON public.production_allocation_requests(factory_item_id);

-- Indexes for production_stock
CREATE INDEX IF NOT EXISTS idx_production_stock_business ON public.production_stock(business_id);
CREATE INDEX IF NOT EXISTS idx_production_stock_factory_item ON public.production_stock(factory_item_id);
CREATE INDEX IF NOT EXISTS idx_production_stock_allocation_request ON public.production_stock(allocation_request_id);

-- Indexes for stock_movements
CREATE INDEX IF NOT EXISTS idx_stock_movements_business ON public.stock_movements(business_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_factory_item ON public.stock_movements(factory_item_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_type ON public.stock_movements(movement_type);

-- RLS Policies for warehouse_requests
-- Warehouse staff can view their own requests
DROP POLICY IF EXISTS "Warehouse staff can view their own requests" ON public.warehouse_requests;
CREATE POLICY "Warehouse staff can view their own requests" ON public.warehouse_requests
  FOR SELECT USING (
    auth.uid() = requested_by OR
    public.has_role(auth.uid(), 'admin'::app_role) OR
    public.has_role(auth.uid(), 'super_admin'::app_role) OR
    public.has_role(auth.uid(), 'Owner'::app_role) OR
    public.has_role(auth.uid(), 'store_owner'::app_role)
  );

-- Warehouse staff can create requests
DROP POLICY IF EXISTS "Warehouse staff can create requests" ON public.warehouse_requests;
CREATE POLICY "Warehouse staff can create requests" ON public.warehouse_requests
  FOR INSERT WITH CHECK (
    auth.uid() = requested_by AND
    status = 'pending'
  );

-- Warehouse staff can update their pending requests (before finance responds)
DROP POLICY IF EXISTS "Warehouse staff can update pending requests" ON public.warehouse_requests;
CREATE POLICY "Warehouse staff can update pending requests" ON public.warehouse_requests
  FOR UPDATE USING (
    auth.uid() = requested_by AND
    status = 'pending' AND
    deleted_at IS NULL
  ) WITH CHECK (
    auth.uid() = requested_by AND
    status = 'pending' AND
    deleted_at IS NULL
  );

-- Finance staff can update request status (approve/reject)
DROP POLICY IF EXISTS "Finance staff can approve/reject requests" ON public.warehouse_requests;
CREATE POLICY "Finance staff can approve/reject requests" ON public.warehouse_requests
  FOR UPDATE USING (
    (
      public.has_permission(auth.uid(), 'warehouse_requests.approve') OR
      public.has_role(auth.uid(), 'admin'::app_role) OR
      public.has_role(auth.uid(), 'super_admin'::app_role) OR
      public.has_role(auth.uid(), 'Owner'::app_role) OR
      public.has_role(auth.uid(), 'store_owner'::app_role) OR
      public.has_role(auth.uid(), 'finance'::app_role)
    )
    AND NOT (
      public.has_role(requested_by, 'logistics'::app_role) AND
      auth.uid() = requested_by
    )
  ) WITH CHECK (
    (
      public.has_permission(auth.uid(), 'warehouse_requests.approve') OR
      public.has_role(auth.uid(), 'admin'::app_role) OR
      public.has_role(auth.uid(), 'super_admin'::app_role) OR
      public.has_role(auth.uid(), 'Owner'::app_role) OR
      public.has_role(auth.uid(), 'store_owner'::app_role) OR
      public.has_role(auth.uid(), 'finance'::app_role)
    )
    AND NOT (
      public.has_role(requested_by, 'logistics'::app_role) AND
      auth.uid() = requested_by
    )
  );

-- Warehouse staff can add complaints to rejected requests
DROP POLICY IF EXISTS "Warehouse staff can complain about rejected requests" ON public.warehouse_requests;
CREATE POLICY "Warehouse staff can complain about rejected requests" ON public.warehouse_requests
  FOR UPDATE USING (
    auth.uid() = requested_by AND
    status = 'rejected' AND
    complaint IS NULL
  ) WITH CHECK (
    auth.uid() = requested_by AND
    status = 'rejected'
  );

-- RLS Policies for production_allocation_requests
ALTER TABLE public.production_allocation_requests ENABLE ROW LEVEL SECURITY;

-- Production staff can view their own requests
DROP POLICY IF EXISTS "Production staff can view their own requests" ON public.production_allocation_requests;
CREATE POLICY "Production staff can view their own requests" ON public.production_allocation_requests
  FOR SELECT USING (
    auth.uid() = requested_by OR
    public.has_role(auth.uid(), 'admin'::app_role) OR
    public.has_role(auth.uid(), 'super_admin'::app_role) OR
    public.has_role(auth.uid(), 'Owner'::app_role) OR
    public.has_role(auth.uid(), 'store_owner'::app_role) OR
    public.has_role(auth.uid(), 'manager'::app_role)
  );

-- Production staff can create requests
DROP POLICY IF EXISTS "Production staff can create requests" ON public.production_allocation_requests;
CREATE POLICY "Production staff can create requests" ON public.production_allocation_requests
  FOR INSERT WITH CHECK (
    auth.uid() = requested_by AND
    status = 'pending'
  );

-- Production staff can update their pending requests
DROP POLICY IF EXISTS "Production staff can update pending requests" ON public.production_allocation_requests;
CREATE POLICY "Production staff can update pending requests" ON public.production_allocation_requests
  FOR UPDATE USING (
    auth.uid() = requested_by AND
    status = 'pending'
  ) WITH CHECK (
    auth.uid() = requested_by AND
    status = 'pending'
  );

-- Warehouse staff can approve/reject allocation requests
DROP POLICY IF EXISTS "Warehouse staff can approve/reject allocation requests" ON public.production_allocation_requests;
CREATE POLICY "Warehouse staff can approve/reject allocation requests" ON public.production_allocation_requests
  FOR UPDATE USING (
    public.has_permission(auth.uid(), 'production_allocation.approve') OR
    public.has_role(auth.uid(), 'admin'::app_role) OR
    public.has_role(auth.uid(), 'super_admin'::app_role) OR
    public.has_role(auth.uid(), 'Owner'::app_role) OR
    public.has_role(auth.uid(), 'store_owner'::app_role) OR
    public.has_role(auth.uid(), 'warehouse'::app_role)
  ) WITH CHECK (
    public.has_permission(auth.uid(), 'production_allocation.approve') OR
    public.has_role(auth.uid(), 'admin'::app_role) OR
    public.has_role(auth.uid(), 'super_admin'::app_role) OR
    public.has_role(auth.uid(), 'Owner'::app_role) OR
    public.has_role(auth.uid(), 'store_owner'::app_role) OR
    public.has_role(auth.uid(), 'warehouse'::app_role)
  );

-- Production staff can confirm approved requests
DROP POLICY IF EXISTS "Production staff can confirm approved requests" ON public.production_allocation_requests;
CREATE POLICY "Production staff can confirm approved requests" ON public.production_allocation_requests
  FOR UPDATE USING (
    auth.uid() = requested_by AND
    status = 'approved' AND
    confirmed_by IS NULL
  ) WITH CHECK (
    auth.uid() = requested_by AND
    status = 'approved'
  );

-- RLS Policies for production_stock
ALTER TABLE public.production_stock ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Production stock access" ON public.production_stock;
CREATE POLICY "Production stock access" ON public.production_stock
  FOR ALL USING (
    public.has_role(auth.uid(), 'admin'::app_role) OR
    public.has_role(auth.uid(), 'super_admin'::app_role) OR
    public.has_role(auth.uid(), 'Owner'::app_role) OR
    public.has_role(auth.uid(), 'store_owner'::app_role) OR
    public.has_role(auth.uid(), 'manager'::app_role) OR
    public.has_role(auth.uid(), 'warehouse'::app_role) OR
    public.has_permission(auth.uid(), 'production_stock.access')
  );

-- RLS Policies for stock_movements
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Stock movements access" ON public.stock_movements;
CREATE POLICY "Stock movements access" ON public.stock_movements
  FOR ALL USING (
    public.has_role(auth.uid(), 'admin'::app_role) OR
    public.has_role(auth.uid(), 'super_admin'::app_role) OR
    public.has_role(auth.uid(), 'Owner'::app_role) OR
    public.has_role(auth.uid(), 'store_owner'::app_role) OR
    public.has_role(auth.uid(), 'manager'::app_role) OR
    public.has_role(auth.uid(), 'warehouse'::app_role) OR
    public.has_permission(auth.uid(), 'production_stock.access')
  );

-- Function to handle warehouse request approval/rejection
CREATE OR REPLACE FUNCTION public.handle_warehouse_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  expense_record_id uuid;
  business_currency text;
BEGIN
  -- Only process if status changed to approved or rejected
  IF TG_OP = 'UPDATE' AND OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Get business currency
  SELECT b.currency INTO business_currency
  FROM public.businesses b
  WHERE b.id = NEW.business_id;

  -- Create expense record for both approved and rejected requests
  IF NEW.status IN ('approved', 'rejected') AND OLD.status = 'pending' THEN
    IF NEW.status = 'approved' AND COALESCE(NEW.expense_amount, 0) <= 0 THEN
      RAISE EXCEPTION 'Approving a warehouse request requires a valid expense amount';
    END IF;

    -- Create expense record
    INSERT INTO public.expenses (
      business_id,
      shop_id,
      description,
      category,
      amount,
      currency,
      expense_date,
      status,
      recorded_by
    ) VALUES (
      NEW.business_id,
      NEW.shop_id,
      'Warehouse Request: ' || NEW.item_name || ' (' || NEW.quantity || ' ' || NEW.unit || ')',
      'warehouse_request',
      COALESCE(NEW.expense_amount, 0),
      COALESCE(business_currency, 'RWF'),
      NEW.requested_at::date,
      NEW.status,
      NEW.requested_by
    ) RETURNING id INTO expense_record_id;

    -- Update the warehouse request with expense_id
    NEW.expense_id := expense_record_id;

    -- Set approval/rejection timestamps
    IF NEW.status = 'approved' THEN
      NEW.approved_by := auth.uid();
      NEW.approved_at := now();
    ELSIF NEW.status = 'rejected' THEN
      NEW.rejected_by := auth.uid();
      NEW.rejected_at := now();
    END IF;
  END IF;

  -- Handle complaint updates
  IF TG_OP = 'UPDATE' AND NEW.complaint IS NOT NULL AND OLD.complaint IS NULL THEN
    NEW.complaint_at := now();
  END IF;

  RETURN NEW;
END;
$$;

-- Function to handle production allocation request approval/rejection/confirmation
CREATE OR REPLACE FUNCTION public.handle_production_allocation_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_stock_quantity numeric;
  allocation_request_id uuid := NEW.id;
BEGIN
  -- Only process if status changed
  IF TG_OP = 'UPDATE' AND OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Handle approval
  IF NEW.status = 'approved' AND OLD.status = 'pending' THEN
    NEW.approved_by := auth.uid();
    NEW.approved_at := now();
  END IF;

  -- Handle rejection
  IF NEW.status = 'rejected' AND OLD.status = 'pending' THEN
    NEW.rejected_by := auth.uid();
    NEW.rejected_at := now();
  END IF;

  -- Handle confirmation (when production staff confirms receipt)
  IF NEW.status = 'confirmed' AND OLD.status = 'approved' THEN
    NEW.confirmed_by := auth.uid();
    NEW.confirmed_at := now();

    -- Check if warehouse has sufficient stock
    SELECT quantity INTO current_stock_quantity
    FROM public.factory_stock
    WHERE id = NEW.factory_item_id;

    IF current_stock_quantity IS NULL OR current_stock_quantity < NEW.quantity THEN
      RAISE EXCEPTION 'Insufficient stock in warehouse for allocation';
    END IF;

    -- Reduce warehouse stock
    UPDATE public.factory_stock
    SET quantity = quantity - NEW.quantity
    WHERE id = NEW.factory_item_id;

    -- Add to production stock
    INSERT INTO public.production_stock (
      business_id,
      factory_item_id,
      allocation_request_id,
      quantity,
      allocated_by,
      allocated_at,
      notes
    ) VALUES (
      NEW.business_id,
      NEW.factory_item_id,
      NEW.id,
      NEW.quantity,
      NEW.confirmed_by,
      NEW.confirmed_at,
      COALESCE(NEW.confirmation_notes, 'Allocated from warehouse')
    );

    -- Record stock movement
    INSERT INTO public.stock_movements (
      business_id,
      factory_item_id,
      movement_type,
      quantity,
      from_stock,
      to_stock,
      reference_id,
      notes,
      created_by
    ) VALUES (
      NEW.business_id,
      NEW.factory_item_id,
      'allocation',
      NEW.quantity,
      'warehouse',
      'production',
      NEW.id,
      COALESCE(NEW.confirmation_notes, 'Production allocation'),
      NEW.confirmed_by
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for warehouse request handling
CREATE OR REPLACE TRIGGER trg_handle_warehouse_request
  BEFORE UPDATE ON public.warehouse_requests
  FOR EACH ROW EXECUTE FUNCTION public.handle_warehouse_request();

-- Create trigger for production allocation request handling
CREATE OR REPLACE TRIGGER trg_handle_production_allocation_request
  BEFORE UPDATE ON public.production_allocation_requests
  FOR EACH ROW EXECUTE FUNCTION public.handle_production_allocation_request();

-- Add audit logging
CREATE OR REPLACE TRIGGER audit_warehouse_requests_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.warehouse_requests
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

CREATE OR REPLACE TRIGGER audit_production_allocation_requests_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.production_allocation_requests
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

CREATE OR REPLACE TRIGGER audit_production_stock_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.production_stock
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

CREATE OR REPLACE TRIGGER audit_stock_movements_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.stock_movements
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

-- Add finance role if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'app_role') AND enumlabel = 'finance') THEN
    ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'finance';
  END IF;
END;
$$;

-- Add warehouse role if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'app_role') AND enumlabel = 'warehouse') THEN
    ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'warehouse';
  END IF;
END;
$$;

-- Add warehouse request permissions
INSERT INTO public.permissions (code, description, module) VALUES
('warehouse_requests.create', 'Create warehouse requests', 'warehouse'),
('warehouse_requests.view', 'View warehouse requests', 'warehouse'),
('warehouse_requests.approve', 'Approve/reject warehouse requests', 'warehouse'),
('warehouse_requests.modify', 'Modify pending warehouse requests', 'warehouse'),
('production_allocation.create', 'Create production allocation requests', 'warehouse'),
('production_allocation.view', 'View production allocation requests', 'warehouse'),
('production_allocation.approve', 'Approve/reject production allocation requests', 'warehouse'),
('production_allocation.confirm', 'Confirm receipt of allocated items', 'warehouse')
ON CONFLICT (code) DO NOTHING;

-- Note: Role permissions setup removed for simplicity - can be configured through admin interface