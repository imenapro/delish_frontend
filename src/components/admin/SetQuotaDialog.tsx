import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SetQuotaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SetQuotaDialog({ open, onOpenChange }: SetQuotaDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [quotaData, setQuotaData] = useState({
    shop_id: '',
    product_id: '',
    date: new Date().toISOString().split('T')[0],
    shift: 'all_day',
    quota_total: '',
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

  const setQuotaMutation = useMutation({
    mutationFn: async (data: typeof quotaData) => {
      const { error } = await supabase
        .from('kitchen_quotas')
        .upsert({
          shop_id: data.shop_id,
          product_id: data.product_id,
          date: data.date,
          shift: data.shift,
          quota_total: parseInt(data.quota_total),
          quota_used: 0,
        }, {
          onConflict: 'shop_id,product_id,date,shift'
        });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Quota set successfully' });
      queryClient.invalidateQueries({ queryKey: ['kitchen-quotas'] });
      onOpenChange(false);
      setQuotaData({
        shop_id: '',
        product_id: '',
        date: new Date().toISOString().split('T')[0],
        shift: 'all_day',
        quota_total: '',
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Set Production Quota</DialogTitle>
          <DialogDescription>
            Define how many items can be produced for a shop
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Shop</Label>
            <Select value={quotaData.shop_id} onValueChange={(value) => setQuotaData({ ...quotaData, shop_id: value })}>
              <SelectTrigger>
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
            <Label>Product</Label>
            <Select value={quotaData.product_id} onValueChange={(value) => setQuotaData({ ...quotaData, product_id: value })}>
              <SelectTrigger>
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
            <Label>Date</Label>
            <Input
              type="date"
              value={quotaData.date}
              onChange={(e) => setQuotaData({ ...quotaData, date: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Shift</Label>
            <Select value={quotaData.shift} onValueChange={(value) => setQuotaData({ ...quotaData, shift: value })}>
              <SelectTrigger>
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
            <Label>Quota Total</Label>
            <Input
              type="number"
              placeholder="100"
              value={quotaData.quota_total}
              onChange={(e) => setQuotaData({ ...quotaData, quota_total: e.target.value })}
            />
          </div>

          <Button
            className="w-full"
            onClick={() => setQuotaMutation.mutate(quotaData)}
            disabled={setQuotaMutation.isPending || !quotaData.shop_id || !quotaData.product_id || !quotaData.quota_total}
          >
            Set Quota
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
