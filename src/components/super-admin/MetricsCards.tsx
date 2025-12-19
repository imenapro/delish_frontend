import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Store as StoreType } from '@/contexts/StoreContext';
import { Store, DollarSign, Users, TrendingUp } from 'lucide-react';

interface MetricsCardsProps {
  stores: StoreType[];
}

export function MetricsCards({ stores }: MetricsCardsProps) {
  const totalStores = stores.length;
  const activeStores = stores.filter(s => s.status === 'active').length;
  const expiringStores = stores.filter(s => s.status === 'expiring_soon').length;
  const expiredStores = stores.filter(s => s.status === 'expired').length;

  // Mock revenue calculation
  const planPrices = {
    trial: 0,
    monthly: 29.99,
    quarterly: 79.99,
    annual: 299.99,
  };

  const totalRevenue = stores.reduce((sum, store) => {
    return sum + (planPrices[store.planType] || 0);
  }, 0);

  const monthlyRevenue = stores
    .filter(s => s.planType === 'monthly')
    .reduce((sum, store) => sum + planPrices.monthly, 0);

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Stores</CardTitle>
          <Store className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalStores}</div>
          <p className="text-xs text-muted-foreground">
            {activeStores} active, {expiredStores} expired
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">${totalRevenue.toFixed(2)}</div>
          <p className="text-xs text-muted-foreground">
            From all active subscriptions
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">${monthlyRevenue.toFixed(2)}</div>
          <p className="text-xs text-muted-foreground">
            +12% from last month
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{expiringStores}</div>
          <p className="text-xs text-muted-foreground">
            Stores need attention
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
