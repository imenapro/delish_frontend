import { Layout } from '@/components/Layout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, Search } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { SystemSettings } from '@/components/admin/SystemSettings';
import { TimeTracker } from '@/components/time-tracking/TimeTracker';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function Admin() {
  const [searchEmail, setSearchEmail] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: users, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*');
      
      if (rolesError) throw rolesError;

      return profiles.map(profile => ({
        ...profile,
        roles: roles.filter(r => r.user_id === profile.id)
      }));
    },
  });

  const assignRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const { error } = await supabase
        .from('user_roles')
        .insert([{ user_id: userId, role: role as any }]);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast({
        title: 'Success',
        description: 'Role assigned successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const removeRoleMutation = useMutation({
    mutationFn: async ({ roleId }: { roleId: string }) => {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('id', roleId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast({
        title: 'Success',
        description: 'Role removed successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const filteredUsers = users?.filter(user => 
    user.name?.toLowerCase().includes(searchEmail.toLowerCase()) ||
    user.phone?.includes(searchEmail)
  );

  const getRoleBadgeColor = (role: string) => {
    const colors: Record<string, string> = {
      admin: 'bg-destructive text-destructive-foreground',
      manager: 'bg-primary text-primary-foreground',
      seller: 'bg-accent text-accent-foreground',
      delivery: 'bg-warning text-warning-foreground',
      customer: 'bg-secondary text-secondary-foreground',
    };
    return colors[role] || 'bg-secondary';
  };

  return (
    <ProtectedRoute requiredRole="admin">
      <Layout>
        <div className="p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Shield className="h-8 w-8" />
              Admin Management
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage users, settings, and system configuration
            </p>
          </div>

          <Tabs defaultValue="users" className="space-y-6">
            <TabsList>
              <TabsTrigger value="users">User Management</TabsTrigger>
              <TabsTrigger value="settings">System Settings</TabsTrigger>
              <TabsTrigger value="time">Time Tracking</TabsTrigger>
            </TabsList>

            <TabsContent value="users" className="space-y-6">
              <Card className="shadow-[var(--shadow-medium)]">
                <CardHeader>
                  <CardTitle>Search Users</CardTitle>
                  <CardDescription>Find users by name or phone number</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Search className="h-5 w-5 text-muted-foreground" />
                    <Input
                      placeholder="Search by name or phone..."
                      value={searchEmail}
                      onChange={(e) => setSearchEmail(e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </CardContent>
              </Card>

              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                </div>
              ) : filteredUsers && filteredUsers.length > 0 ? (
                <div className="space-y-4">
                  {filteredUsers.map((user) => (
                    <Card key={user.id} className="shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-medium)] transition-shadow">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-xl">{user.name}</CardTitle>
                            <CardDescription className="mt-2">
                              <p className="text-sm">Phone: {user.phone || 'Not provided'}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                User ID: {user.id}
                              </p>
                            </CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div>
                            <Label className="text-sm font-medium mb-2 block">Current Roles</Label>
                            <div className="flex flex-wrap gap-2">
                              {user.roles.length > 0 ? (
                                user.roles.map((role) => (
                                  <Badge 
                                    key={role.id} 
                                    className={getRoleBadgeColor(role.role)}
                                  >
                                    {role.role}
                                    <button
                                      onClick={() => removeRoleMutation.mutate({ roleId: role.id })}
                                      className="ml-2 hover:text-destructive-foreground"
                                    >
                                      ×
                                    </button>
                                  </Badge>
                                ))
                              ) : (
                                <span className="text-sm text-muted-foreground">No roles assigned</span>
                              )}
                            </div>
                          </div>

                          <div>
                            <Label className="text-sm font-medium mb-2 block">Assign New Role</Label>
                            <div className="flex gap-2">
                              <Select
                                onValueChange={(role) => 
                                  assignRoleMutation.mutate({ userId: user.id, role })
                                }
                              >
                                <SelectTrigger className="flex-1">
                                  <SelectValue placeholder="Select a role" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="admin">Admin</SelectItem>
                                  <SelectItem value="manager">Manager</SelectItem>
                                  <SelectItem value="seller">Seller</SelectItem>
                                  <SelectItem value="delivery">Delivery</SelectItem>
                                  <SelectItem value="customer">Customer</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="shadow-[var(--shadow-medium)]">
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Shield className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No users found</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="settings">
              <SystemSettings />
            </TabsContent>

            <TabsContent value="time">
              <TimeTracker />
            </TabsContent>
          </Tabs>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}