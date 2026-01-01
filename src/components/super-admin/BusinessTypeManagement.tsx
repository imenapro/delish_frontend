import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Plus, Trash2, Pencil } from 'lucide-react';
import { generateSlug } from '@/lib/utils';

interface BusinessType {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
}

export function BusinessTypeManagement() {
  const [businessTypes, setBusinessTypes] = useState<BusinessType[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Dialog states
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    is_active: true
  });

  useEffect(() => {
    fetchBusinessTypes();
  }, []);

  const fetchBusinessTypes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('business_types')
        .select('*')
        .order('name');
      
      if (error) throw error;
      setBusinessTypes(data || []);
    } catch (error: any) {
      toast.error('Failed to load business types: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (id: string, currentState: boolean) => {
    try {
      const { error } = await supabase
        .from('business_types')
        .update({ is_active: !currentState })
        .eq('id', id);
        
      if (error) throw error;
      
      setBusinessTypes(prev => prev.map(item => 
        item.id === id ? { ...item, is_active: !currentState } : item
      ));
      toast.success('Status updated');
    } catch (error: any) {
      toast.error('Error updating status: ' + error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this business type?')) return;

    try {
      const { error } = await supabase
        .from('business_types')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      
      setBusinessTypes(prev => prev.filter(item => item.id !== id));
      toast.success('Business type deleted');
    } catch (error: any) {
      toast.error('Error deleting business type: ' + error.message);
    }
  };

  const handleOpenDialog = (businessType?: BusinessType) => {
    if (businessType) {
      setEditingId(businessType.id);
      setFormData({
        name: businessType.name,
        slug: businessType.slug,
        is_active: businessType.is_active
      });
    } else {
      setEditingId(null);
      setFormData({
        name: '',
        slug: '',
        is_active: true
      });
    }
    setIsDialogOpen(true);
  };

  const handleNameChange = (name: string) => {
    setFormData(prev => ({
      ...prev,
      name,
      slug: generateSlug(name)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.slug) {
      toast.error('Name and slug are required');
      return;
    }

    try {
      if (editingId) {
        // Update
        const { error } = await supabase
          .from('business_types')
          .update({
            name: formData.name,
            slug: formData.slug,
            is_active: formData.is_active
          })
          .eq('id', editingId);

        if (error) throw error;
        toast.success('Business type updated');
      } else {
        // Create
        const { error } = await supabase
          .from('business_types')
          .insert([{
            name: formData.name,
            slug: formData.slug,
            is_active: formData.is_active
          }]);

        if (error) throw error;
        toast.success('Business type added');
      }

      setIsDialogOpen(false);
      fetchBusinessTypes();
    } catch (error: any) {
      toast.error('Error saving business type: ' + error.message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Business Types</h2>
          <p className="text-sm text-muted-foreground">Manage available business types</p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="mr-2 h-4 w-4" /> Add Type
        </Button>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {businessTypes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  No business types found. Add one to get started.
                </TableCell>
              </TableRow>
            ) : (
              businessTypes.map((type) => (
                <TableRow key={type.id}>
                  <TableCell className="font-medium">{type.name}</TableCell>
                  <TableCell className="text-muted-foreground">{type.slug}</TableCell>
                  <TableCell>
                    <Switch 
                      checked={type.is_active}
                      onCheckedChange={() => handleToggleActive(type.id, type.is_active)}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(type)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(type.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Business Type' : 'Add Business Type'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g. Grocery Store"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="slug">Slug *</Label>
              <Input
                id="slug"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                placeholder="e.g. grocery-store"
                required
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label htmlFor="active">Active</Label>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {editingId ? 'Save Changes' : 'Add Type'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
