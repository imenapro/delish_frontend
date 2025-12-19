-- Migration to restructure invoices and decouple from orders

-- 1. Add new columns
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS shop_id UUID REFERENCES public.shops(id),
  ADD COLUMN IF NOT EXISTS staff_id UUID REFERENCES public.profiles(id);

-- 2. Backfill data for existing invoices from linked orders
-- This ensures we don't lose the shop/staff association for existing records
UPDATE public.invoices
SET 
  shop_id = orders.shop_id_origin,
  staff_id = orders.seller_id
FROM public.orders
WHERE public.invoices.order_id = public.orders.id;

-- 3. Drop order_id and constraints
ALTER TABLE public.invoices 
  DROP CONSTRAINT IF EXISTS fk_order,
  DROP CONSTRAINT IF EXISTS invoices_order_id_fkey,
  DROP COLUMN IF EXISTS order_id;

-- 4. Add Index for performance
CREATE INDEX IF NOT EXISTS idx_invoices_shop_id ON public.invoices(shop_id);

-- 5. Cleanup triggers
DROP TRIGGER IF EXISTS on_order_created_create_invoice ON public.orders;
DROP TRIGGER IF EXISTS create_invoice_on_order ON public.orders;
DROP TRIGGER IF EXISTS trigger_create_invoice ON public.orders;

-- 6. Update RLS Policies
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view invoices they created or if admin/manager" ON public.invoices;
DROP POLICY IF EXISTS "Users can insert invoices" ON public.invoices;

CREATE POLICY "Users can view invoices for their shops" ON public.invoices
  FOR SELECT
  USING (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
    OR can_access_shop(auth.uid(), shop_id)
  );

CREATE POLICY "Staff can create invoices" ON public.invoices
  FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND (
      has_role(auth.uid(), 'super_admin'::app_role)
      OR has_role(auth.uid(), 'admin'::app_role)
      OR can_access_shop(auth.uid(), shop_id)
    )
  );
