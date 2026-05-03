import { useState, useEffect } from 'react';
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
import { ArrowLeftRight, Search } from 'lucide-react';

interface TenantStockTransferDialogProps {
  businessId: string;
}

export function TenantStockTransferDialog({ businessId }: TenantStockTransferDialogProps) {
  const { user, roles } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [formData, setFormData] = useState({
    from_shop_id: '',
    to_shop_id: '',
    product_id: '',
    quantity: '',
    notes: '',
  });

  const { data: allShops } = useQuery({
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

  const isAdminLike = roles.some(r =>
    ['super_admin', 'admin', 'store_owner', 'branch_manager', 'accountant', 'manager'].includes(r.role.toLowerCase()) &&
    (r.business_id ? r.business_id === businessId : true)
  );

  const assignedShopIds = roles
    .filter(r => r.shop_id && (r.business_id ? r.business_id === businessId : true))
    .map(r => r.shop_id as string);

  const isDistributor = roles.some(r => r.role.toLowerCase() === 'distributor');
  const isProduction = roles.some(r => r.role.toLowerCase() === 'production');

  const manageableShops = allShops?.filter(shop => {
    if (isAdminLike) return true;
    if (assignedShopIds.includes(shop.id)) return true;
    if (isDistributor && (shop.name.toUpperCase() === 'DISTRIBUTOR' || shop.name.toUpperCase() === 'DISTRIBUTION')) return true;
    if (isProduction && (shop.name.toUpperCase() === 'PRODUCTION' || shop.name.toUpperCase() === 'DISTRIBUTION' || shop.name.toUpperCase() === 'DISTRIBUTOR')) return true;
    return false;
  }) || [];

  const targetShops = allShops?.filter(shop => {
    if (isAdminLike) return true;
    if (isProduction) {
      // Production can only transfer to themselves, Distribution, or Distributor
      const name = shop.name.toUpperCase();
      return name === 'PRODUCTION' || name === 'DISTRIBUTION' || name === 'DISTRIBUTOR';
    }
    return true; // Other roles can transfer to any shop
  }) || [];

  // Auto-select from_shop_id if only one manageable shop is available
  useEffect(() => {
    if (manageableShops.length === 1 && !formData.from_shop_id) {
      setFormData(prev => ({ ...prev, from_shop_id: manageableShops[0].id }));
    }
  }, [manageableShops, formData.from_shop_id]);

  const { data: currentStock } = useQuery({
    queryKey: ['product-stock', formData.from_shop_id, formData.product_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shop_inventory')
        .select('stock')
        .eq('shop_id', formData.from_shop_id)
        .eq('product_id', formData.product_id)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return data?.stock || 0;
    },
    enabled: !!formData.from_shop_id && !!formData.product_id,
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

  const createTransferMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase
        .from('stock_transfers')
        .insert([{
          from_shop_id: data.from_shop_id,
          to_shop_id: data.to_shop_id,
          product_id: data.product_id,
          quantity: parseInt(data.quantity),
          notes: data.notes || null,
          requested_by: user?.id,
          status: 'pending',
        }]);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Transfer request created",
        description: "Stock transfer request submitted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['stock-transfers', businessId] });
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

  const hasMultipleShops = allShops && allShops.length > 1;

  if (!hasMultipleShops) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <ArrowLeftRight className="mr-2 h-4 w-4" />
          Transfer Stock
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Transfer Stock Between Shops</DialogTitle>
          <DialogDescription>
            Move inventory from one shop to another
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>From Shop</Label>
            <Select 
              value={formData.from_shop_id} 
              onValueChange={(value) => setFormData({ ...formData, from_shop_id: value })}
              disabled={manageableShops.length === 1 && !isAdminLike}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select source shop" />
              </SelectTrigger>
              <SelectContent>
                {manageableShops?.map((shop) => (
                  <SelectItem key={shop.id} value={shop.id}>{shop.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>To Shop</Label>
            <Select value={formData.to_shop_id} onValueChange={(value) => setFormData({ ...formData, to_shop_id: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select destination shop" />
              </SelectTrigger>
              <SelectContent>
                {targetShops?.filter(s => s.id !== formData.from_shop_id).map((shop) => (
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
                <div className="p-2">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search products..."
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>
                {products?.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase())).map((product) => (
                  <SelectItem key={product.id} value={product.id}>{product.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {formData.product_id && (
              <p className="text-sm text-muted-foreground mt-1">
                Current Stock: {currentStock || 0}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Quantity</Label>
            <Input
              type="number"
              min="1"
              max={currentStock || 0}
              value={formData.quantity}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                if (val > (currentStock || 0)) {
                  toast({
                    title: "Insufficient Stock",
                    description: `You only have ${currentStock} in stock.`,
                    variant: "destructive",
                  });
                  return;
                }
                setFormData({ ...formData, quantity: e.target.value });
              }}
              placeholder="Enter quantity to transfer"
            />
          </div>
          <div className="space-y-2">
            <Label>Notes (Optional)</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Reason for transfer"
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
