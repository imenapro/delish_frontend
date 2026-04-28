import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Layout } from '@/components/Layout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, UserPlus, ArrowRightLeft, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
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

import { StaffTable, StaffMember } from '@/components/staff/StaffTableEnhanced';
import { StaffForm, StaffFormValues } from '@/components/staff/StaffForm';

export default function StaffManagement() {
  const { user, roles } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Dialog States
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isTransferDialogOpen, setIsTransferDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isBatchTransferDialogOpen, setIsBatchTransferDialogOpen] = useState(false);
  const [isBatchDeleteDialogOpen, setIsBatchDeleteDialogOpen] = useState(false);

  // Selected Data States
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
  const [transferTargetShopId, setTransferTargetShopId] = useState<string>('');

  // Fetch shops
  const { data: shops } = useQuery({
    queryKey: ['shops'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shops')
        .select('*')
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch manageable roles
  const { data: manageableRoles } = useQuery({
    queryKey: ['manageableRoles', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('role_hierarchy')
        .select('child_role')
        .in('parent_role', roles.map(r => r.role));
      
      if (error) throw error;
      return [...new Set(data.map(r => r.child_role))];
    },
    enabled: !!user,
  });

  // Fetch staff
  const { data: staffMembers, isLoading, error } = useQuery({
    queryKey: ['staffMembers'],
    queryFn: async () => {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*');

      if (rolesError) throw rolesError;

      return profiles.map(profile => {
        const profileRoles = userRoles.filter(ur => ur.user_id === profile.id);
        return {
          ...profile,
          roles: profileRoles.map(role => ({
            ...role,
            shop: role.shop_id ? shops?.find(s => s.id === role.shop_id) : null,
          })),
        };
      }) as StaffMember[];
    },
    enabled: !!user && !!shops,
  });

  // Helper for audit logs
  const logAudit = async (action: string, details: string) => {
    try {
      await supabase.from('audit_logs').insert({
        action,
        details,
        performed_by: user?.id,
        created_at: new Date().toISOString(),
      });
    } catch (e) {
      console.warn('Audit log failed', e);
    }
  };

  // Mutations
  const createStaffMutation = useMutation({
    mutationFn: async (staffData: StaffFormValues) => {
      // 1. Determine businessId (logic from original file)
      let businessId = null;
      if (staffData.shopId && staffData.shopId !== 'none' && shops) {
        const selectedShop = shops.find(s => s.id === staffData.shopId);
        if (selectedShop?.business_id) businessId = selectedShop.business_id;
      }
      if (!businessId && roles.length > 0) {
        const roleWithBusiness = roles.find(r => r.business_id);
        if (roleWithBusiness) businessId = roleWithBusiness.business_id;
      }

      // 2. Create user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: staffData.email,
        password: staffData.password,
        email_confirm: true,
        user_metadata: { name: staffData.name, phone: staffData.phone },
      });

      if (authError) {
          if (authError.message?.includes('already registered')) {
             throw new Error('This email address is already registered.');
          }
          throw authError;
      }

      // 3. Update profile & roles
      try {
        await supabase.from('profiles').update({ must_change_password: true }).eq('id', authData.user.id);
        await supabase.from('user_roles').insert([{
          user_id: authData.user.id,
          role: staffData.role as any,
          shop_id: staffData.shopId && staffData.shopId !== 'none' ? staffData.shopId : null,
          business_id: businessId
        }]);
        
        await logAudit('CREATE_STAFF', `Created staff member ${staffData.name} (${staffData.email})`);
      } catch (err) {
        // Rollback
        await supabase.auth.admin.deleteUser(authData.user.id);
        throw err;
      }
    },
    onSuccess: () => {
      toast({ title: "Staff member created" });
      queryClient.invalidateQueries({ queryKey: ['staffMembers'] });
      setIsCreateDialogOpen(false);
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const updateStaffMutation = useMutation({
    mutationFn: async (staffData: StaffFormValues) => {
      if (!selectedStaff) return;
      
      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ name: staffData.name, phone: staffData.phone })
        .eq('id', selectedStaff.id);
      if (profileError) throw profileError;

      // Update roles (simplified: remove old, add new for primary role)
      // Note: This replaces all roles with the single selected role. 
      // For a more complex multi-role system, we'd need a better UI.
      // Based on the form, we treat it as single role.
      
      // Get businessId
      let businessId = null;
      if (staffData.shopId && staffData.shopId !== 'none' && shops) {
          const s = shops.find(sh => sh.id === staffData.shopId);
          if (s) businessId = s.business_id;
      }

      // Delete existing roles
      await supabase.from('user_roles').delete().eq('user_id', selectedStaff.id);
      
      // Insert new role
      const { error: roleError } = await supabase.from('user_roles').insert([{
        user_id: selectedStaff.id,
        role: (staffData.role || selectedStaff.roles[0]?.role || 'customer') as any,
        shop_id: staffData.shopId && staffData.shopId !== 'none' ? staffData.shopId : null,
        business_id: businessId
      }]);

      if (roleError) throw roleError;

      await logAudit('UPDATE_STAFF', `Updated staff member ${staffData.name}`);
    },
    onSuccess: () => {
      toast({ title: "Staff member updated" });
      queryClient.invalidateQueries({ queryKey: ['staffMembers'] });
      setIsEditDialogOpen(false);
      setSelectedStaff(null);
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const transferShopMutation = useMutation({
    mutationFn: async () => {
      if (!selectedStaff || !transferTargetShopId) return;
      
      // Update shop_id for all roles of this user
      // Note: This moves ALL their roles to the new shop.
      const shopIdToSet = transferTargetShopId === 'none' ? null : transferTargetShopId;
      
      const { error } = await supabase
        .from('user_roles')
        .update({ shop_id: shopIdToSet })
        .eq('user_id', selectedStaff.id);

      if (error) throw error;

      const oldShopNames = selectedStaff.roles.map(r => r.shop?.name || 'None').join(', ');
      const newShopName = shops?.find(s => s.id === transferTargetShopId)?.name || 'None';

      await logAudit('TRANSFER_STAFF', `Transferred ${selectedStaff.name} from [${oldShopNames}] to [${newShopName}]`);
    },
    onSuccess: () => {
      toast({ title: "Staff transferred successfully" });
      queryClient.invalidateQueries({ queryKey: ['staffMembers'] });
      setIsTransferDialogOpen(false);
      setSelectedStaff(null);
      setTransferTargetShopId('');
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteStaffMutation = useMutation({
    mutationFn: async () => {
      if (!selectedStaff) return;
      
      // Delete user (cascades to profile usually, but we do explicitly if needed)
      const { error } = await supabase.auth.admin.deleteUser(selectedStaff.id);
      if (error) throw error;

      await logAudit('DELETE_STAFF', `Deleted staff member ${selectedStaff.name} (${selectedStaff.email})`);
    },
    onSuccess: () => {
      toast({ title: "Staff member deleted" });
      queryClient.invalidateQueries({ queryKey: ['staffMembers'] });
      setIsDeleteDialogOpen(false);
      setSelectedStaff(null);
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const suspendStaffMutation = useMutation({
    mutationFn: async ({ userId, suspend }: { userId: string; suspend: boolean }) => {
      const { error } = await supabase
        .from('profiles')
        .update({
          is_suspended: suspend,
          suspended_at: suspend ? new Date().toISOString() : null,
          suspended_by: suspend ? user?.id : null,
        })
        .eq('id', userId);

      if (error) throw error;
      await logAudit(suspend ? 'SUSPEND_STAFF' : 'REACTIVATE_STAFF', `Staff ${userId} ${suspend ? 'suspended' : 'reactivated'}`);
    },
    onSuccess: (_, variables) => {
      toast({ title: variables.suspend ? "Staff suspended" : "Staff reactivated" });
      queryClient.invalidateQueries({ queryKey: ['staffMembers'] });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const batchTransferMutation = useMutation({
    mutationFn: async () => {
      const selectedIds = Object.keys(rowSelection);
      if (selectedIds.length === 0 || !transferTargetShopId) return;

      const shopIdToSet = transferTargetShopId === 'none' ? null : transferTargetShopId;
      const newShopName = shops?.find(s => s.id === transferTargetShopId)?.name || 'None';

      // Perform updates in parallel
      await Promise.all(selectedIds.map(async (userId) => {
        const { error } = await supabase
          .from('user_roles')
          .update({ shop_id: shopIdToSet })
          .eq('user_id', userId);
        
        if (error) throw error;
        
        // Find staff name for log
        const staff = staffMembers?.find(s => s.id === userId);
        const staffName = staff?.name || userId;
        await logAudit('TRANSFER_STAFF', `Batch transferred ${staffName} to [${newShopName}]`);
      }));
    },
    onSuccess: () => {
      toast({ title: "Batch transfer successful" });
      queryClient.invalidateQueries({ queryKey: ['staffMembers'] });
      setIsBatchTransferDialogOpen(false);
      setRowSelection({});
      setTransferTargetShopId('');
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const batchDeleteMutation = useMutation({
    mutationFn: async () => {
      const selectedIds = Object.keys(rowSelection);
      if (selectedIds.length === 0) return;

      await Promise.all(selectedIds.map(async (userId) => {
        const { error } = await supabase.auth.admin.deleteUser(userId);
        if (error) throw error;

        const staff = staffMembers?.find(s => s.id === userId);
        const staffName = staff?.name || userId;
        await logAudit('DELETE_STAFF', `Batch deleted staff member ${staffName}`);
      }));
    },
    onSuccess: () => {
      toast({ title: "Batch delete successful" });
      queryClient.invalidateQueries({ queryKey: ['staffMembers'] });
      setIsBatchDeleteDialogOpen(false);
      setRowSelection({});
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  // Handlers
  const handleEdit = (staff: StaffMember) => {
    setSelectedStaff(staff);
    setIsEditDialogOpen(true);
  };

  const handleTransfer = (staff: StaffMember) => {
    setSelectedStaff(staff);
    // Default to first role's shop or none
    setTransferTargetShopId(staff.roles[0]?.shop_id || 'none');
    setIsTransferDialogOpen(true);
  };

  const handleDelete = (staffId: string) => {
    const staff = staffMembers?.find(s => s.id === staffId);
    if (staff) {
      setSelectedStaff(staff);
      setIsDeleteDialogOpen(true);
    }
  };

  return (
    <ProtectedRoute requiredRoles={['super_admin', 'branch_manager']}>
      <Layout>
        <div className="container mx-auto py-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <Users className="h-8 w-8" />
                Staff Management
              </h1>
              <p className="text-muted-foreground">
                Create and manage staff accounts
              </p>
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Add Staff
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Create New Staff Member</DialogTitle>
                  <DialogDescription>
                    Enter the staff member's details. They will be required to change their password on first login.
                  </DialogDescription>
                </DialogHeader>
                <StaffForm
                  onSubmit={(data) => createStaffMutation.mutate(data)}
                  isLoading={createStaffMutation.isPending}
                  shops={shops}
                  manageableRoles={manageableRoles}
                />
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Staff Members</CardTitle>
                <CardDescription>View and manage all staff accounts</CardDescription>
              </div>
              {Object.keys(rowSelection).length > 0 && (
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setIsBatchTransferDialogOpen(true)}>
                    <ArrowRightLeft className="mr-2 h-4 w-4" />
                    Transfer ({Object.keys(rowSelection).length})
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => setIsBatchDeleteDialogOpen(true)}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete ({Object.keys(rowSelection).length})
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent>
              {error ? (
                <div className="flex flex-col items-center justify-center py-8 text-destructive">
                  <p>Error loading staff members. Please try again.</p>
                  <p className="text-sm text-muted-foreground mt-2">{(error as Error).message}</p>
                </div>
              ) : (
                <StaffTable
                  data={staffMembers || []}
                  isLoading={isLoading}
                  onEdit={handleEdit}
                  onTransfer={handleTransfer}
                  onDelete={handleDelete}
                  onSuspend={(id, suspend) => suspendStaffMutation.mutate({ userId: id, suspend })}
                  rowSelection={rowSelection}
                  setRowSelection={setRowSelection}
                />
              )}
            </CardContent>
          </Card>

          {/* Edit Dialog */}
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Edit Staff Member</DialogTitle>
                <DialogDescription>
                  Update staff details.
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
                  onSubmit={(data) => updateStaffMutation.mutate(data)}
                  isEditing
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
                  Move {selectedStaff?.name} to another shop. This will update all their roles.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Current Shop</Label>
                  <div className="p-2 border rounded-md bg-muted">
                    {selectedStaff?.roles.map(r => r.shop?.name).filter(Boolean).join(', ') || 'None'}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>New Shop</Label>
                  <Select value={transferTargetShopId} onValueChange={setTransferTargetShopId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select new shop" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">All Shops</SelectItem>
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
                  {transferShopMutation.isPending ? 'Transferring...' : 'Confirm Transfer'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Delete Confirmation */}
          <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the staff member
                  <strong> {selectedStaff?.name}</strong> and remove their access to the system.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={() => deleteStaffMutation.mutate()}
                  disabled={deleteStaffMutation.isPending}
                >
                  {deleteStaffMutation.isPending ? 'Deleting...' : 'Delete Staff'}
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
                  Move {Object.keys(rowSelection).length} selected staff members to another shop.
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
                      <SelectItem value="none">All Shops</SelectItem>
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
                <Button onClick={() => batchTransferMutation.mutate()} disabled={batchTransferMutation.isPending || !transferTargetShopId}>
                  {batchTransferMutation.isPending ? 'Transferring...' : 'Confirm Transfer'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Batch Delete Confirmation */}
          <AlertDialog open={isBatchDeleteDialogOpen} onOpenChange={setIsBatchDeleteDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete 
                  <strong> {Object.keys(rowSelection).length}</strong> staff members and remove their access to the system.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={() => batchDeleteMutation.mutate()}
                  disabled={batchDeleteMutation.isPending}
                >
                  {batchDeleteMutation.isPending ? 'Deleting...' : 'Delete All Selected'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

        </div>
      </Layout>
    </ProtectedRoute>
  );
}
