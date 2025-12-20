import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStoreContext } from '@/contexts/StoreContext';
import { useAuth } from '@/hooks/useAuth';
import { useShopMetrics } from '@/hooks/useShopMetrics';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { Breadcrumbs } from '@/components/navigation/Breadcrumbs';
import { Store, Clock, CreditCard, Settings, Loader2, Package, Users, ShoppingCart, TrendingUp } from 'lucide-react';

export default function TenantDashboard() {
  const { store, loading, daysUntilExpiration, isExpired, getTenantRoute } = useStoreContext();
  const { user, loading: authLoading } = useAuth();
  const { data: metrics, isLoading: metricsLoading } = useShopMetrics(store?.id);
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user && store?.slug) {
      // Use navigate to handle custom domains correctly and avoid server 404s
      navigate(getTenantRoute('/login'));
    }
  }, [user, authLoading, store, getTenantRoute, navigate]);

  if (loading || authLoading || metricsLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-6 space-y-6">
        {/* Breadcrumb */}
        <Breadcrumbs />

        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back to {store?.name}</p>
        </div>

        {/* Quick Actions */}
        <QuickActions />

        {/* Subscription Status Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Subscription Status
            </CardTitle>
            <CardDescription>
              Your current plan and subscription details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Current Plan</p>
                <p className="text-2xl font-bold">{store?.planType?.toUpperCase() || 'TRIAL'}</p>
              </div>
              <Badge variant={isExpired ? 'destructive' : daysUntilExpiration <= 7 ? 'secondary' : 'default'}>
                {isExpired ? 'Expired' : `${daysUntilExpiration} days left`}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Started</p>
                <p className="font-medium">
                  {store?.subscriptionStartDate && new Date(store.subscriptionStartDate).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Expires</p>
                <p className="font-medium">
                  {store?.subscriptionEndDate && new Date(store.subscriptionEndDate).toLocaleDateString()}
                </p>
              </div>
            </div>

            {!isExpired && daysUntilExpiration <= 7 && (
              <Button className="w-full">
                <Clock className="mr-2 h-4 w-4" />
                Renew Now - Don't lose access!
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Store Overview Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Products</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics?.totalProducts || 0}</div>
              <p className="text-xs text-muted-foreground">Products in inventory</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Workers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics?.totalWorkers || 0}</div>
              <p className="text-xs text-muted-foreground">Active employees</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics?.totalOrders || 0}</div>
              <p className="text-xs text-muted-foreground">All-time orders</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: 'RWF',
                  minimumFractionDigits: 0,
                }).format(metrics?.monthlyRevenue || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                Today: {new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: 'RWF',
                  minimumFractionDigits: 0,
                }).format(metrics?.todayRevenue || 0)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Store Info and Theme Preview */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Store Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <p className="text-sm text-muted-foreground">Store Name</p>
                <p className="font-medium">{store?.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">URL Slug</p>
                <p className="font-mono text-sm">/{store?.slug}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Language</p>
                <p className="font-medium">{store?.locale?.toUpperCase() || 'EN'}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Theme Preview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex gap-2">
                <div
                  className="h-12 w-12 rounded border"
                  style={{ backgroundColor: store?.primaryColor || '#6366f1' }}
                />
                <div
                  className="h-12 w-12 rounded border"
                  style={{ backgroundColor: store?.secondaryColor || '#ec4899' }}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                These are your store's brand colors
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Slogan Display */}
        {store?.slogan && (
          <Card>
            <CardContent className="py-6 text-center">
              <p className="text-xl font-semibold text-muted-foreground italic">
                "{store.slogan}"
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
