-- Create RPC to get sales analytics (Daily, Weekly, Monthly) for Business and Shops
CREATE OR REPLACE FUNCTION get_sales_analytics(p_business_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_today_start TIMESTAMPTZ := date_trunc('day', now());
  v_week_start TIMESTAMPTZ := date_trunc('week', now());
  v_month_start TIMESTAMPTZ := date_trunc('month', now());
  v_global_daily NUMERIC := 0;
  v_global_weekly NUMERIC := 0;
  v_global_monthly NUMERIC := 0;
  v_shops JSONB;
BEGIN
  -- Calculate Global Stats
  SELECT
    COALESCE(SUM(CASE WHEN created_at >= v_today_start THEN total_amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN created_at >= v_week_start THEN total_amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN created_at >= v_month_start THEN total_amount ELSE 0 END), 0)
  INTO
    v_global_daily,
    v_global_weekly,
    v_global_monthly
  FROM orders o
  JOIN shops s ON o.shop_id_origin = s.id
  WHERE s.business_id = p_business_id
  AND o.status IN ('confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered');

  -- Calculate Shop Stats
  SELECT jsonb_agg(
    jsonb_build_object(
      'shop_id', s.id,
      'shop_name', s.name,
      'daily', COALESCE(stats.daily, 0),
      'weekly', COALESCE(stats.weekly, 0),
      'monthly', COALESCE(stats.monthly, 0)
    )
  )
  INTO v_shops
  FROM shops s
  LEFT JOIN (
    SELECT
      shop_id_origin,
      SUM(CASE WHEN created_at >= v_today_start THEN total_amount ELSE 0 END) as daily,
      SUM(CASE WHEN created_at >= v_week_start THEN total_amount ELSE 0 END) as weekly,
      SUM(CASE WHEN created_at >= v_month_start THEN total_amount ELSE 0 END) as monthly
    FROM orders
    WHERE status IN ('confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered')
    GROUP BY shop_id_origin
  ) stats ON s.id = stats.shop_id_origin
  WHERE s.business_id = p_business_id;

  RETURN jsonb_build_object(
    'global', jsonb_build_object(
      'daily', v_global_daily,
      'weekly', v_global_weekly,
      'monthly', v_global_monthly
    ),
    'shops', COALESCE(v_shops, '[]'::jsonb)
  );
END;
$$;
