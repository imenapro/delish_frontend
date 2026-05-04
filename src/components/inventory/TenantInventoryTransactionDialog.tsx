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
import { Plus, Minus, Search } from 'lucide-react';

interface TenantInventoryTransactionDialogProps {
  businessId: string;
  type: 'in' | 'out';
  initialShopId?: string;
  initialProductId?: string;
  restrictToTransferIn?: boolean;
  trigger?: React.ReactNode;
}

export function TenantInventoryTransactionDialog({ 
  businessId, 
  type,
  initialShopId,
  initialProductId,
  restrictToTransferIn,
  trigger
}: TenantInventoryTransactionDialogProps) {
  const { user, roles } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [formData, setFormData] = useState({
    shop_id: initialShopId || '',
    product_id: initialProductId || '',
    quantity: '',
    notes: '',
    reason_id: '',
    purchase_price: '',
    transfer_from_location_id: '',
    transfer_to_location_id: '',
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
      
      // Filter reasons if restricted
      let filteredData = data;
      if (restrictToTransferIn) {
        filteredData = data.filter(r => r.name.toLowerCase().includes('transfer in'));
      }

      // Remove duplicates by name to prevent UI confusion
      const uniqueReasons = filteredData.reduce((acc: any[], current) => {
        const exists = acc.find(item => item.name === current.name);
        if (!exists) {
          return [...acc, current];
        }
        return acc;
      }, []);

      return uniqueReasons;
    },
    enabled: !!businessId,
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
  });

  const { data: currentStock } = useQuery({
    queryKey: ['product-stock', formData.shop_id, formData.product_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shop_inventory')
        .select('stock')
        .eq('shop_id', formData.shop_id)
        .eq('product_id', formData.product_id)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return data?.stock || 0;
    },
    enabled: !!formData.shop_id && !!formData.product_id,
  });

  const { data: sourceStock } = useQuery({
    queryKey: ['product-stock', formData.transfer_from_location_id, formData.product_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shop_inventory')
        .select('stock')
        .eq('shop_id', formData.transfer_from_location_id)
        .eq('product_id', formData.product_id)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return data?.stock || 0;
    },
    enabled: !!formData.transfer_from_location_id && !!formData.product_id && type === 'in',
  });

  const allowedTransferShops = allShops?.filter(shop => {
    if (isAdminLike) return true;
    
    // Distributor/Distribution role cannot transfer from Production
    if (isDistributor) {
      const name = shop.name.toUpperCase();
      return name !== 'PRODUCTION';
    }

    if (!isProduction) return true;
    
    // Production role can only transfer to/from: themselves, distribution
    const name = shop.name.toUpperCase();
    return name === 'PRODUCTION' || name === 'DISTRIBUTION';
  });

  // Auto-select shop_id if only one manageable shop is available
  useEffect(() => {
    if (manageableShops && manageableShops.length === 1 && !formData.shop_id) {
      setFormData(prev => ({ ...prev, shop_id: manageableShops[0].id }));
    }
  }, [manageableShops, formData.shop_id]);

  // Auto-select reason if only one is available (for restricted users)
  useEffect(() => {
    if (reasons && reasons.length === 1 && !formData.reason_id) {
      setFormData(prev => ({ ...prev, reason_id: reasons[0].id }));
    }
  }, [reasons, formData.reason_id]);

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
      
      const sourceShop = allShops?.find(s => s.id === data.transfer_from_location_id);
      const destShop = allShops?.find(s => s.id === data.transfer_to_location_id);

      const transactions = [];

      // Primary transaction
      transactions.push({
        shop_id: data.shop_id,
        product_id: data.product_id,
        quantity: adjustedQuantity,
        transaction_type: type === 'in' ? 'in' : 'out',
        notes: data.notes,
        reason_id: data.reason_id,
        purchase_price: data.purchase_price ? parseFloat(data.purchase_price) : null,
        transfer_from_location: sourceShop?.name || null,
        transfer_to_location: destShop?.name || null,
        from_shop_id: data.transfer_from_location_id || null,
        to_shop_id: data.transfer_to_location_id || null,
        created_by: user?.id,
      });

      // Handle the "other side" of the transfer
      if (isTransfer) {
        if (type === 'out' && data.transfer_to_location_id) {
          // If we are transferring OUT of current shop, we should also record an IN transaction for the destination shop
          transactions.push({
            shop_id: data.transfer_to_location_id,
            product_id: data.product_id,
            quantity: Math.abs(quantity),
            transaction_type: 'in',
            notes: `Transfer from ${allShops?.find(s => s.id === data.shop_id)?.name}. ${data.notes}`,
            reason_id: data.reason_id,
            transfer_from_location: allShops?.find(s => s.id === data.shop_id)?.name || null,
            transfer_to_location: destShop?.name || null,
            from_shop_id: data.shop_id,
            to_shop_id: data.transfer_to_location_id,
            created_by: user?.id,
          });
        } else if (type === 'in' && data.transfer_from_location_id) {
          // If we are transferring IN to current shop, we should also record an OUT transaction for the source shop
          transactions.push({
            shop_id: data.transfer_from_location_id,
            product_id: data.product_id,
            quantity: -Math.abs(quantity),
            transaction_type: 'out',
            notes: `Transfer to ${allShops?.find(s => s.id === data.shop_id)?.name}. ${data.notes}`,
            reason_id: data.reason_id,
            transfer_from_location: sourceShop?.name || null,
            transfer_to_location: allShops?.find(s => s.id === data.shop_id)?.name || null,
            from_shop_id: data.transfer_from_location_id,
            to_shop_id: data.shop_id,
            created_by: user?.id,
          });
        }
      }

      const { error: txError } = await supabase
        .from('inventory_transactions')
        .insert(transactions);

      if (txError) throw txError;
    },
    onSuccess: () => {
      toast({
        title: type === 'in' ? "Stock added" : "Stock removed",
        description: `Inventory ${type === 'in' ? 'increased' : 'decreased'} successfully.`,
      });
      // Invalidate all inventory-related queries to ensure immediate UI update
      queryClient.invalidateQueries({ queryKey: ['inventory-transactions', businessId] });
      queryClient.invalidateQueries({ queryKey: ['shop-inventory', businessId] });
      queryClient.invalidateQueries({ queryKey: ['business-inventory', businessId] });
      queryClient.invalidateQueries({ queryKey: ['product-stock'] });
      queryClient.invalidateQueries({ queryKey: ['business-products', businessId] });
      // Force refetch immediately
      queryClient.refetchQueries({ queryKey: ['business-inventory', businessId] });
      setOpen(false);
      setFormData({ 
        shop_id: initialShopId || '', 
        product_id: initialProductId || '', 
        quantity: '', 
        notes: '',
        reason_id: '',
        purchase_price: '',
        transfer_from_location_id: '',
        transfer_to_location_id: '',
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
              disabled={!!initialShopId || (manageableShops?.length === 1 && !isAdminLike)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select shop" />
              </SelectTrigger>
              <SelectContent>
                {manageableShops?.map((shop) => (
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
              {type === 'in' && (
                <div className="space-y-2">
                  <Label>Transfer From <span className="text-red-500">*</span></Label>
                  <Select 
                    value={formData.transfer_from_location_id} 
                    onValueChange={(value) => setFormData({ ...formData, transfer_from_location_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select source shop" />
                    </SelectTrigger>
                    <SelectContent>
                      {allowedTransferShops?.filter(s => s.id !== formData.shop_id).map((shop) => (
                        <SelectItem key={shop.id} value={shop.id}>{shop.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formData.transfer_from_location_id && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Available at Source: {sourceStock || 0}
                    </p>
                  )}
                </div>
              )}
              {type === 'out' && (
                <div className="space-y-2">
                  <Label>Transfer To <span className="text-red-500">*</span></Label>
                  <Select 
                    value={formData.transfer_to_location_id} 
                    onValueChange={(value) => setFormData({ ...formData, transfer_to_location_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select destination shop" />
                    </SelectTrigger>
                    <SelectContent>
                      {allowedTransferShops?.filter(s => s.id !== formData.shop_id).map((shop) => (
                        <SelectItem key={shop.id} value={shop.id}>{shop.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </>
          )}

          <div className="space-y-2">
            <Label>Quantity <span className="text-red-500">*</span></Label>
            <Input
              type="number"
              min="1"
              max={type === 'out' ? (currentStock || 0) : (isTransfer ? (sourceStock || 0) : undefined)}
              value={formData.quantity}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                if (type === 'out' && val > (currentStock || 0)) {
                  toast({
                    title: "Insufficient Stock",
                    description: `You only have ${currentStock || 0} in stock.`,
                    variant: "destructive",
                  });
                  return;
                }
                if (type === 'in' && isTransfer && val > (sourceStock || 0)) {
                  toast({
                    title: "Insufficient Stock at Source",
                    description: `The source shop only has ${sourceStock || 0} in stock.`,
                    variant: "destructive",
                  });
                  return;
                }
                setFormData({ ...formData, quantity: e.target.value });
              }}
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
            (isTransfer && (type === 'out' ? !formData.transfer_to_location_id : !formData.transfer_from_location_id))
          }
          className="w-full"
        >
          {createTransactionMutation.isPending ? "Processing..." : `Confirm Stock ${type === 'in' ? 'In' : 'Out'}`}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
