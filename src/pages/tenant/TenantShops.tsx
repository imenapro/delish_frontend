import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { TenantPageWrapper } from '@/components/tenant/TenantPageWrapper';
import { ShopCard } from '@/components/shops/ShopCard';
import { AddTenantShopDialog } from '@/components/shops/AddTenantShopDialog';
import { EditTenantShopDialog } from '@/components/shops/EditTenantShopDialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useStoreContext } from '@/contexts/StoreContext';
import { Store, MapPin, Plus, Building2 } from 'lucide-react';

export default function TenantShops() {
  const { store } = useStoreContext();
  const queryClient = useQueryClient();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedShop, setSelectedShop] = useState<any>(null);

  // Fetch shops for this business
  const { data: shops = [], isLoading: shopsLoading } = useQuery({
    queryKey: ['tenant-shops-full', store?.id],
    queryFn: async () => {
      if (!store?.id) return [];
      
      const { data, error } = await supabase
        .from('shops')
        .select('*')
        .eq('business_id', store.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;

      // Get staff counts per shop
      const shopsWithCounts = await Promise.all((data || []).map(async (shop) => {
        const { count: staffCount } = await supabase
          .from('user_roles')
          .select('*', { count: 'exact', head: true })
          .eq('shop_id', shop.id);

        const { count: productCount } = await supabase
          .from('shop_inventory')
          .select('*, product:products!inner(*)', { count: 'exact', head: true })
          .eq('shop_id', shop.id)
          .eq('product.is_active', true);

        return {
          ...shop,
          staff_count: staffCount || 0,
          product_count: productCount || 0,
        };
      }));

      return shopsWithCounts;
    },
    enabled: !!store?.id,
  });

  // Stats
  const totalShops = shops.length;
  const activeShops = shops.filter(s => s.is_active).length;

  return (
    <TenantPageWrapper
      title="Shops"
      description="Manage your store locations"
      actions={
        <Button onClick={() => setAddDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Shop
        </Button>
      }
    >
      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Shops</CardTitle>
            <Store className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalShops}</div>
            <p className="text-xs text-muted-foreground">Store locations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Locations</CardTitle>
            <Building2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeShops}</div>
            <p className="text-xs text-muted-foreground">Currently operating</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Primary Location</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold truncate">
              {shops[0]?.name || 'None'}
            </div>
            <p className="text-xs text-muted-foreground">Headquarters</p>
          </CardContent>
        </Card>
      </div>

      {/* Shops Grid */}
      <Card>
        <CardHeader>
          <CardTitle>Shop Locations</CardTitle>
          <CardDescription>View and manage all your store locations</CardDescription>
        </CardHeader>
        <CardContent>
          {shopsLoading ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-48" />
              ))}
            </div>
          ) : shops.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Store className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="font-semibold text-lg">No Shops Yet</h3>
              <p className="text-muted-foreground mb-4">Add your first shop location to get started</p>
              <Button onClick={() => setAddDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Your First Shop
              </Button>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {shops.map((shop) => (
                <ShopCard
                  key={shop.id}
                  shop={shop}
                  onEdit={(s) => {
                    setSelectedShop(s);
                    setEditDialogOpen(true);
                  }}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Shop Dialog */}
      <AddTenantShopDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['tenant-shops-full'] })}
      />

      {/* Edit Shop Dialog */}
      {selectedShop && (
        <EditTenantShopDialog
          open={editDialogOpen}
          onOpenChange={(open) => {
            setEditDialogOpen(open);
            if (!open) setSelectedShop(null);
          }}
          shop={selectedShop}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['tenant-shops-full'] });
            setSelectedShop(null);
          }}
        />
      )}
    </TenantPageWrapper>
  );
}
