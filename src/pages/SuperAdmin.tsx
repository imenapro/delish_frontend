import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Store, DollarSign, Users, TrendingUp } from 'lucide-react';
import { StoreTable } from '@/components/super-admin/StoreTable';
import { CreateStoreDialog } from '@/components/super-admin/CreateStoreDialog';
import { EditStoreDialog } from '@/components/super-admin/EditStoreDialog';
import { MetricsCards } from '@/components/super-admin/MetricsCards';
import { RevenueChart } from '@/components/super-admin/RevenueChart';
import { mockStores } from '@/mock/stores';
import { Store as StoreType } from '@/contexts/StoreContext';

export default function SuperAdmin() {
  const [stores, setStores] = useState<StoreType[]>(mockStores);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedStore, setSelectedStore] = useState<StoreType | null>(null);

  const handleCreateStore = (newStore: Omit<StoreType, 'id'>) => {
    const store: StoreType = {
      ...newStore,
      id: `store-${Date.now()}`,
    };
    setStores([...stores, store]);
    setCreateDialogOpen(false);
  };

  const handleEditStore = (updatedStore: StoreType) => {
    setStores(stores.map(s => s.id === updatedStore.id ? updatedStore : s));
    setEditDialogOpen(false);
    setSelectedStore(null);
  };

  const handleDeleteStore = (storeId: string) => {
    if (confirm('Are you sure you want to delete this store?')) {
      setStores(stores.filter(s => s.id !== storeId));
    }
  };

  const openEditDialog = (store: StoreType) => {
    setSelectedStore(store);
    setEditDialogOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Super Admin Dashboard</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Manage all stores, subscriptions, and analytics
              </p>
            </div>
            <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Create Store
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8 space-y-8">
        {/* Metrics Cards */}
        <MetricsCards stores={stores} />

        {/* Revenue Chart */}
        <RevenueChart />

        {/* Stores Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Store className="h-5 w-5" />
              All Stores
            </CardTitle>
            <CardDescription>
              Manage and monitor all store subscriptions and status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <StoreTable
              stores={stores}
              onEdit={openEditDialog}
              onDelete={handleDeleteStore}
            />
          </CardContent>
        </Card>
      </main>

      {/* Dialogs */}
      <CreateStoreDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSubmit={handleCreateStore}
      />

      {selectedStore && (
        <EditStoreDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          store={selectedStore}
          onSubmit={handleEditStore}
        />
      )}
    </div>
  );
}
