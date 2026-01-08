import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStoreContext } from '@/contexts/StoreContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Pencil, Trash2, Shield, History, Users, Menu as MenuIcon, Info, Check, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AuditLogsTable } from '@/components/admin/AuditLogsTable';
import { PermissionGuard } from '@/components/auth/PermissionGuard';
import { MenuManagement } from '@/components/admin/MenuManagement';

interface Role {
  id: string;
  name: string;
  description: string | null;
  is_system: boolean;
}

interface Permission {
  id: string;
  code: string;
  description: string | null;
  module: string | null;
}

export function RoleManagement() {
  const { store } = useStoreContext();
  const queryClient = useQueryClient();
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("edit");
  
  // Form states
  const [roleName, setRoleName] = useState('');
  const [roleDescription, setRoleDescription] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  // Fetch Roles
  const { data: roles = [], isLoading: rolesLoading } = useQuery({
    queryKey: ['roles', store?.id],
    queryFn: async () => {
      if (!store?.id) return [];
      const { data, error } = await supabase
        .from('roles')
        .select('*')
        .or(`business_id.eq.${store.id},is_system.eq.true`)
        .order('name');
      if (error) throw error;
      return data as Role[];
    },
    enabled: !!store?.id
  });

  // Fetch Permissions
  const { data: permissions = [] } = useQuery({
    queryKey: ['permissions'],
    queryFn: async () => {
      const { data, error } = await supabase.from('permissions').select('*').order('module, code');
      if (error) throw error;
      return data as Permission[];
    },
  });

  // Fetch Role Permissions (when a role is selected)
  const { data: rolePermissions = [] } = useQuery({
    queryKey: ['role_permissions', selectedRole?.id],
    queryFn: async () => {
      if (!selectedRole) return [];
      const { data, error } = await supabase
        .from('role_permissions')
        .select('permission_id')
        .eq('role_id', selectedRole.id);
      if (error) throw error;
      return data.map((rp: { permission_id: string }) => rp.permission_id);
    },
    enabled: !!selectedRole
  });

  // Group permissions by module
  const groupedPermissions = permissions.reduce((acc, perm) => {
    const module = perm.module || 'Other';
    if (!acc[module]) acc[module] = [];
    acc[module].push(perm);
    return acc;
  }, {} as Record<string, Permission[]>);

  function getPermissionType(code: string): 'view' | 'create' | 'edit' | 'delete' | 'other' {
    const parts = code.split('.');
    const action = parts[parts.length - 1].toLowerCase();
    
    if (['view', 'access', 'read', 'list', 'show'].includes(action)) return 'view';
    if (['create', 'add', 'insert', 'new'].includes(action)) return 'create';
    if (['edit', 'update', 'modify', 'change', 'manage'].includes(action)) return 'edit';
    if (['delete', 'remove', 'destroy', 'archive'].includes(action)) return 'delete';
    return 'other';
  }

  // Mutations
  const createRoleMutation = useMutation({
    mutationFn: async () => {
      if (!store?.id) throw new Error("No active store");
      const { data, error } = await supabase
        .from('roles')
        .insert({ 
          name: roleName, 
          description: roleDescription,
          business_id: store.id,
          is_system: false
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setIsDialogOpen(false);
      setRoleName('');
      setRoleDescription('');
      toast.success('Role created successfully');
    },
    onError: (error) => {
      toast.error(`Error creating role: ${error.message}`);
    }
  });

  const deleteRoleMutation = useMutation({
    mutationFn: async (roleId: string) => {
      const { error } = await supabase
        .from('roles')
        .delete()
        .eq('id', roleId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      toast.success('Role deleted successfully');
    },
    onError: (error) => {
      toast.error(`Error deleting role: ${error.message}`);
    }
  });

  const updateRoleMutation = useMutation({
    mutationFn: async () => {
      if (!selectedRole) return;
      
      // 1. Update Role Details
      const { error: roleError } = await supabase
        .from('roles')
        .update({ description: roleDescription }) // Name is usually immutable or careful
        .eq('id', selectedRole.id);
      
      if (roleError) throw roleError;

      // 2. Update Permissions (Delete all, then insert new)
      const { error: deleteError } = await supabase
        .from('role_permissions')
        .delete()
        .eq('role_id', selectedRole.id);
        
      if (deleteError) throw deleteError;

      if (selectedPermissions.length > 0) {
        const { error: insertError } = await supabase
          .from('role_permissions')
          .insert(
            selectedPermissions.map(pId => ({
              role_id: selectedRole.id,
              permission_id: pId
            }))
          );
        
        if (insertError) throw insertError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      queryClient.invalidateQueries({ queryKey: ['role_permissions'] });
      setIsEditDialogOpen(false);
      toast.success('Role updated successfully');
    },
    onError: (error) => {
      toast.error(`Error updating role: ${error.message}`);
    }
  });

  const handleEditClick = (role: Role) => {
    setSelectedRole(role);
    setRoleName(role.name);
    setRoleDescription(role.description || '');
    setIsEditDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Access Control</h2>
          <p className="text-muted-foreground">
            Manage system roles, permissions, menus, and audit logs.
          </p>
        </div>
      </div>

      <Tabs defaultValue="roles" className="w-full">
        <TabsList>
          <TabsTrigger value="roles">
            <Users className="mr-2 h-4 w-4" />
            Roles & Permissions
          </TabsTrigger>
          <TabsTrigger value="menus">
            <MenuIcon className="mr-2 h-4 w-4" />
            Menu Configuration
          </TabsTrigger>
          <TabsTrigger value="audit">
            <History className="mr-2 h-4 w-4" />
            Audit Logs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="roles" className="space-y-4">
          <div className="flex justify-end">
            <PermissionGuard requiredPermission="roles.manage">
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Role
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Role</DialogTitle>
                    <DialogDescription>
                      Define a new role for your organization.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <label htmlFor="name">Role Name</label>
                      <Input 
                        id="name" 
                        value={roleName} 
                        onChange={(e) => setRoleName(e.target.value)} 
                        placeholder="e.g. Shift Supervisor"
                      />
                    </div>
                    <div className="grid gap-2">
                      <label htmlFor="description">Description</label>
                      <Input 
                        id="description" 
                        value={roleDescription} 
                        onChange={(e) => setRoleDescription(e.target.value)} 
                        placeholder="Role description"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                    <Button onClick={() => {
                      if (roles.some(r => r.name.toLowerCase() === roleName.toLowerCase())) {
                        toast.error("A role with this name already exists.");
                        return;
                      }
                      createRoleMutation.mutate();
                    }}>Create Role</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </PermissionGuard>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Role Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roles.map((role) => (
                  <TableRow key={role.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-muted-foreground" />
                        {role.name}
                      </div>
                    </TableCell>
                    <TableCell>{role.description}</TableCell>
                    <TableCell>
                      <Badge variant={role.is_system ? "secondary" : "outline"}>
                        {role.is_system ? "System" : "Custom"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <PermissionGuard requiredPermission="roles.manage" fallback={<span className="text-xs text-muted-foreground">Read Only</span>}>
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleEditClick(role)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {!role.is_system && (
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => {
                                if (confirm(`Are you sure you want to delete the role "${role.name}"?`)) {
                                  deleteRoleMutation.mutate(role.id);
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </PermissionGuard>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="menus">
           <PermissionGuard requiredPermission="menus.manage" fallback={<div className="p-4 text-center text-muted-foreground">You do not have permission to manage menus.</div>}>
             <MenuManagement />
           </PermissionGuard>
        </TabsContent>

        <TabsContent value="audit">
           <PermissionGuard requiredPermission="audit.view" fallback={<div className="p-4 text-center text-muted-foreground">You do not have permission to view audit logs.</div>}>
             <AuditLogsTable />
           </PermissionGuard>
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
        setIsEditDialogOpen(open);
        if (!open) setActiveTab("edit");
      }}>
        <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-6 py-4 border-b flex-none">
            <DialogTitle>Edit Role: {selectedRole?.name}</DialogTitle>
            <DialogDescription>
              Configure access levels and menu visibility for this role.
            </DialogDescription>
          </DialogHeader>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden min-h-0">
            <div className="px-6 py-2 border-b bg-muted/40 flex-none">
                <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
                  <TabsTrigger value="edit">1. Configure Permissions</TabsTrigger>
                  <TabsTrigger value="review">2. Review & Save</TabsTrigger>
                </TabsList>
            </div>

            <TabsContent value="edit" className="flex-1 flex flex-col mt-0 p-0">
               <div className="px-6 py-4 space-y-4 flex-none">
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>Configuration Guide</AlertTitle>
                    <AlertDescription>
                      Select the modules and specific actions this role can access. 
                      Hover over options for details. Changes are not saved until you confirm in the Review step.
                    </AlertDescription>
                  </Alert>
                  
                  <div className="grid gap-2">
                    <label htmlFor="edit-description" className="text-sm font-medium">Role Description</label>
                    <Input 
                      id="edit-description" 
                      value={roleDescription} 
                      onChange={(e) => setRoleDescription(e.target.value)} 
                    />
                  </div>
               </div>
               
               <div className="px-6 pb-4 flex-1 min-h-0 overflow-hidden">
                 <ScrollArea className="h-full rounded-md border">
                   <div className="p-4">
                     <PermissionMatrix 
                       groupedPermissions={groupedPermissions}
                       selectedPermissions={selectedPermissions}
                       onToggle={(id) => {
                         setSelectedPermissions(prev => 
                           prev.includes(id) 
                             ? prev.filter(p => p !== id)
                             : [...prev, id]
                         );
                       }}
                       initialPermissions={rolePermissions}
                       setPermissions={setSelectedPermissions}
                     />
                   </div>
                 </ScrollArea>
               </div>
               
               <div className="p-6 border-t mt-auto flex justify-between items-center bg-background flex-none">
                  <div className="text-sm text-muted-foreground">
                    {selectedPermissions.length} permissions selected
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
                    <Button onClick={() => setActiveTab("review")}>
                      Review Changes <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
               </div>
            </TabsContent>

            <TabsContent value="review" className="flex-1 flex flex-col mt-0 p-0">
               <div className="px-6 py-4 flex-1 min-h-0 overflow-hidden">
                 <ScrollArea className="h-full rounded-md border">
                   <div className="p-4 space-y-6">
                     <div className="flex items-center gap-2 mb-6">
                       <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                         <Check className="h-6 w-6 text-primary" />
                       </div>
                       <div>
                         <h3 className="font-medium text-lg">Ready to update role</h3>
                         <p className="text-muted-foreground">Please review the assigned permissions below.</p>
                       </div>
                     </div>
                     
                     <PermissionMatrix 
                       groupedPermissions={groupedPermissions}
                       selectedPermissions={selectedPermissions}
                       onToggle={() => {}}
                       initialPermissions={[]} // No sync needed
                       setPermissions={() => {}}
                       readOnly={true}
                     />
                   </div>
                 </ScrollArea>
               </div>
               
               <div className="p-6 border-t mt-auto flex justify-between items-center bg-background flex-none">
                  <Button variant="ghost" onClick={() => setActiveTab("edit")}>Back to Edit</Button>
                  <Button onClick={() => updateRoleMutation.mutate()}>Confirm & Save Role</Button>
               </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PermissionMatrix({ 
  groupedPermissions, 
  selectedPermissions, 
  onToggle,
  initialPermissions,
  setPermissions,
  readOnly = false
}: { 
  groupedPermissions: Record<string, Permission[]>;
  selectedPermissions: string[];
  onToggle: (id: string) => void;
  initialPermissions: string[];
  setPermissions: (ids: string[]) => void;
  readOnly?: boolean;
}) {
  // Sync permissions when initialPermissions load
  useEffect(() => {
    if (initialPermissions && !readOnly) {
      setPermissions(initialPermissions);
    }
  }, [initialPermissions, setPermissions, readOnly]);

  function getPermissionType(code: string): 'view' | 'create' | 'edit' | 'delete' | 'other' {
    const parts = code.split('.');
    const action = parts[parts.length - 1].toLowerCase();
    
    if (['view', 'access', 'read', 'list', 'show'].includes(action)) return 'view';
    if (['create', 'add', 'insert', 'new'].includes(action)) return 'create';
    if (['edit', 'update', 'modify', 'change', 'manage'].includes(action)) return 'edit';
    if (['delete', 'remove', 'destroy', 'archive'].includes(action)) return 'delete';
    return 'other';
  }
  
  const displayPermissions = readOnly 
    ? Object.entries(groupedPermissions).reduce((acc, [mod, perms]) => {
        const selected = perms.filter(p => selectedPermissions.includes(p.id));
        if (selected.length > 0) acc[mod] = selected;
        return acc;
      }, {} as Record<string, Permission[]>)
    : groupedPermissions;

  if (Object.keys(displayPermissions).length === 0 && readOnly) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
        <Shield className="h-12 w-12 mb-4 opacity-20" />
        <p>No permissions assigned yet.</p>
      </div>
    );
  }

  const columns = [
    { key: 'view', label: 'View / Access' },
    { key: 'create', label: 'Create' },
    { key: 'edit', label: 'Edit' },
    { key: 'delete', label: 'Delete' },
  ];

  return (
    <div className="space-y-4 pb-8">
      {/* Desktop View */}
      <div className="hidden md:block rounded-md border bg-card">
        <Table>
          <TableHeader className="sticky top-0 bg-card z-10 shadow-sm">
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="w-[180px]">Module</TableHead>
              {columns.map(col => (
                <TableHead key={col.key} className="text-center w-[100px]">{col.label}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Object.entries(displayPermissions).map(([module, perms]) => {
              // Group permissions by type for this module
              const permsByType: Record<string, Permission[]> = {
                view: [], create: [], edit: [], delete: [], other: []
              };
              
              perms.forEach(p => {
                const type = getPermissionType(p.code);
                permsByType[type].push(p);
              });

              const allModuleIds = perms.map(p => p.id);
              const allSelected = allModuleIds.length > 0 && allModuleIds.every(id => selectedPermissions.includes(id));
              const someSelected = allModuleIds.some(id => selectedPermissions.includes(id));

              return (
                <TableRow key={module} className="hover:bg-muted/5">
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {!readOnly && (
                        <Checkbox 
                          checked={allSelected}
                          onCheckedChange={() => {
                            if (allSelected) {
                              setPermissions(selectedPermissions.filter(id => !allModuleIds.includes(id)));
                            } else {
                              setPermissions([...new Set([...selectedPermissions, ...allModuleIds])]);
                            }
                          }}
                          className={allSelected ? "" : (someSelected ? "opacity-50" : "")}
                          aria-label={`Select all ${module} permissions`}
                        />
                      )}
                      <Badge variant="outline" className="font-normal capitalize">{module}</Badge>
                    </div>
                  </TableCell>
                  
                  {columns.map(col => (
                    <TableCell key={col.key} className="text-center p-2">
                      <div className="flex flex-col items-center gap-2">
                        {permsByType[col.key].map(perm => {
                          const isSelected = selectedPermissions.includes(perm.id);
                          return (
                            <TooltipProvider key={perm.id}>
                              <Tooltip delayDuration={300}>
                                <TooltipTrigger asChild>
                                  <div className="flex items-center justify-center">
                                    <Checkbox 
                                      id={perm.id}
                                      checked={isSelected}
                                      onCheckedChange={() => !readOnly && onToggle(perm.id)}
                                      disabled={readOnly}
                                      className={`
                                        h-5 w-5 transition-all
                                        ${isSelected ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/30'}
                                      `}
                                    />
                                    {/* Hidden label for screen readers */}
                                    <label htmlFor={perm.id} className="sr-only">
                                      {perm.code} - {perm.description}
                                    </label>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-[200px] text-xs">
                                  <p className="font-semibold">{perm.code}</p>
                                  <p className="text-muted-foreground">{perm.description}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          );
                        })}
                        {permsByType[col.key].length === 0 && (
                          <span className="text-muted-foreground/20 text-xs">-</span>
                        )}
                      </div>
                    </TableCell>
                  ))}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Mobile View */}
      <div className="md:hidden space-y-4">
        {Object.entries(displayPermissions).map(([module, perms]) => {
           const allModuleIds = perms.map(p => p.id);
           const allSelected = allModuleIds.length > 0 && allModuleIds.every(id => selectedPermissions.includes(id));
           const someSelected = allModuleIds.some(id => selectedPermissions.includes(id));

           const permsByType: Record<string, Permission[]> = {
             view: [], create: [], edit: [], delete: [], other: []
           };
           perms.forEach(p => {
             const type = getPermissionType(p.code);
             permsByType[type].push(p);
           });

           return (
             <Card key={module} className="p-4">
               <div className="flex items-center justify-between mb-4">
                 <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-normal capitalize text-base px-3 py-1">{module}</Badge>
                 </div>
                 {!readOnly && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Select All</span>
                      <Checkbox 
                        checked={allSelected}
                        onCheckedChange={() => {
                          if (allSelected) {
                            setPermissions(selectedPermissions.filter(id => !allModuleIds.includes(id)));
                          } else {
                            setPermissions([...new Set([...selectedPermissions, ...allModuleIds])]);
                          }
                        }}
                        className={allSelected ? "" : (someSelected ? "opacity-50" : "")}
                      />
                    </div>
                 )}
               </div>
               
               <div className="space-y-4">
                 {columns.map(col => {
                   const typePerms = permsByType[col.key];
                   if (typePerms.length === 0) return null;
                   
                   return (
                     <div key={col.key} className="space-y-2">
                       <h4 className="text-xs font-semibold uppercase text-muted-foreground">{col.label}</h4>
                       <div className="grid grid-cols-1 gap-2">
                         {typePerms.map(perm => {
                           const isSelected = selectedPermissions.includes(perm.id);
                           return (
                             <div key={perm.id} className="flex items-start gap-3 p-2 rounded-md bg-muted/30">
                               <Checkbox 
                                 id={`mobile-${perm.id}`}
                                 checked={isSelected}
                                 onCheckedChange={() => !readOnly && onToggle(perm.id)}
                                 disabled={readOnly}
                               />
                               <div className="grid gap-1.5 leading-none">
                                 <label 
                                   htmlFor={`mobile-${perm.id}`}
                                   className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                 >
                                   {perm.code}
                                 </label>
                                 <p className="text-xs text-muted-foreground">
                                   {perm.description}
                                 </p>
                               </div>
                             </div>
                           );
                         })}
                       </div>
                     </div>
                   );
                 })}
               </div>
             </Card>
           );
        })}
      </div>
    </div>
  );
}
