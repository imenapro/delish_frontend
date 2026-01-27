CREATE OR REPLACE FUNCTION process_pos_sale(
  p_shop_id UUID,
  p_user_id UUID,
  p_session_id UUID,
  p_total_amount NUMERIC,
  p_payment_method TEXT,
  p_items JSONB, -- REQUIRED
  p_tax_amount NUMERIC DEFAULT 0, -- NEW: Tax amount (included in total)
  p_customer_phone TEXT DEFAULT NULL, -- OPTIONAL
  p_extras JSONB DEFAULT NULL -- OPTIONAL
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
    notes,
    pos_session_id -- Link to session
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
    p_session_id
  ) RETURNING id INTO v_order_id;
  
  v_invoice_number := v_order_code; -- Default invoice number to order code if not generated otherwise

  -- 3. Create Order Items and Update Inventory
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    -- Insert Order Item
    INSERT INTO order_items (
      order_id,
      product_id,
      quantity,
      unit_price,
      subtotal
    ) VALUES (
      v_order_id,
      (v_item->>'product_id')::UUID,
      (v_item->>'quantity')::INTEGER,
      (v_item->>'unit_price')::NUMERIC,
      (v_item->>'quantity')::INTEGER * (v_item->>'unit_price')::NUMERIC
    );

    -- Update Shop Inventory (Decrease Stock)
    -- Find inventory record
    SELECT id, stock INTO v_inventory_id, v_current_stock
    FROM shop_inventory
    WHERE shop_id = p_shop_id AND product_id = (v_item->>'product_id')::UUID
    FOR UPDATE; -- Lock for update

    IF v_inventory_id IS NOT NULL THEN
      v_new_stock := v_current_stock - (v_item->>'quantity')::NUMERIC;
      
      UPDATE shop_inventory
      SET stock = v_new_stock,
          updated_at = now()
      WHERE id = v_inventory_id;
    END IF;
  END LOOP;

  -- 4. Create Invoice Record
  BEGIN
    INSERT INTO invoices (
      order_id,
      invoice_number,
      shop_id,
      customer_id,
      customer_details,
      items,
      subtotal,
      tax_amount,
      total_amount,
      payment_method,
      status
    ) VALUES (
      v_order_id,
      v_invoice_number,
      p_shop_id,
      p_user_id,
      jsonb_build_object(
        'id', p_user_id,
        'phone', COALESCE(p_customer_phone, 'Walk-in'),
        'name', COALESCE(p_extras->>'customer_name', 'Walk-in Customer')
      ),
      p_items,
      p_total_amount - p_tax_amount, -- Calculate subtotal
      p_tax_amount,
      p_total_amount,
      p_payment_method,
      'paid'
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to generate invoice: %', SQLERRM;
  END;

  -- 5. Update Session
  UPDATE pos_sessions
  SET 
    total_sales = COALESCE(total_sales, 0) + (CASE WHEN p_payment_method = 'cash' THEN p_total_amount ELSE 0 END),
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