
-- Enhanced RPC function to process stock transfers atomically and bypass RLS
-- This version ensures that BOTH shops (source and destination) have their inventory updated
-- even if the user performing the approval doesn't have direct RLS access to both.

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
  v_source_shop_name TEXT;
  v_dest_shop_name TEXT;
BEGIN
  -- 1. Fetch transfer details with names for better transaction logging
  SELECT t.*, s_from.name as from_shop_name, s_to.name as to_shop_name, s_from.business_id
  INTO v_transfer 
  FROM public.stock_transfers t
  JOIN public.shops s_from ON t.from_shop_id = s_from.id
  JOIN public.shops s_to ON t.to_shop_id = s_to.id
  WHERE t.id = p_transfer_id 
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transfer not found';
  END IF;
  
  -- 2. Check if already processed
  IF v_transfer.status != 'pending' THEN
    RAISE EXCEPTION 'Transfer is already processed (Current status: %)', v_transfer.status;
  END IF;
  
  v_business_id := v_transfer.business_id;
  
  -- 3. Update status
  UPDATE public.stock_transfers 
  SET status = p_status, 
      approved_by = p_approver_id,
      updated_at = NOW()
  WHERE id = p_transfer_id;
  
  -- 4. If approved, record transactions for both sides
  IF p_status = 'approved' THEN
    -- Get reason IDs (prefer system ones, then business ones)
    SELECT id INTO v_in_reason_id FROM public.inventory_reasons 
    WHERE name = 'Transfer In' AND (is_system = true OR business_id = v_business_id)
    ORDER BY is_system DESC LIMIT 1;
    
    SELECT id INTO v_out_reason_id FROM public.inventory_reasons 
    WHERE name = 'Transfer Out' AND (is_system = true OR business_id = v_business_id)
    ORDER BY is_system DESC LIMIT 1;
    
    -- Record OUT transaction for source shop (Distribution)
    -- This will trigger handle_inventory_transaction() to DECREASE stock
    INSERT INTO public.inventory_transactions (
      shop_id, 
      product_id, 
      quantity, 
      transaction_type, 
      reason_id, 
      from_shop_id, 
      to_shop_id, 
      created_by, 
      notes,
      transfer_from_location,
      transfer_to_location
    ) VALUES (
      v_transfer.from_shop_id, 
      v_transfer.product_id, 
      -ABS(v_transfer.quantity), 
      'out', 
      v_out_reason_id,
      v_transfer.from_shop_id, 
      v_transfer.to_shop_id, 
      p_approver_id, 
      'Transfer approved by ' || (SELECT email FROM auth.users WHERE id = p_approver_id) || ': ' || COALESCE(v_transfer.notes, ''),
      v_transfer.from_shop_name,
      v_transfer.to_shop_name
    );
    
    -- Record IN transaction for destination shop (Seller's shop)
    -- This will trigger handle_inventory_transaction() to INCREASE stock
    INSERT INTO public.inventory_transactions (
      shop_id, 
      product_id, 
      quantity, 
      transaction_type, 
      reason_id, 
      from_shop_id, 
      to_shop_id, 
      created_by, 
      notes,
      transfer_from_location,
      transfer_to_location
    ) VALUES (
      v_transfer.to_shop_id, 
      v_transfer.product_id, 
      ABS(v_transfer.quantity), 
      'in', 
      v_in_reason_id,
      v_transfer.from_shop_id, 
      v_transfer.to_shop_id, 
      p_approver_id, 
      'Transfer approved by ' || (SELECT email FROM auth.users WHERE id = p_approver_id) || ': ' || COALESCE(v_transfer.notes, ''),
      v_transfer.from_shop_name,
      v_transfer.to_shop_name
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-grant permissions
GRANT EXECUTE ON FUNCTION public.process_stock_transfer(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_stock_transfer(UUID, UUID, TEXT) TO service_role;
