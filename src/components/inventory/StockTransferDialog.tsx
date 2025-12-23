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
import { ArrowLeftRight } from 'lucide-react';

export function StockTransferDialog() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    from_shop_id: '',
    to_shop_id: '',
    product_id: '',
    quantity: '',
    notes: '',
  });

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

  const createTransferMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase
        .from('stock_transfers')
        .insert([{
          ...data,
          quantity: parseInt(data.quantity),
          requested_by: user?.id,
        }]);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Transfer request created",
        description: "Stock transfer request submitted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['stock-transfers'] });
      setOpen(false);
      setFormData({ from_shop_id: '', to_shop_id: '', product_id: '', quantity: '', notes: '' });
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
        <Button>
          <ArrowLeftRight className="mr-2 h-4 w-4" />
          Request Transfer
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request Stock Transfer</DialogTitle>
          <DialogDescription>
            Transfer stock between shops
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>From Shop</Label>
            <Select value={formData.from_shop_id} onValueChange={(value) => setFormData({ ...formData, from_shop_id: value })}>
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
            <Label>To Shop</Label>
            <Select value={formData.to_shop_id} onValueChange={(value) => setFormData({ ...formData, to_shop_id: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select shop" />
              </SelectTrigger>
              <SelectContent>
                {shops?.filter(s => s.id !== formData.from_shop_id).map((shop) => (
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
              placeholder="Enter quantity"
            />
          </div>
          <div className="space-y-2">
            <Label>Notes (Optional)</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Any additional notes"
            />
          </div>
        </div>
        <Button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (createTransferMutation.isPending) return;
            createTransferMutation.mutate(formData);
          }}
          disabled={createTransferMutation.isPending || !formData.from_shop_id || !formData.to_shop_id || !formData.product_id || !formData.quantity}
          className="w-full"
        >
          {createTransferMutation.isPending ? "Creating..." : "Create Transfer Request"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
