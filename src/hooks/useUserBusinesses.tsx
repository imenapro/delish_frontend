import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export function useUserBusinesses() {
  const { user, roles } = useAuth();

  const isSuperAdmin = roles.some(r => r.role === 'super_admin');
  const businessIds = roles
    .filter(r => r.business_id)
    .map(r => r.business_id)
    .filter((id): id is string => id !== undefined);

  return useQuery({
    queryKey: ['userBusinesses', user?.id, businessIds],
    queryFn: async () => {
      // Super admins can see all businesses
      if (isSuperAdmin) {
        const { data, error } = await supabase
          .from('businesses')
          .select('*')
          .eq('deleted_status', false)
          .order('name');
        
        if (error) throw error;
        return data;
      }

      // Other users can only see their assigned businesses
      if (businessIds.length === 0) return [];

      const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .in('id', businessIds)
        .eq('deleted_status', false)
        .order('name');
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function useDeleteBusiness() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (businessId: string) => {
      const { error } = await supabase.rpc('soft_delete_business', {
        target_business_id: businessId,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userBusinesses'] });
      // Also invalidate related queries since they might be affected (though filtered by business usually)
      queryClient.invalidateQueries({ queryKey: ['userShops'] });
    },
  });
}

