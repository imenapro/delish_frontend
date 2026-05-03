import { useQuery } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { useStoreContext } from '@/contexts/StoreContext';
import { supabase } from '@/integrations/supabase/client';

export function usePendingTransfers() {
  const { store } = useStoreContext();
  const { roles } = useAuth();
  const businessId = store?.id;

  const isProduction = roles.some(r => r.role.toLowerCase() === 'production');
  const isDistributor = roles.some(r => r.role.toLowerCase() === 'distributor');

  return useQuery({
    queryKey: ['pending-transfers-count', businessId],
    queryFn: async () => {
      if (!businessId) return 0;

      let query = supabase
        .from('stock_transfers')
        .select('id', { count: 'exact' })
        .eq('status', 'pending');

      // Get all shops for the business to filter by role
      const { data: allShops } = await supabase
        .from('shops')
        .select('id, name')
        .eq('business_id', businessId)
        .eq('is_active', true);

      if (!allShops?.length) return 0;

      const orConditions = [];

      // Production users can see pending transfers from PRODUCTION shop
      if (isProduction) {
        const productionShop = allShops.find(s => s.name.toUpperCase() === 'PRODUCTION');
        if (productionShop) {
          orConditions.push(`from_shop_id.eq.${productionShop.id}`);
        }
      }

      // Distributor users can see pending transfers to DISTRIBUTOR shop
      if (isDistributor) {
        const distributorShop = allShops.find(s => s.name.toUpperCase() === 'DISTRIBUTOR');
        if (distributorShop) {
          orConditions.push(`to_shop_id.eq.${distributorShop.id}`);
        }
      }

      // For other roles, get their assigned shops
      const assignedShopIds = roles
        .filter(r => r.shop_id && (r.business_id ? r.business_id === businessId : true))
        .map(r => r.shop_id as string);

      if (assignedShopIds.length > 0 && !isProduction && !isDistributor) {
        orConditions.push(`from_shop_id.in.(${assignedShopIds.join(',')}),to_shop_id.in.(${assignedShopIds.join(',')})`);
      }

      if (orConditions.length > 0) {
        query = query.or(orConditions.join(','));
      } else if (!isProduction && !isDistributor) {
        return 0; // No access if not special role and no shop access
      }

      const { count, error } = await query;
      
      if (error) throw error;
      return count || 0;
    },
    enabled: !!businessId,
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}
