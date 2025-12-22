import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Plus, Minus } from 'lucide-react';

interface TenantInventoryTransactionDialogProps {
  businessId: string;
  type: 'in' | 'out';
}

export function TenantInventoryTransactionDialog({ businessId, type }: TenantInventoryTransactionDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    shop_id: '',
    product_id: '',
    quantity: '',
    notes: '',
  });

  const { data: shops } = useQuery({
    queryKey: ['business-shops', businessId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shops')
        .select('*')
        .eq('business_id', businessId)
        .eq('is_active', true);
      if (error) throw error;
      return data;
    },
    enabled: !!businessId,
  });

  const { data: products } = useQuery({
    queryKey: ['business-products', businessId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('business_id', businessId)
        .eq('is_active', true);
      if (error) throw error;
      return data;
    },
    enabled: !!businessId,
  });

  const createTransactionMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const quantity = parseInt(data.quantity);
      const adjustedQuantity = type === 'out' ? -Math.abs(quantity) : Math.abs(quantity);

      // Record the transaction
      const { error: txError } = await supabase
        .from('inventory_transactions')
        .insert([{
          shop_id: data.shop_id,
          product_id: data.product_id,
          quantity: adjustedQuantity,
          transaction_type: type === 'in' ? 'in' : 'out',
          notes: data.notes || null,
          created_by: user?.id,
        }]);

      if (txError) throw txError;
      
      // Stock update is now handled by database trigger 'on_inventory_transaction_created'
    },
    onSuccess: () => {
      toast({
        title: type === 'in' ? "Stock added" : "Stock removed",
        description: `Inventory ${type === 'in' ? 'increased' : 'decreased'} successfully.`,
      });
      queryClient.invalidateQueries({ queryKey: ['inventory-transactions', businessId] });
      queryClient.invalidateQueries({ queryKey: ['shop-inventory', businessId] });
      queryClient.invalidateQueries({ queryKey: ['business-inventory', businessId] });
      setOpen(false);
      setFormData({ shop_id: '', product_id: '', quantity: '', notes: '' });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={type === 'in' ? 'default' : 'outline'}>
          {type === 'in' ? <Plus className="mr-2 h-4 w-4" /> : <Minus className="mr-2 h-4 w-4" />}
          Stock {type === 'in' ? 'In' : 'Out'}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Stock {type === 'in' ? 'In' : 'Out'}</DialogTitle>
          <DialogDescription>
            {type === 'in' ? 'Add new stock to inventory' : 'Remove stock from inventory'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Shop</Label>
            <Select value={formData.shop_id} onValueChange={(value) => setFormData({ ...formData, shop_id: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select shop" />
              </SelectTrigger>
              <SelectContent>
                {shops?.map((shop) => (
                  <SelectItem key={shop.id} value={shop.id}>{shop.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Product</Label>
            <Select value={formData.product_id} onValueChange={(value) => setFormData({ ...formData, product_id: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select product" />
              </SelectTrigger>
              <SelectContent>
                {products?.map((product) => (
                  <SelectItem key={product.id} value={product.id}>{product.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Quantity</Label>
            <Input
              type="number"
              min="1"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
              placeholder={`Enter quantity to ${type === 'in' ? 'add' : 'remove'}`}
            />
          </div>
          <div className="space-y-2">
            <Label>Notes (Optional)</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder={type === 'in' ? 'e.g., New shipment received' : 'e.g., Damaged goods, expired items'}
            />
          </div>
        </div>
        <Button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (createTransactionMutation.isPending) return;
            createTransactionMutation.mutate(formData);
          }}
          disabled={createTransactionMutation.isPending || !formData.shop_id || !formData.product_id || !formData.quantity}
          className="w-full"
        >
          {createTransactionMutation.isPending ? "Processing..." : `Confirm Stock ${type === 'in' ? 'In' : 'Out'}`}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
