import { useQuery } from '@tanstack/react-query';
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
    queryKey: ['userBusinesses', user?.id],
    queryFn: async () => {
      // Super admins can see all businesses
      if (isSuperAdmin) {
        const { data, error } = await supabase
          .from('businesses')
          .select('*')
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
        .order('name');
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

