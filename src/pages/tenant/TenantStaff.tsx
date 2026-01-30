import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { TenantPageWrapper } from '@/components/tenant/TenantPageWrapper';
import { InviteStaffDialog } from '@/components/staff/InviteStaffDialog';
import { StaffTable, StaffMember } from '@/components/staff/StaffTableEnhanced';
import { StaffForm, StaffFormValues } from '@/components/staff/StaffForm';
import { UserPermissionManagement } from '@/components/staff/UserPermissionManagement';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useStoreContext } from '@/contexts/StoreContext';
import { toast } from 'sonner';
import { Users, UserPlus, Shield, UserCheck, UserX } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function TenantStaff() {
  const { user, roles } = useAuth();
  const { store } = useStoreContext();
  const queryClient = useQueryClient();
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [isPermissionsDialogOpen, setIsPermissionsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isTransferDialogOpen, setIsTransferDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [transferTargetShopId, setTransferTargetShopId] = useState<string>('');
  
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);

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

  // Fetch manageable roles
  const { data: manageableRoles } = useQuery({
    queryKey: ['manageableRoles', user?.id],
    queryFn: async () => {
      if (roles.length === 0) return [];
      const { data, error } = await supabase
        .from('role_hierarchy')
        .select('child_role')
        .in('parent_role', roles.map(r => r.role));
      
      if (error) throw error;
      return [...new Set(data.map(r => r.child_role))];
    },
    enabled: !!user && roles.length > 0,
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

  // Helper for audit logs
  const logAudit = async (action: string, details: string) => {
    try {
      await supabase.from('audit_logs').insert({
        action,
        details,
        performed_by: user?.id,
        created_at: new Date().toISOString(),
        business_id: store?.id,
      });
    } catch (e) {
      console.warn('Audit log failed', e);
    }
  };

  const updateStaffMutation = useMutation({
    mutationFn: async (staffData: StaffFormValues) => {
      if (!selectedStaff || !store?.id) return;
      
      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ name: staffData.name, phone: staffData.phone })
        .eq('id', selectedStaff.id);
      if (profileError) throw profileError;

      // Update roles for this business
      // First delete existing roles for this business
      await supabase.from('user_roles')
        .delete()
        .eq('user_id', selectedStaff.id)
        .eq('business_id', store.id);
      
      // Insert new role
      const { error: roleError } = await supabase.from('user_roles').insert([{
        user_id: selectedStaff.id,
        role: staffData.role as any,
        shop_id: staffData.shopId && staffData.shopId !== 'none' ? staffData.shopId : null,
        business_id: store.id
      }]);

      if (roleError) throw roleError;

      await logAudit('UPDATE_STAFF', `Updated staff member ${staffData.name}`);
    },
    onSuccess: () => {
      toast.success("Staff member updated");
      queryClient.invalidateQueries({ queryKey: ['tenant-staff'] });
      setIsEditDialogOpen(false);
      setSelectedStaff(null);
    },
    onError: (err: Error) => toast.error(err.message),
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
      await logAudit(suspend ? 'SUSPEND_STAFF' : 'REACTIVATE_STAFF', `Staff ${userId} ${suspend ? 'suspended' : 'reactivated'}`);
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

  const transferShopMutation = useMutation({
    mutationFn: async () => {
      if (!selectedStaff || !transferTargetShopId || !store?.id) return;
      
      const shopIdToSet = transferTargetShopId === 'none' ? null : transferTargetShopId;
      
      // Update shop_id for roles in this business
      const { error } = await supabase
        .from('user_roles')
        .update({ shop_id: shopIdToSet })
        .eq('user_id', selectedStaff.id)
        .eq('business_id', store.id);

      if (error) throw error;

      const oldShopNames = selectedStaff.roles
        .filter(r => r.shop?.name) // Filter roles with shop name
        .map(r => r.shop?.name)
        .join(', ') || 'All Shops';
        
      const newShopName = shops?.find(s => s.id === transferTargetShopId)?.name || 'All Shops';

      await logAudit('TRANSFER_STAFF', `Transferred ${selectedStaff.name} from [${oldShopNames}] to [${newShopName}]`);
    },
    onSuccess: () => {
      toast.success("Staff transferred successfully");
      queryClient.invalidateQueries({ queryKey: ['tenant-staff'] });
      setIsTransferDialogOpen(false);
      setSelectedStaff(null);
      setTransferTargetShopId('');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteStaffMutation = useMutation({
    mutationFn: async () => {
      if (!selectedStaff || !store?.id) return;
      
      // Remove roles for this business
      const { error: rolesError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', selectedStaff.id)
        .eq('business_id', store.id);
        
      if (rolesError) throw rolesError;

      // Remove from user_businesses
      const { error: businessError } = await supabase
        .from('user_businesses')
        .delete()
        .eq('user_id', selectedStaff.id)
        .eq('business_id', store.id);

      if (businessError) throw businessError;

      await logAudit('DELETE_STAFF', `Removed staff member ${selectedStaff.name} from business`);
    },
    onSuccess: () => {
      toast.success("Staff member removed");
      queryClient.invalidateQueries({ queryKey: ['tenant-staff'] });
      setIsDeleteDialogOpen(false);
      setSelectedStaff(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Batch states
  const [selectedBatchIds, setSelectedBatchIds] = useState<string[]>([]);
  const [isBatchTransferDialogOpen, setIsBatchTransferDialogOpen] = useState(false);
  const [isBatchDeleteDialogOpen, setIsBatchDeleteDialogOpen] = useState(false);

  // Batch Transfer Mutation
  const batchTransferMutation = useMutation({
    mutationFn: async () => {
      if (selectedBatchIds.length === 0 || !transferTargetShopId || !store?.id) return;
      
      const shopIdToSet = transferTargetShopId === 'none' ? null : transferTargetShopId;
      
      // Update shop_id for roles in this business for all selected users
      const { error } = await supabase
        .from('user_roles')
        .update({ shop_id: shopIdToSet })
        .in('user_id', selectedBatchIds)
        .eq('business_id', store.id);

      if (error) throw error;
      
      const newShopName = shops?.find(s => s.id === transferTargetShopId)?.name || 'All Shops';
      await logAudit('BATCH_TRANSFER_STAFF', `Transferred ${selectedBatchIds.length} staff members to [${newShopName}]`);
    },
    onSuccess: () => {
      toast.success("Batch transfer successful");
      queryClient.invalidateQueries({ queryKey: ['tenant-staff'] });
      setIsBatchTransferDialogOpen(false);
      setSelectedBatchIds([]);
      setTransferTargetShopId('');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Batch Delete Mutation
  const batchDeleteMutation = useMutation({
    mutationFn: async () => {
      if (selectedBatchIds.length === 0 || !store?.id) return;
      
      // Remove roles for this business
      const { error: rolesError } = await supabase
        .from('user_roles')
        .delete()
        .in('user_id', selectedBatchIds)
        .eq('business_id', store.id);
        
      if (rolesError) throw rolesError;

      // Remove from user_businesses
      const { error: businessError } = await supabase
        .from('user_businesses')
        .delete()
        .in('user_id', selectedBatchIds)
        .eq('business_id', store.id);

      if (businessError) throw businessError;

      await logAudit('BATCH_DELETE_STAFF', `Removed ${selectedBatchIds.length} staff members from business`);
    },
    onSuccess: () => {
      toast.success("Batch removal successful");
      queryClient.invalidateQueries({ queryKey: ['tenant-staff'] });
      setIsBatchDeleteDialogOpen(false);
      setSelectedBatchIds([]);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Calculate stats
  const totalStaff = staff.length;
  const activeStaff = staff.filter(s => !s.is_suspended).length;
  const managers = staff.filter(s => 
    s.roles.some(r => r.role === 'branch_manager' || r.role === 'admin')
  ).length;
  const suspendedStaff = staff.filter(s => s.is_suspended).length;

  const enhancedStaff = staff.map(s => ({
    ...s,
    roles: s.roles.map(r => ({
      ...r,
      shop: shops.find(shop => shop.id === r.shop_id)
    }))
  }));

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
              data={enhancedStaff}
              isLoading={staffLoading}
              onEdit={(member) => {
                setSelectedStaff(member);
                setIsEditDialogOpen(true);
              }}
              onSuspend={(userId, suspend) => suspendMutation.mutate({ userId, suspend })}
              onTransfer={(member) => {
                setSelectedStaff(member);
                setTransferTargetShopId(member.roles[0]?.shop_id || 'none');
                setIsTransferDialogOpen(true);
              }}
              onDelete={(staffId) => {
                const member = enhancedStaff.find(s => s.id === staffId);
                if (member) {
                  setSelectedStaff(member);
                  setIsDeleteDialogOpen(true);
                }
              }}
              onManagePermissions={(member) => {
                setSelectedStaff(member);
                setIsPermissionsDialogOpen(true);
              }}
              onBatchTransfer={(ids) => {
                setSelectedBatchIds(ids);
                setTransferTargetShopId('');
                setIsBatchTransferDialogOpen(true);
              }}
              onBatchDelete={(ids) => {
                setSelectedBatchIds(ids);
                setIsBatchDeleteDialogOpen(true);
              }}
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
      
      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Staff Member</DialogTitle>
            <DialogDescription>
              Update staff member details and role assignment.
            </DialogDescription>
          </DialogHeader>
          {selectedStaff && (
            <StaffForm
              initialData={{
                name: selectedStaff.name,
                email: selectedStaff.email,
                phone: selectedStaff.phone || '',
                role: selectedStaff.roles[0]?.role || '',
                shopId: selectedStaff.roles[0]?.shop_id || 'none',
              }}
              isEditing={true}
              onSubmit={(data) => updateStaffMutation.mutate(data)}
              isLoading={updateStaffMutation.isPending}
              shops={shops}
              manageableRoles={manageableRoles}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Transfer Dialog */}
      <Dialog open={isTransferDialogOpen} onOpenChange={setIsTransferDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Transfer Shop</DialogTitle>
            <DialogDescription>
              Move {selectedStaff?.name} to another shop. This will update their role assignment.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Current Shop</Label>
              <div className="p-2 border rounded-md bg-muted text-sm">
                {selectedStaff?.roles.map(r => r.shop?.name).filter(Boolean).join(', ') || 'Headquarters'}
              </div>
            </div>
            <div className="space-y-2">
              <Label>New Shop</Label>
              <Select value={transferTargetShopId} onValueChange={setTransferTargetShopId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select new shop" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Headquarters (No Shop)</SelectItem>
                  {shops?.map((shop) => (
                    <SelectItem key={shop.id} value={shop.id}>
                      {shop.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTransferDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => transferShopMutation.mutate()} disabled={transferShopMutation.isPending}>
              {transferShopMutation.isPending ? 'Transferring...' : 'Transfer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Staff Member?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {selectedStaff?.name} from this business? This action cannot be undone.
              The user account will remain but they will lose access to this business.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => {
                e.preventDefault();
                deleteStaffMutation.mutate();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteStaffMutation.isPending}
            >
              {deleteStaffMutation.isPending ? 'Removing...' : 'Remove Staff'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Batch Transfer Dialog */}
      <Dialog open={isBatchTransferDialogOpen} onOpenChange={setIsBatchTransferDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Batch Transfer Staff</DialogTitle>
            <DialogDescription>
              Move {selectedBatchIds.length} staff members to another shop.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>New Shop</Label>
              <Select value={transferTargetShopId} onValueChange={setTransferTargetShopId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select new shop" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Headquarters (No Shop)</SelectItem>
                  {shops?.map((shop) => (
                    <SelectItem key={shop.id} value={shop.id}>
                      {shop.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBatchTransferDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => batchTransferMutation.mutate()} disabled={batchTransferMutation.isPending}>
              {batchTransferMutation.isPending ? 'Transferring...' : 'Transfer All'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Batch Delete Dialog */}
      <AlertDialog open={isBatchDeleteDialogOpen} onOpenChange={setIsBatchDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Selected Staff?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {selectedBatchIds.length} staff members from this business?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => {
                e.preventDefault();
                batchDeleteMutation.mutate();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={batchDeleteMutation.isPending}
            >
              {batchDeleteMutation.isPending ? 'Removing...' : 'Remove All'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {selectedStaff && store?.id && (
        <UserPermissionManagement
          userId={selectedStaff.id}
          userName={selectedStaff.name}
          businessId={store.id}
          isOpen={isPermissionsDialogOpen}
          onClose={() => setIsPermissionsDialogOpen(false)}
        />
      )}
    </TenantPageWrapper>
  );
}
