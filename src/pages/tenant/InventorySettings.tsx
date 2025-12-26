import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Edit } from 'lucide-react';

export default function InventorySettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  interface InventoryReason {
    id: string;
    name: string;
    type: string;
    is_active: boolean;
    business_id: string;
    created_at?: string;
  }

  const [editingReason, setEditingReason] = useState<InventoryReason | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'both',
    is_active: true,
  });

  // Fetch business ID
  const { data: businessData } = useQuery({
    queryKey: ['user-business'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_businesses')
        .select('business_id')
        .eq('user_id', user?.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const businessId = businessData?.business_id;

  // Fetch reasons
  const { data: reasons, isLoading } = useQuery({
    queryKey: ['inventory-reasons', businessId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory_reasons')
        .select('*')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!businessId,
  });

  const mutation = useMutation({
    mutationFn: async (data: { name: string; type: string; is_active: boolean }) => {
      if (editingReason) {
        const { error } = await supabase
          .from('inventory_reasons')
          .update({
            name: data.name,
            type: data.type,
            is_active: data.is_active,
          })
          .eq('id', editingReason.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('inventory_reasons')
          .insert([{
            business_id: businessId,
            name: data.name,
            type: data.type,
            is_active: data.is_active,
            is_system: false,
          }]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-reasons', businessId] });
      toast({
        title: "Success",
        description: `Reason ${editingReason ? 'updated' : 'created'} successfully`,
      });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('inventory_reasons')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-reasons', businessId] });
      toast({
        title: "Success",
        description: "Reason deleted successfully",
      });
    },
  });

  const resetForm = () => {
    setFormData({ name: '', type: 'both', is_active: true });
    setEditingReason(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  const handleEdit = (reason: InventoryReason) => {
    setEditingReason(reason);
    setFormData({
      name: reason.name,
      type: reason.type,
      is_active: reason.is_active,
    });
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Inventory Settings</h2>
          <p className="text-muted-foreground">Manage inventory reasons and configurations</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Reason
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingReason ? 'Edit Reason' : 'Add New Reason'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Damaged, Gift, etc."
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in">Stock In</SelectItem>
                    <SelectItem value="out">Stock Out</SelectItem>
                    <SelectItem value="both">Both</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full" disabled={mutation.isPending}>
                {mutation.isPending ? 'Saving...' : 'Save Reason'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center">Loading...</TableCell>
              </TableRow>
            ) : reasons?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center">No custom reasons found</TableCell>
              </TableRow>
            ) : (
              reasons?.map((reason) => (
                <TableRow key={reason.id}>
                  <TableCell className="font-medium">{reason.name}</TableCell>
                  <TableCell className="capitalize">{reason.type}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs ${reason.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {reason.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    {!reason.is_system && (
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(reason)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-500 hover:text-red-600"
                          onClick={() => {
                            if (confirm('Are you sure you want to delete this reason?')) {
                              deleteMutation.mutate(reason.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                    {reason.is_system && (
                      <span className="text-xs text-muted-foreground italic">System Default</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
