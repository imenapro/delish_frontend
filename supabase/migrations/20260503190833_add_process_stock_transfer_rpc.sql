
-- RPC function to process stock transfers atomically and bypass RLS for source shop stock updates
-- This fixes the issue where a receiver could not decrease stock from the source shop due to RLS.

CREATE OR REPLACE FUNCTION public.process_stock_transfer(
  p_transfer_id UUID,
  p_approver_id UUID,
  p_status TEXT
)
RETURNS VOID AS $$
DECLARE
  v_transfer RECORD;
  v_in_reason_id UUID;
  v_out_reason_id UUID;
  v_business_id UUID;
BEGIN
  -- 1. Fetch transfer details
  SELECT * INTO v_transfer FROM public.stock_transfers WHERE id = p_transfer_id FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transfer not found';
  END IF;
  
  -- 2. Check if already processed
  IF v_transfer.status != 'pending' THEN
    RAISE EXCEPTION 'Transfer is already processed';
  END IF;
  
  -- 3. Get Business ID for audit/transactions
  SELECT business_id INTO v_business_id FROM public.shops WHERE id = v_transfer.from_shop_id;
  
  -- 4. Update status
  UPDATE public.stock_transfers 
  SET status = p_status, 
      approved_by = p_approver_id,
      updated_at = NOW()
  WHERE id = p_transfer_id;
  
  -- 5. If approved, record transactions
  IF p_status = 'approved' THEN
    -- Get reason IDs (prefer system ones, then business ones)
    SELECT id INTO v_in_reason_id FROM public.inventory_reasons 
    WHERE name = 'Transfer In' AND (is_system = true OR business_id = v_business_id)
    ORDER BY is_system DESC LIMIT 1;
    
    SELECT id INTO v_out_reason_id FROM public.inventory_reasons 
    WHERE name = 'Transfer Out' AND (is_system = true OR business_id = v_business_id)
    ORDER BY is_system DESC LIMIT 1;
    
    -- Record OUT transaction for source shop
    INSERT INTO public.inventory_transactions (
      shop_id, 
      product_id, 
      quantity, 
      transaction_type, 
      reason_id, 
      from_shop_id, 
      to_shop_id, 
      created_by, 
      notes
    ) VALUES (
      v_transfer.from_shop_id, 
      v_transfer.product_id, 
      -ABS(v_transfer.quantity), 
      'out', 
      v_out_reason_id,
      v_transfer.from_shop_id, 
      v_transfer.to_shop_id, 
      p_approver_id, 
      'Transfer approved: ' || COALESCE(v_transfer.notes, '')
    );
    
    -- Record IN transaction for destination shop
    INSERT INTO public.inventory_transactions (
      shop_id, 
      product_id, 
      quantity, 
      transaction_type, 
      reason_id, 
      from_shop_id, 
      to_shop_id, 
      created_by, 
      notes
    ) VALUES (
      v_transfer.to_shop_id, 
      v_transfer.product_id, 
      ABS(v_transfer.quantity), 
      'in', 
      v_in_reason_id,
      v_transfer.from_shop_id, 
      v_transfer.to_shop_id, 
      p_approver_id, 
      'Transfer approved: ' || COALESCE(v_transfer.notes, '')
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.process_stock_transfer(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_stock_transfer(UUID, UUID, TEXT) TO service_role;
