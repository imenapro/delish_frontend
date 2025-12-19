import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { TenantPageWrapper } from '@/components/tenant/TenantPageWrapper';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DollarSign, TrendingUp, TrendingDown, Wallet, Receipt, Percent } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useStoreContext } from '@/contexts/StoreContext';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';

const TAX_RATE = 0.18; // 18% VAT

export default function TenantFinance() {
  const { store } = useStoreContext();
  const [period, setPeriod] = useState('this_month');

  // Calculate date range based on period
  const getDateRange = () => {
    const now = new Date();
    switch (period) {
      case 'this_month':
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'last_month':
        const lastMonth = subMonths(now, 1);
        return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
      case 'last_3_months':
        return { start: startOfMonth(subMonths(now, 2)), end: endOfMonth(now) };
      default:
        return { start: startOfMonth(now), end: endOfMonth(now) };
    }
  };

  const dateRange = getDateRange();

  // Fetch shops for this business
  const { data: shops = [] } = useQuery({
    queryKey: ['tenant-shops', store?.id],
    queryFn: async () => {
      if (!store?.id) return [];
      const { data, error } = await supabase
        .from('shops')
        .select('id, name')
        .eq('business_id', store.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!store?.id,
  });

  const shopIds = shops.map(s => s.id);

  // Fetch revenue from orders
  const { data: revenueData, isLoading: revenueLoading } = useQuery({
    queryKey: ['tenant-finance-revenue', store?.id, period, shopIds],
    queryFn: async () => {
      if (!store?.id || shopIds.length === 0) return { gross: 0, tax: 0, net: 0, orderCount: 0 };

      const { data, error } = await supabase
        .from('orders')
        .select('total_amount, status')
        .in('shop_id_origin', shopIds)
        .gte('created_at', dateRange.start.toISOString())
        .lte('created_at', dateRange.end.toISOString())
        .in('status', ['confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered']);

      if (error) throw error;

      const gross = (data || []).reduce((sum, o) => sum + Number(o.total_amount), 0);
      const tax = gross * TAX_RATE;
      const net = gross - tax;

      return { gross, tax, net, orderCount: data?.length || 0 };
    },
    enabled: !!store?.id && shopIds.length > 0,
  });

  // Fetch expenses
  const { data: expenseData, isLoading: expenseLoading } = useQuery({
    queryKey: ['tenant-finance-expenses', store?.id, period, shopIds],
    queryFn: async () => {
      if (!store?.id || shopIds.length === 0) return { total: 0, pending: 0, approved: 0, items: [] };

      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .in('shop_id', shopIds)
        .gte('expense_date', dateRange.start.toISOString().split('T')[0])
        .lte('expense_date', dateRange.end.toISOString().split('T')[0])
        .order('expense_date', { ascending: false });

      if (error) throw error;

      const total = (data || []).reduce((sum, e) => sum + Number(e.amount), 0);
      const pending = (data || []).filter(e => e.status === 'pending').reduce((sum, e) => sum + Number(e.amount), 0);
      const approved = (data || []).filter(e => e.status === 'approved').reduce((sum, e) => sum + Number(e.amount), 0);

      return { total, pending, approved, items: data || [] };
    },
    enabled: !!store?.id && shopIds.length > 0,
  });

  // Calculate net profit
  const netProfit = (revenueData?.net || 0) - (expenseData?.total || 0);

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-warning text-warning-foreground',
      approved: 'bg-success text-success-foreground',
      rejected: 'bg-destructive text-destructive-foreground',
    };
    return colors[status] || 'bg-secondary';
  };

  const isLoading = revenueLoading || expenseLoading;

  return (
    <TenantPageWrapper
      title="Finance"
      description="Track revenue, expenses, and financial performance"
      actions={
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="this_month">This Month</SelectItem>
            <SelectItem value="last_month">Last Month</SelectItem>
            <SelectItem value="last_3_months">Last 3 Months</SelectItem>
          </SelectContent>
        </Select>
      }
    >
      {/* Summary Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gross Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? '...' : `${(revenueData?.gross || 0).toLocaleString()} RWF`}
            </div>
            <p className="text-xs text-muted-foreground">{revenueData?.orderCount || 0} orders</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tax (VAT 18%)</CardTitle>
            <Percent className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? '...' : `${(revenueData?.tax || 0).toLocaleString()} RWF`}
            </div>
            <p className="text-xs text-muted-foreground">Deducted from revenue</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? '...' : `${(revenueData?.net || 0).toLocaleString()} RWF`}
            </div>
            <p className="text-xs text-muted-foreground">After tax</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? '...' : `${(expenseData?.total || 0).toLocaleString()} RWF`}
            </div>
            <p className="text-xs text-muted-foreground">{expenseData?.items?.length || 0} expenses</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {isLoading ? '...' : `${netProfit.toLocaleString()} RWF`}
            </div>
            <p className="text-xs text-muted-foreground">
              {netProfit >= 0 ? 'Positive balance' : 'Loss'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for detailed view */}
      <Tabs defaultValue="overview" className="mt-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="expenses">Recent Expenses</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle>Financial Summary</CardTitle>
              <CardDescription>
                {format(dateRange.start, 'MMM dd, yyyy')} - {format(dateRange.end, 'MMM dd, yyyy')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">Gross Revenue</span>
                  <span className="font-semibold">{(revenueData?.gross || 0).toLocaleString()} RWF</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">Less: VAT (18%)</span>
                  <span className="font-semibold text-orange-600">-{(revenueData?.tax || 0).toLocaleString()} RWF</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">Net Revenue</span>
                  <span className="font-semibold">{(revenueData?.net || 0).toLocaleString()} RWF</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">Less: Expenses</span>
                  <span className="font-semibold text-red-600">-{(expenseData?.total || 0).toLocaleString()} RWF</span>
                </div>
                <div className="flex justify-between items-center py-2 text-lg">
                  <span className="font-semibold">Net Profit</span>
                  <span className={`font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {netProfit.toLocaleString()} RWF
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expenses">
          <Card>
            <CardHeader>
              <CardTitle>Recent Expenses</CardTitle>
              <CardDescription>Expense records for the selected period</CardDescription>
            </CardHeader>
            <CardContent>
              {expenseData?.items && expenseData.items.length > 0 ? (
                <div className="space-y-4">
                  {expenseData.items.map((expense: any) => (
                    <div key={expense.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">{expense.description}</p>
                        <p className="text-sm text-muted-foreground">
                          {expense.category} • {format(new Date(expense.expense_date), 'MMM dd, yyyy')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{Number(expense.amount).toLocaleString()} RWF</p>
                        <Badge className={getStatusColor(expense.status)}>{expense.status}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Receipt className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No expenses recorded for this period</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </TenantPageWrapper>
  );
}
