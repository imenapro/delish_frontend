import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil, Trash2, Menu as MenuIcon } from 'lucide-react';
import { toast } from 'sonner';

interface Menu {
  id: string;
  label: string;
  path: string;
  icon: string | null;
  parent_id: string | null;
  sort_order: number;
  permission_required_id: string | null;
  is_active: boolean;
}

interface Permission {
  id: string;
  code: string;
}

export function MenuManagement() {
  const queryClient = useQueryClient();
  const [selectedMenu, setSelectedMenu] = useState<Menu | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Form State
  const [label, setLabel] = useState('');
  const [path, setPath] = useState('');
  const [icon, setIcon] = useState('');
  const [parentId, setParentId] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState(0);
  const [permissionId, setPermissionId] = useState<string | null>(null);

  // Fetch Menus
  const { data: menus = [] } = useQuery({
    queryKey: ['menus_admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('menus')
        .select('*')
        .order('sort_order');
      if (error) throw error;
      return data as Menu[];
    },
  });

  // Fetch Permissions for selection
  const { data: permissions = [] } = useQuery({
    queryKey: ['permissions_list'],
    queryFn: async () => {
      const { data, error } = await supabase.from('permissions').select('id, code').order('code');
      if (error) throw error;
      return data as Permission[];
    },
  });

  // Mutations
  const upsertMenuMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        label,
        path,
        icon: icon || null,
        parent_id: parentId === 'none' ? null : parentId,
        sort_order: sortOrder,
        permission_required_id: permissionId === 'none' ? null : permissionId,
        is_active: true
      };

      if (selectedMenu) {
        const { error } = await supabase
          .from('menus')
          .update(payload)
          .eq('id', selectedMenu.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('menus')
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menus_admin'] });
      queryClient.invalidateQueries({ queryKey: ['menus'] });
      setIsDialogOpen(false);
      resetForm();
      toast.success(selectedMenu ? 'Menu updated' : 'Menu created');
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    }
  });

  const deleteMenuMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('menus').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menus_admin'] });
      queryClient.invalidateQueries({ queryKey: ['menus'] });
      toast.success('Menu deleted');
    },
    onError: (error) => {
      toast.error(`Error deleting menu: ${error.message}`);
    }
  });

  const resetForm = () => {
    setSelectedMenu(null);
    setLabel('');
    setPath('');
    setIcon('');
    setParentId(null);
    setSortOrder(0);
    setPermissionId(null);
  };

  const handleEdit = (menu: Menu) => {
    setSelectedMenu(menu);
    setLabel(menu.label);
    setPath(menu.path);
    setIcon(menu.icon || '');
    setParentId(menu.parent_id || 'none');
    setSortOrder(menu.sort_order);
    setPermissionId(menu.permission_required_id || 'none');
    setIsDialogOpen(true);
  };

  const handleCreate = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  // Helper to find parent label
  const getParentLabel = (pid: string | null) => {
    if (!pid) return '-';
    const p = menus.find(m => m.id === pid);
    return p ? p.label : pid;
  };

  // Helper to find permission code
  const getPermissionCode = (pid: string | null) => {
    if (!pid) return 'Public';
    const p = permissions.find(perm => perm.id === pid);
    return p ? p.code : pid;
  };

  return (
    <section className="space-y-4" aria-label="Navigation menu configuration">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <MenuIcon className="h-4 w-4" />
            Menus
          </h3>
          <p className="text-sm text-muted-foreground max-w-xl">
            Configure sidebar items and which permissions are required to see them.
          </p>
        </div>
        <Button onClick={handleCreate} className="self-start sm:self-auto" aria-label="Add a new navigation menu item">
          <Plus className="mr-2 h-4 w-4" />
          Add Menu Item
        </Button>
      </div>

      <div className="hidden md:block rounded-md border">
        <div className="max-h-[60vh] overflow-auto scroll-smooth">
          <Table>
            <TableHeader className="sticky top-0 bg-card z-10">
              <TableRow>
                <TableHead>Label</TableHead>
                <TableHead>Path</TableHead>
                <TableHead>Icon</TableHead>
                <TableHead>Parent</TableHead>
                <TableHead>Permission</TableHead>
                <TableHead>Sort</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {menus.map((menu) => (
                <TableRow key={menu.id}>
                  <TableCell className="font-medium">{menu.label}</TableCell>
                  <TableCell className="max-w-[240px] truncate">{menu.path}</TableCell>
                  <TableCell>{menu.icon}</TableCell>
                  <TableCell>{getParentLabel(menu.parent_id)}</TableCell>
                  <TableCell>{getPermissionCode(menu.permission_required_id)}</TableCell>
                  <TableCell>{menu.sort_order}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(menu)}
                        aria-label={`Edit menu item ${menu.label}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (confirm('Are you sure you want to delete this menu item?')) {
                            deleteMenuMutation.mutate(menu.id);
                          }
                        }}
                        aria-label={`Delete menu item ${menu.label}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="md:hidden space-y-3">
        <div className="max-h-[60vh] overflow-auto scroll-smooth pr-1">
          <div className="space-y-3">
            {menus.map((menu) => (
              <div key={menu.id} className="rounded-md border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{menu.label}</div>
                    <div className="text-xs text-muted-foreground truncate">{menu.path}</div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(menu)}
                      aria-label={`Edit menu item ${menu.label}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this menu item?')) {
                          deleteMenuMutation.mutate(menu.id);
                        }
                      }}
                      aria-label={`Delete menu item ${menu.label}`}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <div className="text-muted-foreground">Icon</div>
                    <div className="truncate">{menu.icon || '-'}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Sort</div>
                    <div>{menu.sort_order}</div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-muted-foreground">Permission</div>
                    <div className="truncate">{getPermissionCode(menu.permission_required_id)}</div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-muted-foreground">Parent</div>
                    <div className="truncate">{getParentLabel(menu.parent_id)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent aria-label={selectedMenu ? 'Edit menu item' : 'Add menu item'} className="max-h-[85vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>{selectedMenu ? 'Edit Menu' : 'Add Menu'}</DialogTitle>
            <DialogDescription>Configure navigation menu item.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <label>Label</label>
                <Input value={label} onChange={(e) => setLabel(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <label>Path</label>
                <Input value={path} onChange={(e) => setPath(e.target.value)} />
              </div>
            </div>
            
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
               <div className="grid gap-2">
                <label>Icon (Lucide Name)</label>
                <Input value={icon} onChange={(e) => setIcon(e.target.value)} placeholder="e.g. Home" />
              </div>
              <div className="grid gap-2">
                <label>Sort Order</label>
                <Input type="number" value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))} />
              </div>
            </div>

            <div className="grid gap-2">
              <label>Parent Menu</label>
              <Select value={parentId || 'none'} onValueChange={setParentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select parent" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (Root)</SelectItem>
                  {menus
                    .filter(m => m.id !== selectedMenu?.id) // Prevent self-parenting
                    .map(m => (
                    <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <label>Required Permission</label>
              <Select value={permissionId || 'none'} onValueChange={setPermissionId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select permission" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Public / None</SelectItem>
                  {permissions.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.code}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => upsertMenuMutation.mutate()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
