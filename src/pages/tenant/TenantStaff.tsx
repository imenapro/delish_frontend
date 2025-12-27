import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { TenantPageWrapper } from '@/components/tenant/TenantPageWrapper';
import { InviteStaffDialog } from '@/components/staff/InviteStaffDialog';
import { StaffTable } from '@/components/staff/StaffTable';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useStoreContext } from '@/contexts/StoreContext';
import { toast } from 'sonner';
import { Users, UserPlus, Shield, UserCheck, UserX } from 'lucide-react';

export default function TenantStaff() {
  const { store } = useStoreContext();
  const queryClient = useQueryClient();
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);

  // Fetch shops for assignment
  const { data: shops = [] } = useQuery({
    queryKey: ['tenant-shops', store?.id],
    queryFn: async () => {
      if (!store?.id) return [];
      const { data, error } = await supabase
        .from('shops')
        .select('id, name')
        .eq('business_id', store.id)
        .eq('is_active', true);
      if (error) throw error;
      return data || [];
    },
    enabled: !!store?.id,
  });

  // Fetch staff members for this business
  const { data: staff = [], isLoading: staffLoading } = useQuery({
    queryKey: ['tenant-staff', store?.id],
    queryFn: async () => {
      if (!store?.id) return [];
      
      // Get users with roles in this business
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select(`
          user_id,
          role,
          shop_id
        `)
        .eq('business_id', store.id);

      if (rolesError) throw rolesError;
      if (!userRoles || userRoles.length === 0) return [];

      // Get unique user IDs
      const userIds = [...new Set(userRoles.map(r => r.user_id))];

      // Fetch profile data for these users
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, name, phone, avatar_url, is_suspended, created_at')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      // Get emails from auth (we'll use name/phone for now since we can't access auth.users directly)
      // Combine data
      return (profiles || []).map(profile => ({
        id: profile.id,
        name: profile.name,
        email: '', // Would need edge function to get from auth
        phone: profile.phone,
        avatar_url: profile.avatar_url,
        is_suspended: profile.is_suspended || false,
        created_at: profile.created_at,
        roles: userRoles
          .filter(r => r.user_id === profile.id)
          .map(r => ({ role: r.role, shop_id: r.shop_id })),
      }));
    },
    enabled: !!store?.id,
  });

  // Suspend/reactivate staff mutation
  const suspendMutation = useMutation({
    mutationFn: async ({ userId, suspend }: { userId: string; suspend: boolean }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          is_suspended: suspend,
          suspended_at: suspend ? new Date().toISOString() : null,
        })
        .eq('id', userId);
      
      if (error) throw error;
    },
    onSuccess: (_, { suspend }) => {
      queryClient.invalidateQueries({ queryKey: ['tenant-staff'] });
      toast.success(suspend ? 'Staff member suspended' : 'Staff member reactivated');
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Operation failed';
      toast.error(message);
    },
  });

  // Calculate stats
  const totalStaff = staff.length;
  const activeStaff = staff.filter(s => !s.is_suspended).length;
  const managers = staff.filter(s => 
    s.roles.some(r => r.role === 'branch_manager' || r.role === 'admin')
  ).length;
  const suspendedStaff = staff.filter(s => s.is_suspended).length;

  return (
    <TenantPageWrapper
      title="Staff Management"
      description="Manage employees and their roles"
      actions={
        <Button onClick={() => setInviteDialogOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Add Staff Member
        </Button>
      }
    >
      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Staff</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStaff}</div>
            <p className="text-xs text-muted-foreground">Employees</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <UserCheck className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeStaff}</div>
            <p className="text-xs text-muted-foreground">Currently active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Managers</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{managers}</div>
            <p className="text-xs text-muted-foreground">Branch managers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Suspended</CardTitle>
            <UserX className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{suspendedStaff}</div>
            <p className="text-xs text-muted-foreground">Inactive accounts</p>
          </CardContent>
        </Card>
      </div>

      {/* Staff Directory */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Staff Directory</CardTitle>
          <CardDescription>View and manage all staff members</CardDescription>
        </CardHeader>
        <CardContent>
          {staff.length === 0 && !staffLoading ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="font-semibold text-lg">No Staff Members</h3>
              <p className="text-muted-foreground mb-4">Add staff members to manage your team</p>
              <Button onClick={() => setInviteDialogOpen(true)}>
                <UserPlus className="mr-2 h-4 w-4" />
                Add First Staff Member
              </Button>
            </div>
          ) : (
            <StaffTable
              staff={staff}
              loading={staffLoading}
              onSuspend={(userId, suspend) => suspendMutation.mutate({ userId, suspend })}
            />
          )}
        </CardContent>
      </Card>

      {/* Invite Dialog */}
      <InviteStaffDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
        shops={shops}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['tenant-staff'] })}
      />
    </TenantPageWrapper>
  );
}
