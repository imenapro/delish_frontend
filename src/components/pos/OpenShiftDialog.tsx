import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Clock, DollarSign, Store } from 'lucide-react';

interface Shop {
  id: string;
  name: string;
}

interface OpenShiftDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shops: Shop[];
  businessId: string;
  onShiftOpened: (session: { id: string }) => void;
}

export function OpenShiftDialog({ open, onOpenChange, shops, businessId, onShiftOpened }: OpenShiftDialogProps) {
  const queryClient = useQueryClient();
  const [selectedShop, setSelectedShop] = useState('');
  const [openingCash, setOpeningCash] = useState('');

  // Auto-select shop if there's only one
  if (shops.length === 1 && !selectedShop) {
    setSelectedShop(shops[0].id);
  }

  const openShiftMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      if (!selectedShop) throw new Error('Please select a shop');

      const { data, error } = await supabase
        .from('pos_sessions')
        .insert({
          user_id: user.id,
          shop_id: selectedShop,
          business_id: businessId,
          opening_cash: parseFloat(openingCash) || 0,
          status: 'open',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (session) => {
      queryClient.invalidateQueries({ queryKey: ['active-pos-session'] });
      toast.success('Shift opened successfully!');
      onShiftOpened(session);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to open shift');
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Open Your Shift
          </DialogTitle>
          <DialogDescription>
            You need to open a shift before you can process sales. Select your shop and enter the opening cash amount.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="shop" className="flex items-center gap-2">
              <Store className="h-4 w-4" />
              Select Shop
            </Label>
            <Select value={selectedShop} onValueChange={setSelectedShop}>
              <SelectTrigger>
                <SelectValue placeholder="Choose your shop" />
              </SelectTrigger>
              <SelectContent>
                {shops.map((shop) => (
                  <SelectItem key={shop.id} value={shop.id}>
                    {shop.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="opening-cash" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Opening Cash (RWF)
            </Label>
            <Input
              id="opening-cash"
              type="number"
              placeholder="0"
              value={openingCash}
              onChange={(e) => setOpeningCash(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Enter the amount of cash in the drawer at the start of your shift
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => openShiftMutation.mutate()}
            disabled={!selectedShop || openShiftMutation.isPending}
            className="w-full"
          >
            {openShiftMutation.isPending ? 'Opening...' : 'Open Shift'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
