import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ShopMetrics {
  totalProducts: number;
  totalWorkers: number;
  totalOrders: number;
  monthlyRevenue: number;
  todayRevenue: number;
}

export function useShopMetrics(shopId: string | undefined) {
  return useQuery({
    queryKey: ['shopMetrics', shopId],
    queryFn: async (): Promise<ShopMetrics> => {
      if (!shopId) {
        return {
          totalProducts: 0,
          totalWorkers: 0,
          totalOrders: 0,
          monthlyRevenue: 0,
          todayRevenue: 0,
        };
      }

      // Get total products in this shop (only active ones)
      const { count: productsCount } = await supabase
        .from('shop_inventory')
        .select('*, product:products!inner(*)', { count: 'exact', head: true })
        .eq('shop_id', shopId)
        .eq('product.is_active', true);

      // Get total workers in this shop
      const { count: workersCount } = await supabase
        .from('user_roles')
        .select('*', { count: 'exact', head: true })
        .eq('shop_id', shopId);

      // Get total orders for this shop
      const { count: ordersCount } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('shop_id_origin', shopId);

      // Get monthly revenue
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data: monthlyOrders } = await supabase
        .from('orders')
        .select('total_amount')
        .eq('shop_id_origin', shopId)
        .gte('created_at', startOfMonth.toISOString())
        .in('status', ['confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered']);

      const monthlyRevenue = monthlyOrders?.reduce(
        (sum, order) => sum + Number(order.total_amount),
        0
      ) || 0;

      // Get today's revenue
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const { data: todayOrders } = await supabase
        .from('orders')
        .select('total_amount')
        .eq('shop_id_origin', shopId)
        .gte('created_at', startOfDay.toISOString())
        .in('status', ['confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered']);

      const todayRevenue = todayOrders?.reduce(
        (sum, order) => sum + Number(order.total_amount),
        0
      ) || 0;

      return {
        totalProducts: productsCount || 0,
        totalWorkers: workersCount || 0,
        totalOrders: ordersCount || 0,
        monthlyRevenue,
        todayRevenue,
      };
    },
    enabled: !!shopId,
  });
}
