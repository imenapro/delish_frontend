import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Store, DollarSign, Users, TrendingUp, RefreshCw, LogOut } from 'lucide-react';
import { StoreTable } from '@/components/super-admin/StoreTable';
import { CreateStoreDialog } from '@/components/super-admin/CreateStoreDialog';
import { EditStoreDialog } from '@/components/super-admin/EditStoreDialog';
import { MetricsCards } from '@/components/super-admin/MetricsCards';
import { RevenueChart } from '@/components/super-admin/RevenueChart';
import { SubscriptionManagement } from '@/components/super-admin/SubscriptionManagement';
import { AnalyticsDashboard } from '@/components/super-admin/AnalyticsDashboard';
import { UserManagement } from '@/components/super-admin/UserManagement';
import { AuditLogs } from '@/components/super-admin/AuditLogs';
import { CurrencyManagement } from '@/components/super-admin/CurrencyManagement';
import { SystemSettings } from '@/components/admin/SystemSettings';
import { Store as StoreType } from '@/contexts/StoreContext';
import { toast } from 'sonner';

export default function SuperAdmin() {
  const { user, roles, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const [stores, setStores] = useState<StoreType[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedStore, setSelectedStore] = useState<StoreType | null>(null);

  // Auth check
  useEffect(() => {
    if (!authLoading) {
      const isSuperAdmin = roles.some(r => r.role === 'super_admin');
      if (!user || !isSuperAdmin) {
        toast.error('Unauthorized access');
        navigate('/');
      }
    }
  }, [user, roles, authLoading, navigate]);

  const fetchStores = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;

      const mappedStores: StoreType[] = (data || []).map(b => ({
        id: b.id,
        name: b.name,
        slug: b.slug || '',
        logoUrl: b.logo_url || undefined,
        primaryColor: b.primary_color || '#000000',
        secondaryColor: b.secondary_color || '#ffffff',
        slogan: b.slogan || undefined,
        ownerEmail: 'N/A', // Placeholder
        planType: (b.plan_type as any) || 'trial',
        subscriptionStartDate: b.subscription_start_date || new Date().toISOString(),
        subscriptionEndDate: b.subscription_end_date || new Date().toISOString(),
        status: (b.status as any) || 'active',
        locale: 'en',
        customDomain: undefined
      }));

      setStores(mappedStores);
    } catch (error) {
      console.error('Error fetching stores:', error);
      toast.error('Failed to load stores');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && roles.some(r => r.role === 'super_admin')) {
      fetchStores();
    }
  }, [user, roles]);

  const handleCreateStore = async (newStore: Omit<StoreType, 'id'>) => {
    try {
      const { data, error } = await supabase
        .from('businesses')
        .insert([{
          name: newStore.name,
          slug: newStore.slug,
          primary_color: newStore.primaryColor,
          secondary_color: newStore.secondaryColor,
          plan_type: newStore.planType,
          status: 'active', // Default
          // Add other fields as necessary
        }])
        .select()
        .single();

      if (error) throw error;

      toast.success('Store created successfully');
      fetchStores();
      setCreateDialogOpen(false);
    } catch (error: any) {
      toast.error('Error creating store: ' + error.message);
    }
  };

  const handleEditStore = async (updatedStore: StoreType) => {
    try {
      const { error } = await supabase
        .from('businesses')
        .update({
          name: updatedStore.name,
          slug: updatedStore.slug,
          primary_color: updatedStore.primaryColor,
          secondary_color: updatedStore.secondaryColor,
          plan_type: updatedStore.planType,
          status: updatedStore.status,
          subscription_start_date: updatedStore.subscriptionStartDate,
          subscription_end_date: updatedStore.subscriptionEndDate
        })
        .eq('id', updatedStore.id);

      if (error) throw error;

      toast.success('Store updated successfully');
      fetchStores();
      setEditDialogOpen(false);
      setSelectedStore(null);
    } catch (error: any) {
      toast.error('Error updating store: ' + error.message);
    }
  };

  const handleDeleteStore = async (storeId: string) => {
    if (!confirm('Are you sure you want to delete this store? This action cannot be undone.')) return;

    try {
      const { error } = await supabase
        .from('businesses')
        .delete()
        .eq('id', storeId);

      if (error) throw error;

      toast.success('Store deleted successfully');
      fetchStores();
    } catch (error: any) {
      toast.error('Error deleting store: ' + error.message);
    }
  };

  const openEditDialog = (store: StoreType) => {
    setSelectedStore(store);
    setEditDialogOpen(true);
  };

  if (authLoading) return <div className="flex items-center justify-center min-h-screen">Loading...</div>;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Super Admin Dashboard</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Manage all stores, subscriptions, and analytics
              </p>
            </div>
            <div className="flex gap-2">
               <Button variant="outline" onClick={fetchStores} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Create Store
              </Button>
              <Button variant="destructive" size="icon" onClick={() => signOut()}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <Tabs defaultValue="overview" className="space-y-8">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="businesses">Businesses</TabsTrigger>
            <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="audit">Audit Logs</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-8">
            <MetricsCards stores={stores} />
            <RevenueChart />
          </TabsContent>

          <TabsContent value="businesses">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Store className="h-5 w-5" />
                  All Businesses
                </CardTitle>
                <CardDescription>
                  Manage and monitor all registered businesses
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
          </TabsContent>

          <TabsContent value="subscriptions">
            <SubscriptionManagement stores={stores} onUpdateStore={handleEditStore} />
          </TabsContent>

          <TabsContent value="analytics">
            <AnalyticsDashboard />
          </TabsContent>
          
          <TabsContent value="users">
            <UserManagement />
          </TabsContent>

          <TabsContent value="audit">
            <AuditLogs />
          </TabsContent>

          <TabsContent value="settings">
            <SystemSettings />
          </TabsContent>

        </Tabs>
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