-- Fix production_allocation_requests table and policies
-- NOTE: Run 20260422000001_add_production_role.sql first to add the production role
-- Create production_allocation_requests table if it doesn't exist
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_production_allocation_requests_business ON public.production_allocation_requests(business_id);
CREATE INDEX IF NOT EXISTS idx_production_allocation_requests_status ON public.production_allocation_requests(status);
CREATE INDEX IF NOT EXISTS idx_production_allocation_requests_requested_by ON public.production_allocation_requests(requested_by);
CREATE INDEX IF NOT EXISTS idx_production_allocation_requests_factory_item ON public.production_allocation_requests(factory_item_id);

-- Enable RLS
ALTER TABLE public.production_allocation_requests ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Production staff can view their own requests" ON public.production_allocation_requests;
DROP POLICY IF EXISTS "Production staff can create requests" ON public.production_allocation_requests;
DROP POLICY IF EXISTS "Production staff can update pending requests" ON public.production_allocation_requests;
DROP POLICY IF EXISTS "Warehouse staff can approve/reject allocation requests" ON public.production_allocation_requests;
DROP POLICY IF EXISTS "Production staff can confirm approved requests" ON public.production_allocation_requests;

-- View policy - permission-based, allows users with view permission or their own requests
CREATE POLICY "Production staff can view their own requests" ON public.production_allocation_requests
  FOR SELECT USING (
    auth.uid() = requested_by OR
    public.has_permission(auth.uid(), 'production_allocation.view')
  );

-- Create policy - permission-based, allows users with create permission
CREATE POLICY "Production staff can create requests" ON public.production_allocation_requests
  FOR INSERT WITH CHECK (
    auth.uid() = requested_by AND
    status = 'pending' AND
    public.has_permission(auth.uid(), 'production_allocation.create')
  );

-- Update policy - allows users to update their own pending requests
CREATE POLICY "Production staff can update pending requests" ON public.production_allocation_requests
  FOR UPDATE USING (
    auth.uid() = requested_by AND
    status = 'pending'
  ) WITH CHECK (
    auth.uid() = requested_by AND
    status = 'pending'
  );

-- Approve/reject policy - permission-based
CREATE POLICY "Warehouse staff can approve/reject allocation requests" ON public.production_allocation_requests
  FOR UPDATE USING (
    public.has_permission(auth.uid(), 'production_allocation.approve')
  ) WITH CHECK (
    public.has_permission(auth.uid(), 'production_allocation.approve')
  );

-- Confirm policy - allows requesters to confirm approved requests
CREATE POLICY "Production staff can confirm approved requests" ON public.production_allocation_requests
  FOR UPDATE USING (
    auth.uid() = requested_by AND
    status = 'approved' AND
    confirmed_by IS NULL
  ) WITH CHECK (
    auth.uid() = requested_by AND
    status = 'approved'
  );

-- Add permissions
INSERT INTO public.permissions (code, description, module) VALUES
  ('production_allocation.create', 'Create production allocation requests', 'warehouse'),
  ('production_allocation.view', 'View production allocation requests', 'warehouse'),
  ('production_allocation.approve', 'Approve/reject production allocation requests', 'warehouse'),
  ('production_allocation.confirm', 'Confirm receipt of allocated items', 'warehouse')
ON CONFLICT (code) DO NOTHING;
