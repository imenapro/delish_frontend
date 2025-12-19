import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

export function SetQuotaDialog() {
  const [open, setOpen] = useState(false);
  const [productId, setProductId] = useState('');
  const [shopId, setShopId] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [shift, setShift] = useState('all_day');
  const [quotaTotal, setQuotaTotal] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

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

  const setQuotaMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('kitchen_quotas').insert({
        product_id: productId,
        shop_id: shopId,
        date,
        shift,
        quota_total: parseInt(quotaTotal),
        quota_used: 0,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kitchen-quotas'] });
      toast({ title: 'Quota set successfully!' });
      setOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to set quota',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const resetForm = () => {
    setProductId('');
    setShopId('');
    setDate(format(new Date(), 'yyyy-MM-dd'));
    setShift('all_day');
    setQuotaTotal('');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Set Quota
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Set Production Quota</DialogTitle>
          <DialogDescription>Define daily production targets</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="product">Product</Label>
            <Select value={productId} onValueChange={setProductId}>
              <SelectTrigger id="product">
                <SelectValue placeholder="Select product" />
              </SelectTrigger>
              <SelectContent>
                {products?.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="shop">Shop</Label>
            <Select value={shopId} onValueChange={setShopId}>
              <SelectTrigger id="shop">
                <SelectValue placeholder="Select shop" />
              </SelectTrigger>
              <SelectContent>
                {shops?.map((shop) => (
                  <SelectItem key={shop.id} value={shop.id}>
                    {shop.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="shift">Shift</Label>
            <Select value={shift} onValueChange={setShift}>
              <SelectTrigger id="shift">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all_day">All Day</SelectItem>
                <SelectItem value="morning">Morning</SelectItem>
                <SelectItem value="afternoon">Afternoon</SelectItem>
                <SelectItem value="evening">Evening</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="quota">Quota Total (units)</Label>
            <Input
              id="quota"
              type="number"
              value={quotaTotal}
              onChange={(e) => setQuotaTotal(e.target.value)}
              placeholder="100"
            />
          </div>
          <Button
            onClick={() => setQuotaMutation.mutate()}
            disabled={!productId || !shopId || !quotaTotal || setQuotaMutation.isPending}
            className="w-full"
          >
            {setQuotaMutation.isPending ? 'Setting...' : 'Set Quota'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}