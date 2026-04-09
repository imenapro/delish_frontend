import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { TenantPageWrapper } from '@/components/tenant/TenantPageWrapper';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DollarSign, TrendingUp, TrendingDown, Wallet, Receipt, Percent, Activity, Wifi, WifiOff, RefreshCw, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useStoreContext } from '@/contexts/StoreContext';
import { format, startOfMonth, endOfMonth, subMonths, startOfWeek, startOfDay, isAfter } from 'date-fns';
import { formatCurrency } from '@/utils/currency';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const TAX_RATE = 0.18; // 18% VAT

interface Expense {
  id: string;
  description: string;
  category: string;
  expense_date: string;
  amount: number;
  status: string;
}

import { ExpenseDialog } from '@/components/finance/ExpenseDialog';
import { ExpensesManager } from '@/components/finance/ExpensesManager';
import { FinancialAccountsManager } from '@/components/finance/FinancialAccountsManager';
import { ExpenseBudgetsManager } from '@/components/finance/ExpenseBudgetsManager';
import { TenantPaymentMethods } from '@/components/finance/payment-methods/TenantPaymentMethods';
import { ViewInvoiceDialog } from '@/components/invoices/ViewInvoiceDialog';
import { InvoiceData } from '@/components/invoices/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Eye } from 'lucide-react';

export default function TenantFinance() {
  const { store } = useStoreContext();
  const queryClient = useQueryClient();
  const [period, setPeriod] = useState('this_month');
  const [viewInvoiceOpen, setViewInvoiceOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceData | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const currency = store?.currency || DEFAULT_SYSTEM_CURRENCY;

  // Calculate date range based on period
  const getDateRange = () => {
    const now = new Date();
    switch (period) {
      case 'this_month':
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'last_month': {
        const lastMonth = subMonths(now, 1);
        return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
      }
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
        .eq('business_id', store.id)
        .eq('is_active', true);
      if (error) throw error;
      return data || [];
    },
    enabled: !!store?.id,
  });

  const shopIds = shops.map(s => s.id);

  const refreshData = () => {
    queryClient.invalidateQueries({ queryKey: ['sales-pulse'] });
    queryClient.invalidateQueries({ queryKey: ['tenant-finance-revenue'] });
    queryClient.invalidateQueries({ queryKey: ['tenant-invoices'] });
    queryClient.invalidateQueries({ queryKey: ['tenant-finance-expenses'] });
    setLastUpdated(new Date());
    toast.info('Dashboard updated');
  };

  // Real-time Subscription
  useEffect(() => {
    if (!store?.id || shopIds.length === 0) return;

    const channel = supabase
      .channel('finance-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
        },
        (payload) => {
          // Check if the order belongs to one of our shops
          const order = payload.new as any;
          if (order && shopIds.includes(order.shop_id_origin)) {
            // Invalidate relevant queries
            queryClient.invalidateQueries({ queryKey: ['sales-pulse'] });
            queryClient.invalidateQueries({ queryKey: ['tenant-finance-revenue'] });
            queryClient.invalidateQueries({ queryKey: ['tenant-invoices'] });
            setLastUpdated(new Date());
            
            if (payload.eventType === 'INSERT') {
              toast.success(`New order received: ${formatCurrency(order.total_amount, currency)}`);
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'expenses',
        },
        (payload) => {
           const expense = payload.new as any;
           if (expense && shopIds.includes(expense.shop_id)) {
             queryClient.invalidateQueries({ queryKey: ['tenant-finance-expenses'] });
             queryClient.invalidateQueries({ queryKey: ['tenant-finance-revenue'] }); // Net profit changes
             setLastUpdated(new Date());
           }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsLive(true);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setIsLive(false);
          toast.error('Real-time connection lost. Retrying...');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [store?.id, JSON.stringify(shopIds), queryClient, currency]);

  // Client-side Pulse Calculation (replacing broken RPC)
   const { data: pulseData, isLoading: pulseLoading } = useQuery({
     queryKey: ['sales-pulse', store?.id, shopIds],
     queryFn: async () => {
       if (!store?.id || shopIds.length === 0) return { 
         global: { daily: 0, weekly: 0, monthly: 0 }, 
         shops: [] 
       };
       
       const now = new Date();
       const todayStart = startOfDay(now);
       const weekStart = startOfWeek(now, { weekStartsOn: 1 });
       const monthStart = startOfMonth(now);
       
       // We need data from the earliest of these
       const earliestDate = new Date(Math.min(weekStart.getTime(), monthStart.getTime()));
 
       // Function to fetch all orders recursively to bypass 1000 row limit
       const fetchAllOrders = async () => {
         let allOrders: any[] = [];
         let page = 0;
         const pageSize = 1000;
         let hasMore = true;
         
         console.log('Fetching orders for shops:', shopIds);
         console.log('Earliest Date:', earliestDate.toISOString());

         while (hasMore) {
           let query = supabase
             .from('orders')
             .select('total_amount, created_at, shop_id_origin')
             .in('status', ['confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered'])
             .range(page * pageSize, (page + 1) * pageSize - 1);

           // Only apply shop filter if we have shops (redundant with RLS but good for optimization)
           if (shopIds.length > 0) {
              query = query.in('shop_id_origin', shopIds);
           }
           
           // TEMPORARY: Commenting out date filter to debug "Zero Data" issue
           // .gte('created_at', earliestDate.toISOString())

           const { data, error } = await query;
             
           if (error) {
             console.error('Order fetch error:', error);
             throw error;
           }
           
           console.log(`Page ${page} fetched: ${data?.length} orders`);

           if (data && data.length > 0) {
             allOrders = [...allOrders, ...data];
             if (data.length < pageSize) hasMore = false;
             page++;
           } else {
             hasMore = false;
           }
         }
         console.log('Total orders fetched:', allOrders.length);
         return allOrders;
       };

       const orders = await fetchAllOrders();
       
       // Global stats
      const global = {
        daily: orders.filter(o => new Date(o.created_at) >= todayStart).reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0),
        weekly: orders.filter(o => new Date(o.created_at) >= weekStart).reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0),
        monthly: orders.filter(o => new Date(o.created_at) >= monthStart).reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0),
      };

       // Shop stats
       const shopStats = shops.map(shop => {
         const shopOrders = orders.filter(o => o.shop_id_origin === shop.id);
         return {
           shop_id: shop.id,
           shop_name: shop.name,
          daily: shopOrders.filter(o => new Date(o.created_at) >= todayStart).reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0),
          weekly: shopOrders.filter(o => new Date(o.created_at) >= weekStart).reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0),
          monthly: shopOrders.filter(o => new Date(o.created_at) >= monthStart).reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0),
        };
      });
 
       return { global, shops: shopStats };
     },
     enabled: !!store?.id && shopIds.length > 0 && shops.length > 0,
     // Refetch every minute for "pulse" feel
     refetchInterval: 60000 
   });

  const { data: revenueData, isLoading: revenueLoading } = useQuery({
    queryKey: ['tenant-finance-revenue', store?.id, period, shopIds],
    queryFn: async () => {
      if (!store?.id || shopIds.length === 0) return { gross: 0, tax: 0, net: 0, orderCount: 0 };

      const fetchAllOrders = async () => {
        let allOrders: any[] = [];
        let page = 0;
        const pageSize = 1000;
        let hasMore = true;

        while (hasMore) {
          const { data, error } = await supabase
            .from('orders')
            .select('total_amount, status')
            .in('shop_id_origin', shopIds)
            .gte('created_at', dateRange.start.toISOString())
            .lte('created_at', dateRange.end.toISOString())
            .in('status', ['confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered'])
            .range(page * pageSize, (page + 1) * pageSize - 1);

          if (error) throw error;

          if (data && data.length > 0) {
            allOrders = [...allOrders, ...data];
            if (data.length < pageSize) hasMore = false;
            page++;
          } else {
            hasMore = false;
          }
        }
        return allOrders;
      };

      const orders = await fetchAllOrders();

      const gross = orders.reduce((sum, o) => sum + Number(o.total_amount), 0);
      const tax = gross * TAX_RATE;
      const net = gross - tax;

      return { gross, tax, net, orderCount: orders.length };
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
        .eq('business_id', store.id)
        .is('deleted_at', null)
        .or(`shop_id.in.(${shopIds.join(',')}),shop_id.is.null`)
        .gte('expense_date', dateRange.start.toISOString().split('T')[0])
        .lte('expense_date', dateRange.end.toISOString().split('T')[0])
        .order('expense_date', { ascending: false });

      if (error) throw error;

      const total = (data || []).reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
      const pending = (data || []).filter(e => e.status === 'pending').reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
      const approved = (data || []).filter(e => e.status === 'approved').reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

      return { total, pending, approved, items: data || [] };
    },
    enabled: !!store?.id && shopIds.length > 0,
  });

  // Fetch invoices (orders)
  const { data: invoicesData, isLoading: invoicesLoading } = useQuery({
    queryKey: ['tenant-invoices', store?.id, shopIds],
    queryFn: async () => {
      if (!store?.id || shopIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .in('shop_id_origin', shopIds)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data;
    },
    enabled: !!store?.id && shopIds.length > 0
  });

  // Fetch audit logs
  const { data: auditLogs, isLoading: auditLogsLoading } = useQuery({
    queryKey: ['financial-audit-logs', store?.id],
    queryFn: async () => {
      if (!store?.id) return [];
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .or('action.ilike.%ORDER%,action.ilike.%EXPENSE%')
        .order('created_at', { ascending: false })
        .limit(50);
        
      if (error) {
        console.warn('Audit logs fetch failed:', error);
        return [];
      }
      return data || [];
    },
    enabled: !!store?.id
  });

  // Calculate net profit
  const netProfit = (revenueData?.net || 0) - (expenseData?.approved || 0);

  const handleViewInvoice = (order: any) => {
    const invoice: InvoiceData = {
      invoiceNumber: order.order_number || order.id.slice(0, 8),
      date: order.created_at,
      status: order.status,
      businessName: store?.name || 'Business',
      customerName: order.customer_name || 'Walk-in Customer',
      items: order.order_items?.map((item: any) => ({
        name: item.product_name || 'Item',
        quantity: item.quantity,
        price: item.unit_price || item.price || 0,
        subtotal: (item.quantity || 1) * (item.unit_price || item.price || 0)
      })) || [],
      subtotal: order.total_amount, 
      tax: order.total_amount * TAX_RATE,
      total: order.total_amount,
      currency: currency,
      paymentMethod: order.payment_method
    };
    setSelectedInvoice(invoice);
    setViewInvoiceOpen(true);
  };

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
        <div className="flex items-center gap-2">
          {isLive ? (
            <Badge variant="outline" className="border-green-500 text-green-500 flex gap-1 items-center animate-pulse">
              <Wifi className="h-3 w-3" /> Live
            </Badge>
          ) : (
             <Badge variant="outline" className="border-red-500 text-red-500 flex gap-1 items-center">
              <WifiOff className="h-3 w-3" /> Offline
            </Badge>
          )}
          <Button variant="outline" size="sm" onClick={refreshData} title="Refresh Data">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <span className="text-xs text-muted-foreground hidden md:inline-block">
            Updated: {lastUpdated.toLocaleTimeString()}
          </span>
          <ExpenseDialog />
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
        </div>
      }
    >
      {shops.length === 0 && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No Shops Accessible</AlertTitle>
          <AlertDescription>
            We couldn't find any shops linked to your account. This is likely due to permissions.
            Please run the migration '20260206000003_fix_shops_rls.sql' to fix access.
          </AlertDescription>
        </Alert>
      )}

      {/* Global Sales Pulse - Always Visible */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4">Global Sales Pulse</h2>
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Daily Sales</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {pulseLoading ? '...' : formatCurrency(pulseData?.global?.daily || 0, currency)}
              </div>
              <p className="text-xs text-muted-foreground">Today</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Weekly Sales</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {pulseLoading ? '...' : formatCurrency(pulseData?.global?.weekly || 0, currency)}
              </div>
              <p className="text-xs text-muted-foreground">This Week</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-purple-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Sales</CardTitle>
              <TrendingUp className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {pulseLoading ? '...' : formatCurrency(pulseData?.global?.monthly || 0, currency)}
              </div>
              <p className="text-xs text-muted-foreground">This Month</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Tabs for detailed view */}
      <Tabs defaultValue="overview" className="mt-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
            <TabsTrigger value="accounts">Accounts</TabsTrigger>
            <TabsTrigger value="budgets">Budgets</TabsTrigger>
          <TabsTrigger value="payment-methods">Payment Methods</TabsTrigger>
          <TabsTrigger value="audit-logs">Audit Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Shop Performance */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-4">Shop Performance</h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {pulseData?.shops?.map((shop) => (
                <Card key={shop.shop_id}>
                  <CardHeader>
                    <CardTitle className="text-base">{shop.shop_name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center border-b pb-2">
                        <span className="text-sm text-muted-foreground">Daily</span>
                        <span className="font-bold">{formatCurrency(shop.daily, currency)}</span>
                      </div>
                      <div className="flex justify-between items-center border-b pb-2">
                        <span className="text-sm text-muted-foreground">Weekly</span>
                        <span className="font-bold">{formatCurrency(shop.weekly, currency)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Monthly</span>
                        <span className="font-bold">{formatCurrency(shop.monthly, currency)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-4">Financial Overview (Selected Period)</h2>
            {/* Summary Cards */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Gross Revenue</CardTitle>
                  <DollarSign className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {isLoading ? '...' : formatCurrency(revenueData?.gross || 0, currency)}
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
                    {isLoading ? '...' : formatCurrency(revenueData?.tax || 0, currency)}
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
                    {isLoading ? '...' : formatCurrency(revenueData?.net || 0, currency)}
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
                    {isLoading ? '...' : formatCurrency(expenseData?.total || 0, currency)}
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
                    {isLoading ? '...' : formatCurrency(netProfit, currency)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {netProfit >= 0 ? 'Positive balance' : 'Loss'}
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
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
                  <span className="font-semibold">{formatCurrency(revenueData?.gross || 0, currency)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">Less: VAT (18%)</span>
                  <span className="font-semibold text-orange-600">-{formatCurrency(revenueData?.tax || 0, currency)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">Net Revenue</span>
                  <span className="font-semibold">{formatCurrency(revenueData?.net || 0, currency)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">Less: Expenses (Approved)</span>
                  <span className="font-semibold text-red-600">-{formatCurrency(expenseData?.approved || 0, currency)}</span>
                </div>
                <div className="flex justify-between items-center py-2 text-lg">
                  <span className="font-semibold">Net Profit</span>
                  <span className={`font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(netProfit, currency)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expenses">
          <ExpensesManager
            title="Expenses"
            description="All expense records for the selected period"
            shopIds={shopIds}
            dateRange={dateRange}
          />
        </TabsContent>

        <TabsContent value="accounts" className="space-y-6">
          <FinancialAccountsManager />
        </TabsContent>

        <TabsContent value="budgets" className="space-y-6">
          <ExpenseBudgetsManager />
        </TabsContent>
        <TabsContent value="payment-methods">
          <Card>
            <CardHeader>
              <CardTitle>Payment Methods</CardTitle>
              <CardDescription>Manage your accepted payment methods and payouts</CardDescription>
            </CardHeader>
            <CardContent>
              <TenantPaymentMethods />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoices">
          <Card>
            <CardHeader>
              <CardTitle>Invoices</CardTitle>
              <CardDescription>Recent invoices and orders</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoicesData?.map((order: any) => (
                    <TableRow key={order.id}>
                      <TableCell>{order.order_number || order.id.slice(0, 8)}</TableCell>
                      <TableCell>{format(new Date(order.created_at), 'MMM dd, HH:mm')}</TableCell>
                      <TableCell>{order.customer_name || 'Walk-in'}</TableCell>
                      <TableCell>{formatCurrency(order.total_amount, currency)}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(order.status)}>{order.status}</Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => handleViewInvoice(order)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!invoicesData || invoicesData.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No invoices found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit-logs">
           <Card>
            <CardHeader>
              <CardTitle>Audit Logs</CardTitle>
              <CardDescription>Financial transaction history and audit trail</CardDescription>
            </CardHeader>
            <CardContent>
               <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>User</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLogs?.map((log: any) => (
                    <TableRow key={log.id}>
                      <TableCell>{format(new Date(log.created_at), 'MMM dd, HH:mm:ss')}</TableCell>
                      <TableCell><Badge variant="outline">{log.action}</Badge></TableCell>
                      <TableCell>
                        <div className="max-w-[400px] truncate" title={log.details}>
                           {log.details}
                        </div>
                      </TableCell>
                      <TableCell>{log.performed_by?.slice(0,8) || 'System'}</TableCell>
                    </TableRow>
                  ))}
                  {(!auditLogs || auditLogs.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        No audit logs found (Feature requires migration)
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </TenantPageWrapper>
  );
}
