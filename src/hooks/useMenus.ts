import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface MenuItem {
  id: string;
  label: string;
  path: string;
  icon: string;
  sort_order: number;
  module?: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  children?: MenuItem[];
}

export function useMenus() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['menus', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase.rpc('get_user_menus', {
        _user_id: user.id
      });
      
      if (error) {
        console.error('Error fetching menus:', error);
        // Fallback to empty array on error to prevent crashing
        return [];
      }
      
      return data as MenuItem[];
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
}
