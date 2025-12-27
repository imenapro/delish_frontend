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
  initialShopId?: string;
  initialProductId?: string;
  trigger?: React.ReactNode;
}

export function TenantInventoryTransactionDialog({ 
  businessId, 
  type,
  initialShopId,
  initialProductId,
  trigger
}: TenantInventoryTransactionDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    shop_id: initialShopId || '',
    product_id: initialProductId || '',
    quantity: '',
    notes: '',
    reason_id: '',
    purchase_price: '',
    transfer_from_location: '',
    transfer_to_location: '',
  });

  const { data: reasons } = useQuery({
    queryKey: ['inventory-reasons', businessId, type],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory_reasons')
        .select('*')
        .or(`type.eq.${type},type.eq.both`)
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      return data;
    },
    enabled: !!businessId,
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

  const selectedReason = reasons?.find(r => r.id === formData.reason_id);
  const isPurchase = selectedReason?.name === 'Purchase';
  const isTransfer = selectedReason?.name.includes('Transfer');

  const createTransactionMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const quantity = parseInt(data.quantity);
      const adjustedQuantity = type === 'out' ? -Math.abs(quantity) : Math.abs(quantity);

      const { error: txError } = await supabase
        .from('inventory_transactions')
        .insert([{
          shop_id: data.shop_id,
          product_id: data.product_id,
          quantity: adjustedQuantity,
          transaction_type: type === 'in' ? 'in' : 'out',
          notes: data.notes,
          reason_id: data.reason_id,
          purchase_price: data.purchase_price ? parseFloat(data.purchase_price) : null,
          transfer_from_location: data.transfer_from_location || null,
          transfer_to_location: data.transfer_to_location || null,
          created_by: user?.id,
        }]);

      if (txError) throw txError;
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
      setFormData({ 
        shop_id: initialShopId || '', 
        product_id: initialProductId || '', 
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
        {trigger || (
          <Button variant={type === 'in' ? 'default' : 'outline'}>
            {type === 'in' ? <Plus className="mr-2 h-4 w-4" /> : <Minus className="mr-2 h-4 w-4" />}
            Stock {type === 'in' ? 'In' : 'Out'}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Stock {type === 'in' ? 'In' : 'Out'}</DialogTitle>
          <DialogDescription>
            {type === 'in' ? 'Add new stock to inventory' : 'Remove stock from inventory'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Shop <span className="text-red-500">*</span></Label>
            <Select 
              value={formData.shop_id} 
              onValueChange={(value) => setFormData({ ...formData, shop_id: value })}
              disabled={!!initialShopId}
            >
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
            <Label>Product <span className="text-red-500">*</span></Label>
            <Select 
              value={formData.product_id} 
              onValueChange={(value) => setFormData({ ...formData, product_id: value })}
              disabled={!!initialProductId}
            >
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
            <Label>Reason <span className="text-red-500">*</span></Label>
            <Select value={formData.reason_id} onValueChange={(value) => setFormData({ ...formData, reason_id: value })}>
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
              placeholder={`Enter quantity to ${type === 'in' ? 'add' : 'remove'}`}
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
            !formData.quantity || 
            !formData.reason_id || 
            !formData.notes ||
            (isTransfer && (!formData.transfer_from_location || !formData.transfer_to_location))
          }
          className="w-full"
        >
          {createTransactionMutation.isPending ? "Processing..." : `Confirm Stock ${type === 'in' ? 'In' : 'Out'}`}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
