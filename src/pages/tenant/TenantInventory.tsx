
import { useState, useEffect } from 'react';
import { TenantPageWrapper } from '@/components/tenant/TenantPageWrapper';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStoreContext } from '@/contexts/StoreContext';
import { TenantInventoryTransactionDialog } from '@/components/inventory/TenantInventoryTransactionDialog';
import { TenantStockTransferDialog } from '@/components/inventory/TenantStockTransferDialog';
import { InventoryBarcodeScanner } from '@/components/inventory/InventoryBarcodeScanner';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { ShopListView } from '@/components/inventory/ShopListView';
import { ShopDetailView } from '@/components/inventory/ShopDetailView';

export default function TenantInventory() {
  const { store } = useStoreContext();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const businessId = store?.id;
  const [selectedShopId, setSelectedShopId] = useState<string | null>(null);

  const { roles } = useAuth();

  // Define roles and permissions
  const isAdminLike = roles.some(r =>
    ['super_admin', 'admin', 'store_owner', 'branch_manager', 'accountant', 'manager'].includes(r.role.toLowerCase()) &&
    (r.business_id ? r.business_id === businessId : true)
  );

  const assignedShopIds = roles
    .filter(r => r.shop_id && (r.business_id ? r.business_id === businessId : true))
    .map(r => r.shop_id as string);

  const isDistributor = roles.some(r => r.role.toLowerCase() === 'distributor');
  const isProduction = roles.some(r => r.role.toLowerCase() === 'production');
  const isSeller = roles.some(r => r.role.toLowerCase() === 'seller');

  // Fetch all shops for this business
  const { data: allShops, isLoading: shopsLoading } = useQuery({
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

  // Filter shops based on role
  const shops = allShops?.filter(shop => {
    if (isAdminLike) return true;
    
    // Check if specifically assigned to this shop via shop_id
    if (assignedShopIds.includes(shop.id)) return true;

    // Check by name for special roles if no specific shop_id is assigned
    if (isDistributor && shop.name.toUpperCase() === 'DISTRIBUTOR') return true;
    if (isProduction && shop.name.toUpperCase() === 'PRODUCTION') return true;

    return false;
  });

  const shopIds = shops?.map(s => s.id) || [];

  // Auto-select shop if only one is available
  useEffect(() => {
    if (shops && shops.length === 1 && !selectedShopId) {
      setSelectedShopId(shops[0].id);
    }
  }, [shops, selectedShopId]);

  // Fetch inventory for all shops
  const { data: inventory, isLoading: inventoryLoading } = useQuery({
    queryKey: ['business-inventory', businessId],
    queryFn: async () => {
      if (!shopIds.length) return [];

      // 1. Fetch all active products
      const { data: allProducts, error: prodError } = await supabase
        .from('products')
        .select('id, name, category, image_url, price')
        .eq('business_id', businessId)
        .eq('is_active', true);
        
      if (prodError) throw prodError;

      // 2. Fetch existing inventory
      const { data: existingInventory, error: invError } = await supabase
        .from('shop_inventory')
        .select(`
          id,
          shop_id,
          product_id,
          price,
          stock,
          product:products (id, name, category, image_url)
        `)
        .in('shop_id', shopIds);
      if (invError) throw invError;
      
      // 3. Create map
      const invMap = new Map();
      existingInventory?.forEach(item => {
        invMap.set(`${item.shop_id}-${item.product_id}`, item);
      });

      // 4. Generate result
      const result = [];
      for (const shopId of shopIds) {
        for (const product of allProducts || []) {
           const key = `${shopId}-${product.id}`;
           const existing = invMap.get(key);
           
           if (existing && existing.product) {
             result.push(existing);
           } else {
             result.push({
               id: `virtual-${key}`,
               shop_id: shopId,
               product_id: product.id,
               price: product.price,
               stock: 0,
               product: product
             });
           }
        }
      }
      return result;
    },
    enabled: shopIds.length > 0,
  });

  // Fetch stock transfers
  const { data: transfers, isLoading: transfersLoading } = useQuery({
    queryKey: ['stock-transfers', businessId],
    queryFn: async () => {
      if (!shopIds.length) return [];
      const { data, error } = await supabase
        .from('stock_transfers')
        .select(`
          *,
          product:products (name),
          from_shop:shops!stock_transfers_from_shop_id_fkey (name),
          to_shop:shops!stock_transfers_to_shop_id_fkey (name)
        `)
        .or(`from_shop_id.in.(${shopIds.join(',')}),to_shop_id.in.(${shopIds.join(',')})`)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: shopIds.length > 0,
  });

  // Fetch recent transactions
  const { data: transactions, isLoading: transactionsLoading } = useQuery({
    queryKey: ['inventory-transactions', businessId],
    queryFn: async () => {
      if (!shopIds.length) return [];
      const { data, error } = await supabase
        .from('inventory_transactions')
        .select(`
          *,
          product:products (name),
          shop:shops!inventory_transactions_shop_id_fkey (name),
          reason:inventory_reasons (name)
        `)
        .in('shop_id', shopIds)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: shopIds.length > 0,
  });

  // Approve/Reject transfer mutation
  const updateTransferMutation = useMutation({
    mutationFn: async ({ transferId, status }: { transferId: string; status: 'approved' | 'rejected' }) => {
      const { error } = await supabase
        .from('stock_transfers')
        .update({ status, approved_by: user?.id })
        .eq('id', transferId);
      if (error) throw error;

      // If approved, update inventory
      if (status === 'approved') {
        const transfer = transfers?.find(t => t.id === transferId);
        if (transfer) {
          // Decrease from source shop
          const { data: fromInventory } = await supabase
            .from('shop_inventory')
            .select('stock')
            .eq('shop_id', transfer.from_shop_id)
            .eq('product_id', transfer.product_id)
            .single();

          if (fromInventory) {
            await supabase
              .from('shop_inventory')
              .update({ stock: Math.max(0, (fromInventory.stock || 0) - transfer.quantity) })
              .eq('shop_id', transfer.from_shop_id)
              .eq('product_id', transfer.product_id);
          }

          // Increase in destination shop
          const { data: toInventory } = await supabase
            .from('shop_inventory')
            .select('stock')
            .eq('shop_id', transfer.to_shop_id)
            .eq('product_id', transfer.product_id)
            .single();

          if (toInventory) {
            await supabase
              .from('shop_inventory')
              .update({ stock: (toInventory.stock || 0) + transfer.quantity })
              .eq('shop_id', transfer.to_shop_id)
              .eq('product_id', transfer.product_id);
          }
        }
      }
    },
    onSuccess: (_, { status }) => {
      toast({
        title: status === 'approved' ? 'Transfer approved' : 'Transfer rejected',
        description: status === 'approved' ? 'Stock has been transferred.' : 'Transfer request was rejected.',
      });
      queryClient.invalidateQueries({ queryKey: ['stock-transfers', businessId] });
      queryClient.invalidateQueries({ queryKey: ['business-inventory', businessId] });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'An error occurred';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
        duration: 5000,
      });
    },
  });

  const selectedShop = shops?.find(s => s.id === selectedShopId);

  if (shopsLoading || inventoryLoading) {
    return (
      <TenantPageWrapper title="Inventory" description="Loading inventory data...">
        <div className="flex h-[50vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </TenantPageWrapper>
    );
  }

  return (
    <TenantPageWrapper
      title="Inventory"
      description="Track stock levels and manage inventory"
      actions={
        <div className="flex gap-2 flex-wrap">
          {businessId && <InventoryBarcodeScanner businessId={businessId} />}
          {businessId && !isSeller && <TenantInventoryTransactionDialog businessId={businessId} type="in" />}
          {businessId && !isSeller && <TenantInventoryTransactionDialog businessId={businessId} type="out" />}
          {businessId && !isSeller && <TenantStockTransferDialog businessId={businessId} />}
        </div>
      }
    >
      {selectedShopId && selectedShop ? (
        <ShopDetailView 
          shop={selectedShop}
          inventory={inventory?.filter(i => i.shop_id === selectedShopId) || []}
          transfers={transfers?.filter(t => t.from_shop_id === selectedShopId || t.to_shop_id === selectedShopId) || []}
          transactions={transactions?.filter(t => t.shop_id === selectedShopId) || []}
          onBack={() => setSelectedShopId(null)}
          updateTransferMutation={updateTransferMutation}
        />
      ) : (
        <ShopListView 
          shops={shops || []}
          inventory={inventory || []}
          onSelectShop={setSelectedShopId}
        />
      )}
    </TenantPageWrapper>
  );
}
