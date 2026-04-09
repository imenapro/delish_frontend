import { formatCurrency, DEFAULT_SYSTEM_CURRENCY } from '@/utils/currency';
import { Layout } from '@/components/Layout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DollarSign, TrendingUp, TrendingDown, Users, Store, Trophy } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { useStoreContext } from '@/contexts/StoreContext';

import { PaymentMethodsTab } from '@/components/finance/payment-methods/PaymentMethodsTab';
import { ExpensesManager } from '@/components/finance/ExpensesManager';

export default function Finance() {
  const { store } = useStoreContext();

  // Fetch shops for this business
  const { data: shops = [] } = useQuery({
    queryKey: ['finance-shops', store?.id],
    queryFn: async () => {
      if (!store?.id) return [];
      const { data, error } = await supabase
        .from('shops')
        .select('id, name')
        .eq('business_id', store.id)
        .eq('is_active', true);
      if (error) throw error;
      return data || [];
    },
    enabled: !!store?.id,
  });

  const shopIds = shops.map(s => s.id);

  // Shop performance data
  const { data: shopPerformance, isLoading: shopPerformanceLoading } = useQuery({
    queryKey: ['shop-performance', store?.id, shopIds],
    queryFn: async () => {
      if (!store?.id || shopIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from('orders')
        .select('total_amount, shop_id_origin')
        .in('shop_id_origin', shopIds)
        .in('status', ['delivered', 'ready']);
      
      if (error) throw error;
      
      // Group by shop and calculate totals
      const shopTotals = data.reduce((acc, order) => {
        const shopId = order.shop_id_origin;
        if (!acc[shopId]) {
          acc[shopId] = { total: 0, count: 0 };
        }
        acc[shopId].total += Number(order.total_amount);
        acc[shopId].count += 1;
        return acc;
      }, {} as Record<string, { total: number; count: number }>);
      
      // Map to shop data
      return shops.map(shop => ({
        id: shop.id,
        name: shop.name,
        revenue: shopTotals[shop.id]?.total || 0,
        orderCount: shopTotals[shop.id]?.count || 0,
      })).sort((a, b) => b.revenue - a.revenue); // Sort by revenue descending
      
    },
    enabled: !!store?.id && shopIds.length > 0,
  });
  const { store } = useStoreContext();
  const { data: expenses, isLoading: expensesLoading } = useQuery({
    queryKey: ['expenses', store?.id],
    queryFn: async () => {
      if (!store?.id) return [];
      
      const { data, error } = await supabase
        .from('expenses')
        .select(`
          *,
          shop:shops(name)
        `)
        .eq('business_id', store.id)
        .is('deleted_at', null)
        .order('expense_date', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data;
    },
    enabled: !!store?.id,
  });

  const { data: payroll, isLoading: payrollLoading } = useQuery({
    queryKey: ['payroll', store?.id, shopIds],
    queryFn: async () => {
      if (!store?.id || shopIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from('payroll')
        .select('*')
        .in('shop_id', shopIds)
        .order('period_end', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data;
    },
    enabled: !!store?.id && shopIds.length > 0,
  });

  const { data: revenue, isLoading: revenueLoading } = useQuery({
    queryKey: ['revenue-summary', store?.id, shopIds],
    queryFn: async () => {
      if (!store?.id || shopIds.length === 0) return { total: 0, count: 0 };
      
      const { data, error } = await supabase
        .from('orders')
        .select('total_amount, status')
        .in('shop_id_origin', shopIds)
        .in('status', ['delivered', 'ready']);
      
      if (error) throw error;
      const total = data.reduce((sum, order) => sum + Number(order.total_amount), 0);
      return { total, count: data.length };
    },
    enabled: !!store?.id && shopIds.length > 0,
  });

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-warning text-warning-foreground',
      approved: 'bg-success text-success-foreground',
      rejected: 'bg-destructive text-destructive-foreground',
      paid: 'bg-primary text-primary-foreground',
    };
    return colors[status] || 'bg-secondary';
  };

  return (
    <ProtectedRoute requiredRoles={['admin', 'accountant', 'store_owner']}>
      <Layout>
        <div className="p-8">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
                <DollarSign className="h-8 w-8" />
                Financial Management
              </h1>
              <p className="text-muted-foreground mt-1">
                Track revenue, expenses, and payroll
              </p>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
            <Card className="shadow-[var(--shadow-medium)]">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <TrendingUp className="h-4 w-4 text-success" />
              </CardHeader>
              <CardContent>
                {revenueLoading ? (
                  <div className="h-8 w-24 animate-pulse bg-muted rounded" />
                ) : (
                  <>
                    <div className="text-2xl font-bold">
                      {formatCurrency(revenue?.total || 0, DEFAULT_SYSTEM_CURRENCY)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      From {revenue?.count} completed orders
                    </p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-[var(--shadow-medium)]">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
                <TrendingDown className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                {expensesLoading ? (
                  <div className="h-8 w-24 animate-pulse bg-muted rounded" />
                ) : (
                  <>
                    <div className="text-2xl font-bold">
                      {formatCurrency(expenses?.filter(e => e.status === 'approved').reduce((sum, e) => sum + Number(e.amount), 0) || 0, DEFAULT_SYSTEM_CURRENCY)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {expenses?.filter(e => e.status === 'approved').length} approved expenses
                    </p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-[var(--shadow-medium)]">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Payroll</CardTitle>
                <Users className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                {payrollLoading ? (
                  <div className="h-8 w-24 animate-pulse bg-muted rounded" />
                ) : (
                  <>
                    <div className="text-2xl font-bold">
                      {formatCurrency(payroll?.filter(p => p.status === 'paid').reduce((sum, p) => sum + Number(p.total_amount), 0) || 0, DEFAULT_SYSTEM_CURRENCY)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {payroll?.filter(p => p.status === 'paid').length} payments processed
                    </p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-[var(--shadow-medium)]">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Best Performing Shop</CardTitle>
                <Trophy className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                {shopPerformanceLoading ? (
                  <div className="h-8 w-24 animate-pulse bg-muted rounded" />
                ) : shopPerformance && shopPerformance.length > 0 ? (
                  <>
                    <div className="text-2xl font-bold">
                      {shopPerformance[0].name}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(shopPerformance[0].revenue, DEFAULT_SYSTEM_CURRENCY)} from {shopPerformance[0].orderCount} orders
                    </p>
                  </>
                ) : (
                  <div className="text-sm text-muted-foreground">No shop data available</div>
                )}
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="shop-performance">Shop Performance</TabsTrigger>
              <TabsTrigger value="expenses">Expenses</TabsTrigger>
              <TabsTrigger value="payroll">Payroll</TabsTrigger>
              <TabsTrigger value="payment-methods">Payment Methods</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              {/* Summary Cards are already above */}
            </TabsContent>

            <TabsContent value="shop-performance" className="space-y-4">
              {shopPerformanceLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                </div>
              ) : shopPerformance && shopPerformance.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {shopPerformance.map((shop, index) => (
                    <Card key={shop.id} className={`shadow-[var(--shadow-soft)] ${index === 0 ? 'ring-2 ring-yellow-500' : ''}`}>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                          {index === 0 && <Trophy className="h-4 w-4 text-yellow-500" />}
                          {shop.name}
                        </CardTitle>
                        <Store className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {formatCurrency(shop.revenue, DEFAULT_SYSTEM_CURRENCY)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {shop.orderCount} orders completed
                        </p>
                        {index === 0 && (
                          <Badge className="mt-2 bg-yellow-500 text-yellow-900">
                            Top Performer
                          </Badge>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Store className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No shop performance data available</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="payment-methods">
              <PaymentMethodsTab />
            </TabsContent>

            <TabsContent value="expenses" className="space-y-4">
              <ExpensesManager />
            </TabsContent>

            <TabsContent value="payroll" className="space-y-4">
              {payrollLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                </div>
              ) : payroll && payroll.length > 0 ? (
                <div className="space-y-4">
                  {payroll.map((record) => (
                    <Card key={record.id} className="shadow-[var(--shadow-soft)]">
                      <CardContent className="flex items-center justify-between p-6">
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-3">
                            <span className="font-semibold">
                              Payroll Period: {format(new Date(record.period_start), 'MMM dd')} - {format(new Date(record.period_end), 'MMM dd, yyyy')}
                            </span>
                            <Badge className={getStatusColor(record.status)}>
                              {record.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Base: {formatCurrency(Number(record.base_salary), record.currency || DEFAULT_SYSTEM_CURRENCY)} | 
                            Bonuses: {formatCurrency(Number(record.bonuses), record.currency || DEFAULT_SYSTEM_CURRENCY)} | 
                            Deductions: {formatCurrency(Number(record.deductions), record.currency || DEFAULT_SYSTEM_CURRENCY)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-primary">
                            {formatCurrency(Number(record.total_amount), record.currency || DEFAULT_SYSTEM_CURRENCY)}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Users className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No payroll records</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
