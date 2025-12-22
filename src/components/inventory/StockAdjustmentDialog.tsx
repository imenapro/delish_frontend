import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Plus, Minus } from 'lucide-react';

interface StockAdjustmentDialogProps {
  shopId: string;
  productId: string;
  productName: string;
  type: 'in' | 'out';
  trigger?: React.ReactNode;
}

export function StockAdjustmentDialog({ 
  shopId, 
  productId, 
  productName, 
  type,
  trigger 
}: StockAdjustmentDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    quantity: '',
    notes: '',
  });

  const createTransactionMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!shopId || !productId || !data.quantity) {
        throw new Error('Missing required fields');
      }

      const quantity = parseInt(data.quantity);
      if (isNaN(quantity) || quantity <= 0) {
        throw new Error('Quantity must be a positive number');
      }

      const adjustedQuantity = type === 'out' ? -Math.abs(quantity) : Math.abs(quantity);

      // Record the transaction
      // The database trigger 'on_inventory_transaction_created' will handle the stock update
      const { error: txError } = await supabase
        .from('inventory_transactions')
        .insert([{
          shop_id: shopId,
          product_id: productId,
          quantity: adjustedQuantity,
          transaction_type: type === 'in' ? 'in' : 'out',
          notes: data.notes || `Manual stock ${type} adjustment`,
          created_by: user?.id,
        }]);

      if (txError) throw txError;
    },
    onSuccess: () => {
      toast({
        title: type === 'in' ? "Stock added" : "Stock removed",
        description: `${formData.quantity} units ${type === 'in' ? 'added to' : 'removed from'} ${productName}`,
      });
      
      // Invalidate queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: ['inventory-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['business-inventory'] });
      
      setOpen(false);
      setFormData({ quantity: '', notes: '' });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (createTransactionMutation.isPending) return;
    createTransactionMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant={type === 'in' ? 'default' : 'destructive'} size="sm">
            {type === 'in' ? <Plus className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Stock {type === 'in' ? 'In' : 'Out'}: {productName}</DialogTitle>
          <DialogDescription>
            {type === 'in' ? 'Add stock to inventory.' : 'Remove stock from inventory.'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="quantity">Quantity</Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
              placeholder="Enter quantity"
              autoFocus
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Reason for adjustment..."
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleSubmit}
            disabled={createTransactionMutation.isPending || !formData.quantity}
            variant={type === 'in' ? 'default' : 'destructive'}
          >
            {createTransactionMutation.isPending ? "Processing..." : `Confirm ${type === 'in' ? 'Add' : 'Remove'}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
