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
  complaint text,
  complaint_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz,
  deleted_by uuid REFERENCES auth.users(id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_warehouse_requests_business ON public.warehouse_requests(business_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_requests_status ON public.warehouse_requests(status);
CREATE INDEX IF NOT EXISTS idx_warehouse_requests_requested_by ON public.warehouse_requests(requested_by);
CREATE INDEX IF NOT EXISTS idx_warehouse_requests_requested_at ON public.warehouse_requests(requested_at);

-- RLS Policies for warehouse_requests
-- Warehouse staff can view their own requests
CREATE POLICY "Warehouse staff can view their own requests" ON public.warehouse_requests
  FOR SELECT USING (
    auth.uid() = requested_by OR
    public.has_role(auth.uid(), 'admin'::app_role) OR
    public.has_role(auth.uid(), 'super_admin'::app_role) OR
    public.has_role(auth.uid(), 'Owner'::app_role) OR
    public.has_role(auth.uid(), 'store_owner'::app_role)
  );

-- Warehouse staff can create requests
CREATE POLICY "Warehouse staff can create requests" ON public.warehouse_requests
  FOR INSERT WITH CHECK (
    auth.uid() = requested_by AND
    status = 'pending'
  );

-- Warehouse staff can update their pending requests (before finance responds)
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
CREATE POLICY "Finance staff can approve/reject requests" ON public.warehouse_requests
  FOR UPDATE USING (
    public.has_role(auth.uid(), 'admin'::app_role) OR
    public.has_role(auth.uid(), 'super_admin'::app_role) OR
    public.has_role(auth.uid(), 'Owner'::app_role) OR
    public.has_role(auth.uid(), 'store_owner'::app_role) OR
    public.has_role(auth.uid(), 'finance'::app_role)
  ) WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role) OR
    public.has_role(auth.uid(), 'super_admin'::app_role) OR
    public.has_role(auth.uid(), 'Owner'::app_role) OR
    public.has_role(auth.uid(), 'store_owner'::app_role) OR
    public.has_role(auth.uid(), 'finance'::app_role)
  );

-- Warehouse staff can add complaints to rejected requests
CREATE POLICY "Warehouse staff can complain about rejected requests" ON public.warehouse_requests
  FOR UPDATE USING (
    auth.uid() = requested_by AND
    status = 'rejected' AND
    complaint IS NULL
  ) WITH CHECK (
    auth.uid() = requested_by AND
    status = 'rejected'
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
      0, -- Amount will be set when actually purchased
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

-- Create trigger for warehouse request handling
CREATE OR REPLACE TRIGGER trg_handle_warehouse_request
  BEFORE UPDATE ON public.warehouse_requests
  FOR EACH ROW EXECUTE FUNCTION public.handle_warehouse_request();

-- Add audit logging
CREATE OR REPLACE TRIGGER audit_warehouse_requests_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.warehouse_requests
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

-- Add finance role if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'app_role') AND enumlabel = 'finance') THEN
    ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'finance';
  END IF;
END;
$$;

-- Add warehouse request permissions
INSERT INTO public.permissions (code, description, module) VALUES
('warehouse_requests.create', 'Create warehouse requests', 'warehouse'),
('warehouse_requests.view', 'View warehouse requests', 'warehouse'),
('warehouse_requests.approve', 'Approve/reject warehouse requests', 'warehouse'),
('warehouse_requests.modify', 'Modify pending warehouse requests', 'warehouse')
ON CONFLICT (code) DO NOTHING;

-- Note: Role permissions setup removed for simplicity - can be configured through admin interface