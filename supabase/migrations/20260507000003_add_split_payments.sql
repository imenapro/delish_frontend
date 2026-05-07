-- Migration to support split payments in POS (Corrected Signature)
-- This migration adds a 'payments' table to track multiple payment methods per order/invoice
-- and updates process_pos_sale to handle multiple payments.

-- 1. Ensure the payments table exists
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
    shop_id UUID NOT NULL REFERENCES public.shops(id),
    business_id UUID REFERENCES public.businesses(id),
    staff_id UUID REFERENCES auth.users(id),
    amount NUMERIC NOT NULL CHECK (amount >= 0),
    payment_method public.payment_method NOT NULL,
    payment_details JSONB, -- For transaction IDs, card info, etc.
    status TEXT DEFAULT 'completed', -- 'completed', 'failed', 'refunded'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Add 'split' to payment_method enum if it doesn't exist
DO $$ BEGIN
    ALTER TYPE public.payment_method ADD VALUE 'split';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. Add missing business_id columns to orders and invoices if they don't exist
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE;

-- 3. Update existing orders and invoices with business_id from shops
UPDATE public.orders o
SET business_id = s.business_id
FROM public.shops s
WHERE o.shop_id_origin = s.id AND o.business_id IS NULL;

UPDATE public.invoices i
SET business_id = s.business_id
FROM public.shops s
WHERE i.shop_id = s.id AND i.business_id IS NULL;

-- Enable RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- 2. Update RLS policies for payments
DROP POLICY IF EXISTS "Super admins can view all payments" ON public.payments;
CREATE POLICY "Super admins can view all payments"
ON public.payments FOR SELECT
USING (public.has_role(auth.uid(), 'super_admin'::app_role));

DROP POLICY IF EXISTS "Shop owners can view their shop payments" ON public.payments;
CREATE POLICY "Shop owners can view their shop payments"
ON public.payments FOR SELECT
USING (shop_id IS NOT NULL AND public.can_access_shop(auth.uid(), shop_id));

DROP POLICY IF EXISTS "Staff can create payments" ON public.payments;
CREATE POLICY "Staff can create payments"
ON public.payments FOR INSERT
WITH CHECK (true);

-- 3. Drop existing overloads to ensure a clean signature
DROP FUNCTION IF EXISTS public.process_pos_sale(UUID, UUID, UUID, NUMERIC, TEXT, JSONB, TEXT, JSONB);
DROP FUNCTION IF EXISTS public.process_pos_sale(UUID, UUID, UUID, NUMERIC, TEXT, JSONB, TEXT, JSONB, JSONB);
DROP FUNCTION IF EXISTS public.process_pos_sale(UUID, UUID, UUID, NUMERIC, TEXT, JSONB, TEXT, JSONB, NUMERIC);

-- 4. Update the process_pos_sale function with the CORRECT signature
-- This signature includes p_tax_amount which is expected by the frontend
CREATE OR REPLACE FUNCTION public.process_pos_sale(
  p_shop_id UUID,
  p_user_id UUID,
  p_session_id UUID,
  p_total_amount NUMERIC,
  p_payment_method TEXT,
  p_items JSONB,
  p_customer_phone TEXT DEFAULT NULL,
  p_extras JSONB DEFAULT NULL,
  p_tax_amount NUMERIC DEFAULT 0,
  p_payments JSONB DEFAULT NULL -- New optional parameter for split payments
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order_id UUID;
  v_order_code TEXT;
  v_invoice_id UUID;
  v_invoice_number TEXT;
  v_item JSONB;
  v_payment JSONB;
  v_new_stock NUMERIC;
  v_current_stock NUMERIC;
  v_inventory_id UUID;
  v_business_id UUID;
BEGIN
  -- Get business_id from shop
  SELECT business_id INTO v_business_id FROM shops WHERE id = p_shop_id;

  -- 1. Generate Order Code
  v_order_code := 'ORD-' || to_char(now(), 'YYYYMMDDHH24MISS') || '-' || floor(random() * 1000)::text;

  -- 2. Insert Order
  INSERT INTO orders (
    order_code,
    customer_id,
    seller_id,
    shop_id_origin,
    shop_id_fulfill,
    total_amount,
    payment_method,
    customer_phone,
    status,
    confirmed_at,
    source,
    notes,
    business_id
  ) VALUES (
    v_order_code,
    p_user_id,
    p_user_id,
    p_shop_id,
    p_shop_id,
    p_total_amount,
    p_payment_method::payment_method,
    p_customer_phone,
    'confirmed',
    now(),
    'pos',
    COALESCE(p_extras->>'notes', ''),
    v_business_id
  ) RETURNING id INTO v_order_id;

  -- 3. Process Items
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO order_items (
      order_id,
      product_id,
      quantity,
      unit_price,
      subtotal
    ) VALUES (
      v_order_id,
      (v_item->>'product_id')::UUID,
      (v_item->>'quantity')::NUMERIC,
      (v_item->>'unit_price')::NUMERIC,
      ((v_item->>'quantity')::NUMERIC * (v_item->>'unit_price')::NUMERIC)
    );

    -- Update Stock
    SELECT id, stock INTO v_inventory_id, v_current_stock
    FROM shop_inventory
    WHERE shop_id = p_shop_id AND product_id = (v_item->>'product_id')::UUID
    FOR UPDATE;

    IF v_inventory_id IS NOT NULL AND v_current_stock IS NOT NULL THEN
      v_new_stock := GREATEST(0, v_current_stock - (v_item->>'quantity')::NUMERIC);
      UPDATE shop_inventory SET stock = v_new_stock WHERE id = v_inventory_id;
    END IF;
  END LOOP;

  -- 4. Generate Invoice
  BEGIN
    SELECT * FROM generate_shop_invoice_number(p_shop_id) INTO v_invoice_number;
    
    INSERT INTO invoices (
      invoice_number,
      shop_id,
      staff_id,
      created_by,
      customer_info,
      items_snapshot,
      subtotal,
      tax_amount,
      total_amount,
      payment_method,
      status,
      business_id
    ) VALUES (
      v_invoice_number,
      p_shop_id,
      p_user_id,
      p_user_id,
      jsonb_build_object(
        'id', p_user_id,
        'phone', COALESCE(p_customer_phone, 'Walk-in'),
        'name', COALESCE(p_extras->>'customer_name', 'Walk-in Customer')
      ),
      p_items,
      p_total_amount - p_tax_amount, -- Subtotal calculation
      p_tax_amount,
      p_total_amount,
      p_payment_method,
      'paid',
      v_business_id
    ) RETURNING id INTO v_invoice_id;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to generate invoice: %', SQLERRM;
  END;

  -- 5. Process Payments
  IF p_payments IS NOT NULL AND jsonb_array_length(p_payments) > 0 THEN
    FOR v_payment IN SELECT * FROM jsonb_array_elements(p_payments)
    LOOP
      INSERT INTO payments (
        order_id,
        invoice_id,
        shop_id,
        business_id,
        staff_id,
        amount,
        payment_method,
        payment_details
      ) VALUES (
        v_order_id,
        v_invoice_id,
        p_shop_id,
        v_business_id,
        p_user_id,
        (v_payment->>'amount')::NUMERIC,
        (v_payment->>'method')::payment_method,
        COALESCE(v_payment->'details', '{}'::jsonb)
      );
    END LOOP;
  ELSE
    -- Fallback for legacy calls or single payments
    INSERT INTO payments (
      order_id,
      invoice_id,
      shop_id,
      business_id,
      staff_id,
      amount,
      payment_method
    ) VALUES (
      v_order_id,
      v_invoice_id,
      p_shop_id,
      v_business_id,
      p_user_id,
      p_total_amount,
      p_payment_method::payment_method
    );
  END IF;

  -- 6. Update Session
  UPDATE pos_sessions
  SET 
    total_sales = COALESCE(total_sales, 0) + p_total_amount,
    total_orders = COALESCE(total_orders, 0) + 1
  WHERE id = p_session_id;

  RETURN jsonb_build_object(
    'order_id', v_order_id,
    'order_code', v_order_code,
    'invoice_number', v_invoice_number,
    'created_at', now(),
    'success', true
  );
END;
$$;

-- 7. Optimized RLS Policies for Orders and Invoices using business_id
-- This improves performance by avoiding joins with the shops table

-- Orders
DROP POLICY IF EXISTS "Users can view own orders or related orders" ON public.orders;
DROP POLICY IF EXISTS "Users can view accessible orders" ON public.orders;
CREATE POLICY "Users can view accessible orders" ON public.orders
FOR SELECT
USING (
    auth.uid() = customer_id 
    OR auth.uid() = seller_id 
    OR (business_id IS NOT NULL AND (
        public.is_business_owner(auth.uid(), business_id)
        OR public.is_business_manager(auth.uid(), business_id)
        OR public.is_super_admin(auth.uid())
    ))
);

-- Invoices
DROP POLICY IF EXISTS "Users can view accessible invoices" ON public.invoices;
CREATE POLICY "Users can view accessible invoices" ON public.invoices
FOR SELECT
USING (
    auth.uid() = created_by
    OR (business_id IS NOT NULL AND (
        public.is_business_owner(auth.uid(), business_id)
        OR public.is_business_manager(auth.uid(), business_id)
        OR public.is_super_admin(auth.uid())
    ))
    OR EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
        AND ur.shop_id = invoices.shop_id
    )
);
