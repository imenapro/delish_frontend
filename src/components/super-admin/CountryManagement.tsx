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

interface Country {
  id: string;
  name: string;
  code: string | null;
  is_active: boolean;
}

export function CountryManagement() {
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Dialog states
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    is_active: true
  });

  useEffect(() => {
    fetchCountries();
  }, []);

  const fetchCountries = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('countries')
        .select('*')
        .order('name');
      
      if (error) throw error;
      setCountries(data || []);
    } catch (error: any) {
      toast.error('Failed to load countries: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (id: string, currentState: boolean) => {
    try {
      const { error } = await supabase
        .from('countries')
        .update({ is_active: !currentState })
        .eq('id', id);
        
      if (error) throw error;
      
      setCountries(prev => prev.map(c => 
        c.id === id ? { ...c, is_active: !currentState } : c
      ));
      toast.success('Status updated');
    } catch (error: any) {
      toast.error('Error updating status: ' + error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this country?')) return;

    try {
      const { error } = await supabase
        .from('countries')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      
      setCountries(prev => prev.filter(c => c.id !== id));
      toast.success('Country deleted');
    } catch (error: any) {
      toast.error('Error deleting country: ' + error.message);
    }
  };

  const handleOpenDialog = (country?: Country) => {
    if (country) {
      setEditingId(country.id);
      setFormData({
        name: country.name,
        code: country.code || '',
        is_active: country.is_active
      });
    } else {
      setEditingId(null);
      setFormData({
        name: '',
        code: '',
        is_active: true
      });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name) {
      toast.error('Country name is required');
      return;
    }

    try {
      if (editingId) {
        // Update
        const { error } = await supabase
          .from('countries')
          .update({
            name: formData.name,
            code: formData.code || null,
            is_active: formData.is_active
          })
          .eq('id', editingId);

        if (error) throw error;
        toast.success('Country updated');
      } else {
        // Create
        const { error } = await supabase
          .from('countries')
          .insert([{
            name: formData.name,
            code: formData.code || null,
            is_active: formData.is_active
          }]);

        if (error) throw error;
        toast.success('Country added');
      }

      setIsDialogOpen(false);
      fetchCountries();
    } catch (error: any) {
      toast.error('Error saving country: ' + error.message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Country Management</h2>
          <p className="text-sm text-muted-foreground">Manage available countries for businesses</p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="mr-2 h-4 w-4" /> Add Country
        </Button>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {countries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  No countries found. Add one to get started.
                </TableCell>
              </TableRow>
            ) : (
              countries.map((country) => (
                <TableRow key={country.id}>
                  <TableCell className="font-medium">{country.name}</TableCell>
                  <TableCell>{country.code || '-'}</TableCell>
                  <TableCell>
                    <Switch 
                      checked={country.is_active}
                      onCheckedChange={() => handleToggleActive(country.id, country.is_active)}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(country)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(country.id)}>
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
            <DialogTitle>{editingId ? 'Edit Country' : 'Add New Country'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Country Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. United States"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="code">Country Code (Optional)</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="e.g. US"
                maxLength={2}
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
                {editingId ? 'Save Changes' : 'Add Country'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
