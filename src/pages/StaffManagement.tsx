import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Layout } from '@/components/Layout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Users, UserPlus, Ban, CheckCircle, Eye, EyeOff } from 'lucide-react';

export default function StaffManagement() {
  const { user, roles } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newStaff, setNewStaff] = useState({
    email: '',
    password: '',
    name: '',
    phone: '',
    role: '',
    shopId: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState('');

  const isSuperAdmin = roles.some(r => r.role === 'super_admin');
  const isBranchManager = roles.some(r => r.role === 'branch_manager');

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

  // Fetch manageable roles based on current user's role
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

  // Fetch all staff members with shop info
  const { data: staffMembers, isLoading } = useQuery({
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

      const { data: shops, error: shopsError } = await supabase
        .from('shops')
        .select('id, name');

      if (shopsError) throw shopsError;

      return profiles.map(profile => {
        const profileRoles = userRoles.filter(ur => ur.user_id === profile.id);
        return {
          ...profile,
          roles: profileRoles.map(role => ({
            ...role,
            shop: role.shop_id ? shops?.find(s => s.id === role.shop_id) : null,
          })),
        };
      });
    },
    enabled: !!user,
  });

  const generatePassword = () => {
    const length = 12;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    setGeneratedPassword(password);
    setNewStaff({ ...newStaff, password });
  };

  const createStaffMutation = useMutation({
    mutationFn: async (staffData: typeof newStaff) => {
      // Create user account
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: staffData.email,
        password: staffData.password,
        email_confirm: true,
        user_metadata: {
          name: staffData.name,
          phone: staffData.phone,
        },
      });

      if (authError) throw authError;

      // Set must_change_password flag
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ must_change_password: true })
        .eq('id', authData.user.id);

      if (profileError) throw profileError;

      // Assign role and shop
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert([{
          user_id: authData.user.id,
          role: staffData.role as "owner" | "manager" | "staff", // Casting to expected union if possible, or string
          shop_id: staffData.shopId || null,
        }]);

      if (roleError) throw roleError;

      return authData;
    },
    onSuccess: () => {
      toast({
        title: "Staff member created",
        description: `${newStaff.name} has been added successfully.`,
      });
      queryClient.invalidateQueries({ queryKey: ['staffMembers'] });
      setIsCreateDialogOpen(false);
      setNewStaff({ email: '', password: '', name: '', phone: '', role: '', shopId: '' });
      setGeneratedPassword('');
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "An error occurred";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    },
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
    },
    onSuccess: (_, variables) => {
      toast({
        title: variables.suspend ? "Staff suspended" : "Staff reactivated",
        description: `Staff member has been ${variables.suspend ? 'suspended' : 'reactivated'}.`,
      });
      queryClient.invalidateQueries({ queryKey: ['staffMembers'] });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "An error occurred";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    },
  });

  const getRoleBadgeColor = (role: string) => {
    const colors: Record<string, string> = {
      super_admin: 'bg-purple-500',
      branch_manager: 'bg-blue-500',
      admin: 'bg-red-500',
      manager: 'bg-orange-500',
      seller: 'bg-green-500',
      store_keeper: 'bg-cyan-500',
      accountant: 'bg-indigo-500',
      manpower: 'bg-yellow-500',
      delivery: 'bg-pink-500',
      customer: 'bg-gray-500',
    };
    return colors[role] || 'bg-gray-500';
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
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      value={newStaff.name}
                      onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })}
                      placeholder="John Doe"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newStaff.email}
                      onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
                      placeholder="john@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={newStaff.phone}
                      onChange={(e) => setNewStaff({ ...newStaff, phone: e.target.value })}
                      placeholder="+250 xxx xxx xxx"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Select value={newStaff.role} onValueChange={(value) => setNewStaff({ ...newStaff, role: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                      <SelectContent>
                        {manageableRoles?.map((role) => (
                          <SelectItem key={role} value={role}>
                            {role.replace('_', ' ').toUpperCase()}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="shop">Assign to Shop (Optional)</Label>
                    <Select value={newStaff.shopId} onValueChange={(value) => setNewStaff({ ...newStaff, shopId: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a shop" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No shop assignment</SelectItem>
                        {shops?.map((shop) => (
                          <SelectItem key={shop.id} value={shop.id}>
                            {shop.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">Initial Password</Label>
                      <Button type="button" variant="outline" size="sm" onClick={generatePassword}>
                        Generate
                      </Button>
                    </div>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        value={newStaff.password}
                        onChange={(e) => setNewStaff({ ...newStaff, password: e.target.value })}
                        placeholder="Enter or generate password"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    {generatedPassword && (
                      <p className="text-sm text-muted-foreground">
                        Save this password securely. It will not be shown again.
                      </p>
                    )}
                  </div>
                </div>
                <Button
                  onClick={() => createStaffMutation.mutate(newStaff)}
                  disabled={createStaffMutation.isPending || !newStaff.email || !newStaff.password || !newStaff.role}
                  className="w-full"
                >
                  {createStaffMutation.isPending ? "Creating..." : "Create Staff Member"}
                </Button>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Staff Members</CardTitle>
              <CardDescription>View and manage all staff accounts</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Roles</TableHead>
                      <TableHead>Shop</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {staffMembers?.map((staff) => (
                      <TableRow key={staff.id}>
                        <TableCell className="font-medium">{staff.name}</TableCell>
                        <TableCell>{staff.id}</TableCell>
                        <TableCell>{staff.phone || 'N/A'}</TableCell>
                        <TableCell>
                          <div className="flex gap-1 flex-wrap">
                            {staff.roles.map((role) => (
                              <Badge key={role.id} className={getRoleBadgeColor(role.role)}>
                                {role.role.replace('_', ' ')}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          {staff.roles[0]?.shop?.name || 'All shops'}
                        </TableCell>
                        <TableCell>
                          {staff.is_suspended ? (
                            <Badge variant="destructive">Suspended</Badge>
                          ) : staff.must_change_password ? (
                            <Badge variant="outline">Password Change Required</Badge>
                          ) : (
                            <Badge variant="default">Active</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {staff.is_suspended ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => suspendStaffMutation.mutate({ userId: staff.id, suspend: false })}
                                disabled={suspendStaffMutation.isPending}
                              >
                                <CheckCircle className="mr-1 h-3 w-3" />
                                Reactivate
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => suspendStaffMutation.mutate({ userId: staff.id, suspend: true })}
                                disabled={suspendStaffMutation.isPending}
                              >
                                <Ban className="mr-1 h-3 w-3" />
                                Suspend
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
