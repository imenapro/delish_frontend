import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useStoreContext } from '@/contexts/StoreContext';
import { Store, MapPin, Phone, Clock } from 'lucide-react';

interface AddTenantShopDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AddTenantShopDialog({ open, onOpenChange, onSuccess }: AddTenantShopDialogProps) {
  const { store } = useStoreContext();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    openHours: '',
  });

  const handleSubmit = async () => {
    if (!formData.name || !formData.address) {
      toast.error('Please fill in required fields');
      return;
    }

    if (!store) {
      toast.error('Store context not available');
      return;
    }

    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase.from('shops').insert({
        name: formData.name,
        address: formData.address,
        phone: formData.phone || null,
        open_hours: formData.openHours || null,
        business_id: store.id,
        owner_id: user?.id,
        is_active: true,
        status: 'active',
      });

      if (error) throw error;

      toast.success('Shop created successfully!');
      setFormData({ name: '', address: '', phone: '', openHours: '' });
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error('Error creating shop:', error);
      toast.error(error.message || 'Failed to create shop');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Store className="h-5 w-5" />
            Add New Shop
          </DialogTitle>
          <DialogDescription>
            Create a new shop location for your business.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Shop Name *</Label>
            <Input
              id="name"
              placeholder="Downtown Branch"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Address *
            </Label>
            <Textarea
              id="address"
              placeholder="123 Main Street, City"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone" className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Phone Number
            </Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+250 XXX XXX XXX"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="hours" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Opening Hours
            </Label>
            <Input
              id="hours"
              placeholder="Mon-Sat: 8AM - 8PM"
              value={formData.openHours}
              onChange={(e) => setFormData({ ...formData, openHours: e.target.value })}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? 'Creating...' : 'Create Shop'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
