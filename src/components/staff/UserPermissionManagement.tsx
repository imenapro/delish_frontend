import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useStoreContext } from '@/contexts/StoreContext';
import { toast } from 'sonner';
import { Shield, ShieldAlert, ShieldCheck, ShieldX } from 'lucide-react';

interface Role {
  id: string;
  name: string;
  description: string | null;
  is_system: boolean;
  business_id?: string | null;
}

interface Permission {
  id: string;
  code: string;
  description: string | null;
  module: string | null;
}

interface UserPermissionOverride {
  permission_id: string;
  is_granted: boolean;
}

interface UserPermissionManagementProps {
  userId: string;
  userName: string;
  businessId: string;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Component to manage user roles and granular permission overrides.
 */
export function UserPermissionManagement({
  userId,
  userName,
  businessId,
  isOpen,
  onClose,
}: UserPermissionManagementProps) {
  const { store } = useStoreContext();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('roles');

  // Fetch all available roles
  const { data: roles = [], isLoading: rolesLoading } = useQuery({
    queryKey: ['roles', store?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('roles')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as Role[];
    },
    enabled: isOpen,
  });

  // Fetch all available permissions
  const { data: allPermissions = [] } = useQuery({
    queryKey: ['permissions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('permissions')
        .select('*')
        .order('module, code');
      if (error) throw error;
      return data as Permission[];
    },
    enabled: isOpen,
  });

  // Fetch assigned roles for user
  const { data: assignedRoles = [], isLoading: assignedLoading } = useQuery({
    queryKey: ['user_roles', userId, businessId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('id, role, business_id')
        .eq('user_id', userId)
        .eq('business_id', businessId);
      if (error) throw error;
      return data as { id: string; role: string }[];
    },
    enabled: isOpen,
  });

  const assignedRoleNames = useMemo(() => assignedRoles.map(a => a.role), [assignedRoles]);

  // Fetch permissions granted by roles
  const { data: roleGrantedPermissions = [] } = useQuery({
    queryKey: ['role_permissions_map', assignedRoleNames],
    queryFn: async () => {
      if (assignedRoleNames.length === 0) return [];
      
      const { data: roleRows, error: roleErr } = await supabase
        .from('roles')
        .select('id, name')
        .in('name', assignedRoleNames);
        
      if (roleErr) throw roleErr;
      const roleIds = (roleRows || []).map(r => r.id);
      
      if (roleIds.length === 0) return [];

      const { data: rpRows, error: rpErr } = await supabase
        .from('role_permissions')
        .select('permission_id')
        .in('role_id', roleIds);
        
      if (rpErr) throw rpErr;
      return [...new Set((rpRows || []).map(rp => rp.permission_id))];
    },
    enabled: isOpen && assignedRoleNames.length > 0,
  });

  // Fetch user specific overrides
  const { data: userOverrides = [], isLoading: overridesLoading } = useQuery({
    queryKey: ['user_permissions', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_permissions')
        .select('permission_id, is_granted')
        .eq('user_id', userId);
      
      if (error) throw error;
      return data as UserPermissionOverride[];
    },
    enabled: isOpen,
  });

  // Group permissions by module
  const groupedPermissions = useMemo(() => {
    return allPermissions.reduce((acc, perm) => {
      const module = perm.module || 'Other';
      if (!acc[module]) acc[module] = [];
      acc[module].push(perm);
      return acc;
    }, {} as Record<string, Permission[]>);
  }, [allPermissions]);

  // Mutations
  const assignRoleMutation = useMutation({
    mutationFn: async (roleName: string) => {
      const { error } = await supabase.from('user_roles').insert({
        user_id: userId,
        role: roleName,
        business_id: businessId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user_roles', userId, businessId] });
      queryClient.invalidateQueries({ queryKey: ['role_permissions_map'] });
      toast.success('Role assigned');
    },
    onError: (error) => toast.error(error.message),
  });

  const removeRoleMutation = useMutation({
    mutationFn: async (roleName: string) => {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('business_id', businessId)
        .eq('role', roleName);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user_roles', userId, businessId] });
      queryClient.invalidateQueries({ queryKey: ['role_permissions_map'] });
      toast.success('Role removed');
    },
    onError: (error) => toast.error(error.message),
  });

  const setOverrideMutation = useMutation({
    mutationFn: async ({ permissionId, value }: { permissionId: string, value: 'default' | 'grant' | 'deny' }) => {
      if (value === 'default') {
        // Remove override
        const { error } = await supabase
          .from('user_permissions')
          .delete()
          .eq('user_id', userId)
          .eq('permission_id', permissionId);
        if (error) throw error;
      } else {
        // Set override (upsert)
        const { error } = await supabase
          .from('user_permissions')
          .upsert({
            user_id: userId,
            permission_id: permissionId,
            is_granted: value === 'grant'
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user_permissions', userId] });
      toast.success('Permission updated');
    },
    onError: (error) => toast.error(error.message),
  });

  // Calculate effective status for a permission
  const getPermissionStatus = (permId: string) => {
    const override = userOverrides.find(o => o.permission_id === permId);
    const grantedByRole = roleGrantedPermissions.includes(permId);

    if (override) {
      return override.is_granted ? 'explicit_grant' : 'explicit_deny';
    }
    return grantedByRole ? 'role_grant' : 'default_deny';
  };

  const getOverrideValue = (permId: string) => {
    const override = userOverrides.find(o => o.permission_id === permId);
    if (!override) return 'default';
    return override.is_granted ? 'grant' : 'deny';
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b flex-none">
          <DialogTitle>Manage Permissions: {userName}</DialogTitle>
          <DialogDescription>
            Assign roles or configure specific permission overrides for this user.
          </DialogDescription>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden min-h-0">
          <div className="px-6 py-2 border-b bg-muted/40 flex-none">
             <TabsList>
               <TabsTrigger value="roles">Assigned Roles</TabsTrigger>
               <TabsTrigger value="permissions">Granular Permissions</TabsTrigger>
             </TabsList>
          </div>

          <TabsContent value="roles" className="flex-1 flex flex-col mt-0 p-0 overflow-hidden">
             <div className="flex-1 overflow-y-auto">
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {rolesLoading ? (
                    <div className="text-sm text-muted-foreground">Loading roles...</div>
                  ) : (
                    roles.map((role) => {
                      const checked = assignedRoleNames.includes(role.name);
                      return (
                        <div key={role.id} className="flex items-center gap-3 border rounded-md p-3 hover:bg-muted/50 transition-colors">
                          <Checkbox
                            id={role.id}
                            checked={checked}
                            onCheckedChange={(val) => {
                              if (val) {
                                assignRoleMutation.mutate(role.name);
                              } else {
                                removeRoleMutation.mutate(role.name);
                              }
                            }}
                          />
                          <div className="grid gap-1 leading-none">
                            <label htmlFor={role.id} className="text-sm font-medium cursor-pointer">
                              {role.name}
                            </label>
                            {role.description && (
                              <p className="text-xs text-muted-foreground">{role.description}</p>
                            )}
                          </div>
                          {role.is_system && (
                            <Badge className="ml-auto" variant="secondary">System</Badge>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
            <div className="p-4 border-t bg-background flex justify-end gap-2">
               <Button variant="outline" onClick={onClose}>Close</Button>
            </div>
          </TabsContent>

          <TabsContent value="permissions" className="flex-1 flex flex-col mt-0 p-0 overflow-hidden">
            <div className="flex-1 overflow-y-auto">
               <div className="p-6 space-y-6">
                  {Object.entries(groupedPermissions).map(([module, perms]) => (
                    <div key={module} className="space-y-3">
                      <h3 className="font-semibold text-lg flex items-center gap-2">
                        <Badge variant="outline" className="text-base">{module}</Badge>
                      </h3>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {perms.map(perm => {
                           const status = getPermissionStatus(perm.id);
                           const overrideValue = getOverrideValue(perm.id);
                           
                           return (
                             <div key={perm.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border rounded-lg gap-4 bg-card">
                               <div className="space-y-1">
                                 <div className="flex items-center gap-2">
                                    {status === 'explicit_grant' && <ShieldCheck className="h-4 w-4 text-green-600" />}
                                    {status === 'explicit_deny' && <ShieldX className="h-4 w-4 text-red-600" />}
                                    {status === 'role_grant' && <ShieldCheck className="h-4 w-4 text-blue-600" />}
                                    {status === 'default_deny' && <Shield className="h-4 w-4 text-muted-foreground" />}
                                    <span className="font-medium text-sm">{perm.code}</span>
                                 </div>
                                 <p className="text-xs text-muted-foreground">{perm.description}</p>
                                 <div className="text-xs">
                                   Status: <span className={
                                     status === 'explicit_grant' ? 'text-green-600 font-medium' :
                                     status === 'explicit_deny' ? 'text-red-600 font-medium' :
                                     status === 'role_grant' ? 'text-blue-600 font-medium' :
                                     'text-muted-foreground'
                                   }>
                                     {status === 'explicit_grant' ? 'Granted (Override)' :
                                      status === 'explicit_deny' ? 'Denied (Override)' :
                                      status === 'role_grant' ? 'Granted (Role)' :
                                      'Denied (Default)'}
                                   </span>
                                 </div>
                               </div>
                               
                               <div className="min-w-[140px]">
                                 <Select 
                                    value={overrideValue} 
                                    onValueChange={(val: 'default' | 'grant' | 'deny') => 
                                      setOverrideMutation.mutate({ permissionId: perm.id, value: val })
                                    }
                                 >
                                   <SelectTrigger className="h-8">
                                     <SelectValue />
                                   </SelectTrigger>
                                   <SelectContent>
                                     <SelectItem value="default">Default (Inherit)</SelectItem>
                                     <SelectItem value="grant" className="text-green-600">Force Grant</SelectItem>
                                     <SelectItem value="deny" className="text-red-600">Force Deny</SelectItem>
                                   </SelectContent>
                                 </Select>
                               </div>
                             </div>
                           );
                        })}
                      </div>
                    </div>
                  ))}
               </div>
            </div>
            <div className="p-4 border-t bg-background flex justify-end gap-2">
               <Button variant="outline" onClick={onClose}>Close</Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
