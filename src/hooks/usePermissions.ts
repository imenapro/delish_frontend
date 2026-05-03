import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface RolePermissionJoin {
  name: string;
  role_permissions: {
    permissions: {
      code: string;
    } | {
      code: string;
    }[];
  }[];
}

interface UserPermissionJoin {
  is_granted: boolean;
  permissions: {
    code: string;
  } | null;
}

export function usePermissions() {
  const { user } = useAuth();

  const { data: permissions = [], isLoading, error } = useQuery({
    queryKey: ['permissions', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      try {
        // 1. Get user roles (names)
        const { data: userRoles, error: rolesError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);

        if (rolesError) throw rolesError;
        
        const roleNames = (userRoles || []).map(r => r.role);
        
        // 2. Get permissions from roles
        const rolePermissionsCodes = new Set<string>();
        
        if (roleNames.length > 0) {
          const { data: rolePermissions, error: permError } = await supabase
            .from('roles')
            .select(`
              name,
              role_permissions (
                permissions (
                  code
                )
              )
            `)
            .in('name', roleNames);

          if (permError) {
            console.error('Error fetching role permissions:', permError);
            throw permError;
          }

          (rolePermissions as unknown as RolePermissionJoin[])?.forEach((role) => {
            role.role_permissions?.forEach((rp) => {
               const permission = rp.permissions;
               if (permission && !Array.isArray(permission) && permission.code) {
                 rolePermissionsCodes.add(permission.code);
               } else if (Array.isArray(permission)) {
                 permission.forEach((p) => {
                   if (p.code) rolePermissionsCodes.add(p.code);
                 });
               }
            });
          });
        }

        // 3. Get user-specific overrides (Grant/Deny)
        const { data: userOverrides, error: overrideError } = await supabase
          .from('user_permissions')
          .select(`
            is_granted,
            permissions (
              code
            )
          `)
          .eq('user_id', user.id);
          
        if (overrideError) {
           console.error('Error fetching user overrides:', overrideError);
           // We don't throw here to at least return role permissions
        }

        // 4. Apply overrides
        // We start with role permissions
        const finalPermissions = new Set<string>(rolePermissionsCodes);
        
        if (userOverrides) {
          (userOverrides as unknown as UserPermissionJoin[]).forEach((override) => {
             const code = override.permissions?.code;
             if (!code) return;
             
             if (override.is_granted) {
               finalPermissions.add(code);
             } else {
               finalPermissions.delete(code);
             }
          });
        }

        return Array.from(finalPermissions);
      } catch (err) {
        console.error('Error in permission fetch:', err);
        return [];
      }
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const hasPermission = (requiredPermission: string | string[]) => {
    if (!permissions.length) return false;

    if (Array.isArray(requiredPermission)) {
      // Check if user has ANY of the required permissions
      return requiredPermission.some(p => permissions.includes(p));
    }

    return permissions.includes(requiredPermission);
  };

  const hasAllPermissions = (requiredPermissions: string[]) => {
    if (!permissions.length) return false;
    return requiredPermissions.every(p => permissions.includes(p));
  };

  return {
    permissions,
    isLoading,
    error,
    hasPermission,
    hasAllPermissions
  };
}
