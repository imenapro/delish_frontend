import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export function useUserShops() {
  const { user, roles } = useAuth();

  const isSuperAdmin = roles.some(r => r.role === 'super_admin');
  const isAdmin = roles.some(r => r.role === 'admin');

  return useQuery({
    queryKey: ['userShops', user?.id],
    queryFn: async () => {
      // Super admins and admins can see all shops
      if (isSuperAdmin || isAdmin) {
        const { data, error } = await supabase
          .from('shops')
          .select('*')
          .eq('is_active', true)
          .order('name');
        
        if (error) throw error;
        return data;
      }

      // Other users can only see their assigned shops
      const shopIds = roles
        .filter(r => r.shop_id)
        .map(r => r.shop_id);

      if (shopIds.length === 0) return [];

      const { data, error } = await supabase
        .from('shops')
        .select('*')
        .in('id', shopIds)
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

