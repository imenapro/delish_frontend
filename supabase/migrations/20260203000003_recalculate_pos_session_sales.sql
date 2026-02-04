-- Recalculate total_sales and total_orders for all POS sessions
-- This ensures that historical and currently open sessions reflect sales from ALL payment methods,
-- correcting the previous behavior where only 'cash' sales were counted in total_sales.

DO $$
BEGIN
    -- Update all POS sessions
    UPDATE pos_sessions ps
    SET 
        total_sales = (
            SELECT COALESCE(SUM(o.total_amount), 0)
            FROM orders o
            WHERE o.seller_id = ps.user_id
              AND o.shop_id_origin = ps.shop_id
              AND o.source = 'pos'
              AND o.created_at >= ps.opened_at
              AND (ps.closed_at IS NULL OR o.created_at <= ps.closed_at)
        ),
        total_orders = (
            SELECT COUNT(*)
            FROM orders o
            WHERE o.seller_id = ps.user_id
              AND o.shop_id_origin = ps.shop_id
              AND o.source = 'pos'
              AND o.created_at >= ps.opened_at
              AND (ps.closed_at IS NULL OR o.created_at <= ps.closed_at)
        );
END $$;
