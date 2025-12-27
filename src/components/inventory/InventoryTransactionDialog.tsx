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
import { Plus } from 'lucide-react';

export function InventoryTransactionDialog() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    shop_id: '',
    product_id: '',
    transaction_type: '',
    quantity: '',
    notes: '',
    reason_id: '',
    purchase_price: '',
    transfer_from_location: '',
    transfer_to_location: '',
  });

  const { data: reasons } = useQuery({
    queryKey: ['inventory-reasons', formData.transaction_type],
    queryFn: async () => {
      let query = supabase
        .from('inventory_reasons')
        .select('*')
        .eq('is_active', true)
        .order('name');
      
      if (formData.transaction_type) {
        query = query.or(`type.eq.${formData.transaction_type},type.eq.both`);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const selectedReason = reasons?.find(r => r.id === formData.reason_id);
  const isPurchase = selectedReason?.name === 'Purchase';
  const isTransfer = selectedReason?.name.includes('Transfer');

  const { data: shops } = useQuery({
    queryKey: ['shops'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shops')
        .select('*')
        .eq('is_active', true);
      if (error) throw error;
      return data;
    },
  });

  const { data: products } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true);
      if (error) throw error;
      return data;
    },
  });

  const createTransactionMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const quantity = parseInt(data.quantity);
      // If transaction type is 'out', make quantity negative
      const adjustedQuantity = data.transaction_type === 'out' ? -Math.abs(quantity) : Math.abs(quantity);

      const { error } = await supabase
        .from('inventory_transactions')
        .insert([{
          shop_id: data.shop_id,
          product_id: data.product_id,
          transaction_type: data.transaction_type,
          quantity: adjustedQuantity,
          notes: data.notes,
          reason_id: data.reason_id,
          purchase_price: data.purchase_price ? parseFloat(data.purchase_price) : null,
          transfer_from_location: data.transfer_from_location || null,
          transfer_to_location: data.transfer_to_location || null,
          created_by: user?.id,
        }]);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Transaction recorded",
        description: "Inventory transaction recorded successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['inventory-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['shop-inventory'] });
      setOpen(false);
      setFormData({ 
        shop_id: '', 
        product_id: '', 
        transaction_type: '', 
        quantity: '', 
        notes: '',
        reason_id: '',
        purchase_price: '',
        transfer_from_location: '',
        transfer_to_location: '',
      });
    },
    onError: (error: Error) => {
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
        <Button variant="outline">
          <Plus className="mr-2 h-4 w-4" />
          Record Transaction
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record Inventory Transaction</DialogTitle>
          <DialogDescription>
            Add stock adjustments, waste, or other transactions
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
            <Label>Transaction Type <span className="text-red-500">*</span></Label>
            <Select value={formData.transaction_type} onValueChange={(value) => setFormData({ ...formData, transaction_type: value, reason_id: '' })}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="in">Stock In</SelectItem>
                <SelectItem value="out">Stock Out</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Reason <span className="text-red-500">*</span></Label>
            <Select value={formData.reason_id} onValueChange={(value) => setFormData({ ...formData, reason_id: value })} disabled={!formData.transaction_type}>
              <SelectTrigger>
                <SelectValue placeholder="Select reason" />
              </SelectTrigger>
              <SelectContent>
                {reasons?.map((reason) => (
                  <SelectItem key={reason.id} value={reason.id}>{reason.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isPurchase && (
            <div className="space-y-2">
              <Label>Purchase Price</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={formData.purchase_price}
                onChange={(e) => setFormData({ ...formData, purchase_price: e.target.value })}
                placeholder="Enter purchase price"
              />
            </div>
          )}

          {isTransfer && (
            <>
              <div className="space-y-2">
                <Label>Transfer From <span className="text-red-500">*</span></Label>
                <Input
                  value={formData.transfer_from_location}
                  onChange={(e) => setFormData({ ...formData, transfer_from_location: e.target.value })}
                  placeholder="Source location"
                />
              </div>
              <div className="space-y-2">
                <Label>Transfer To <span className="text-red-500">*</span></Label>
                <Input
                  value={formData.transfer_to_location}
                  onChange={(e) => setFormData({ ...formData, transfer_to_location: e.target.value })}
                  placeholder="Destination location"
                />
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label>Quantity <span className="text-red-500">*</span></Label>
            <Input
              type="number"
              min="1"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
              placeholder="Enter quantity"
            />
          </div>
          <div className="space-y-2">
            <Label>Notes <span className="text-red-500">*</span></Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Mandatory comment..."
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
          disabled={
            createTransactionMutation.isPending || 
            !formData.shop_id || 
            !formData.product_id || 
            !formData.transaction_type || 
            !formData.quantity ||
            !formData.reason_id ||
            !formData.notes ||
            (isTransfer && (!formData.transfer_from_location || !formData.transfer_to_location))
          }
          className="w-full"
        >
          {createTransactionMutation.isPending ? "Processing..." : "Record Transaction"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
