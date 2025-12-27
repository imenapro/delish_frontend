import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Store, MapPin, Phone, Clock } from 'lucide-react';

interface Shop {
  id: string;
  name: string;
  address: string;
  phone?: string | null;
  open_hours?: string | null;
  is_active: boolean | null;
}

interface EditTenantShopDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shop: Shop | null;
  onSuccess: () => void;
}

export function EditTenantShopDialog({ open, onOpenChange, shop, onSuccess }: EditTenantShopDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [openHours, setOpenHours] = useState('');
  const [active, setActive] = useState(true);

  useEffect(() => {
    if (shop) {
      setName(shop.name || '');
      setAddress(shop.address || '');
      setPhone(shop.phone || '');
      setOpenHours(shop.open_hours || '');
      setActive(Boolean(shop.is_active));
    }
  }, [shop]);

  const handleSubmit = async () => {
    if (!shop) return;
    if (!name || !address) {
      toast.error('Please fill in required fields');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('shops')
        .update({
          name,
          address,
          phone: phone || null,
          open_hours: openHours || null,
          is_active: active,
        })
        .eq('id', shop.id);

      if (error) throw error;

      toast.success('Shop updated successfully!');
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error('Error updating shop:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update shop');
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
            Edit Shop
          </DialogTitle>
          <DialogDescription>
            Update this shop's details.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Shop Name *</Label>
            <Input
              id="name"
              placeholder="Downtown Branch"
              value={name}
              onChange={(e) => setName(e.target.value)}
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
              value={address}
              onChange={(e) => setAddress(e.target.value)}
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
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
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
              value={openHours}
              onChange={(e) => setOpenHours(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label className="mb-1">Active</Label>
              <p className="text-xs text-muted-foreground">Toggle shop active status</p>
            </div>
            <Switch checked={active} onCheckedChange={setActive} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
