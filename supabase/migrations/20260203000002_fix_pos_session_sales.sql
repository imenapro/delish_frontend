-- Fix POS session sales calculation to include ALL payment methods in total_sales
-- This ensures "Expected Cash" (which uses total_sales) reflects all revenue as requested by user

CREATE OR REPLACE FUNCTION process_pos_sale(
  p_shop_id UUID,
  p_user_id UUID,
  p_session_id UUID,
  p_total_amount NUMERIC,
  p_payment_method TEXT,
  p_items JSONB,
  p_customer_phone TEXT DEFAULT NULL,
  p_extras JSONB DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order_id UUID;
  v_order_code TEXT;
  v_invoice_number TEXT;
  v_item JSONB;
  v_new_stock NUMERIC;
  v_current_stock NUMERIC;
  v_inventory_id UUID;
BEGIN
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
    notes
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
    COALESCE(p_extras->>'notes', '')
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
      status
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
      p_total_amount,
      0,
      p_total_amount,
      p_payment_method,
      'paid'
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to generate invoice: %', SQLERRM;
  END;

  -- 5. Update Session
  -- MODIFIED: Always add to total_sales regardless of payment method
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
