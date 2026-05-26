import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { TenantPageWrapper } from '@/components/tenant/TenantPageWrapper';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DollarSign, TrendingUp, TrendingDown, Wallet, Receipt, Percent, Activity, Wifi, WifiOff, RefreshCw, AlertCircle, HandCoins } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useStoreContext } from '@/contexts/StoreContext';
import { useAuth } from '@/hooks/useAuth';
import { format, startOfMonth, endOfMonth, subMonths, startOfWeek, startOfDay, isAfter } from 'date-fns';
import { formatCurrency, DEFAULT_SYSTEM_CURRENCY } from '@/utils/currency';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const TAX_RATE = 0.18; // 18% VAT

import { ExpenseDialog } from '@/components/finance/ExpenseDialog';
import { ExpensesManager } from '@/components/finance/ExpensesManager';
import { FinancialAccountsManager } from '@/components/finance/FinancialAccountsManager';
import { ExpenseBudgetsManager } from '@/components/finance/ExpenseBudgetsManager';
import { TenantPaymentMethods } from '@/components/finance/payment-methods/TenantPaymentMethods';
import { ViewInvoiceDialog } from '@/components/invoices/ViewInvoiceDialog';
import { InvoiceData } from '@/components/invoices/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Eye } from 'lucide-react';

import { MoneyCollectionsManager } from '@/components/finance/MoneyCollectionsManager';

export default function TenantFinance() {
  const { store } = useStoreContext();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('overview');
  
  // Update active tab based on URL path
  useEffect(() => {
    if (location.pathname.endsWith('/collections') || location.pathname.includes('/collections')) {
      setActiveTab('collections');
    } else if (location.pathname.endsWith('/invoices') || location.pathname.includes('/invoices')) {
      setActiveTab('invoices');
    } else if (location.pathname.endsWith('/expenses') || location.pathname.includes('/expenses')) {
      setActiveTab('expenses');
    }
  }, [location.pathname]);

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
      .channel('finance-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        if (isLive) refreshData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [store?.id, shopIds, isLive]);

  // Fetch Sales Pulse
  const { data: pulseData } = useQuery({
    queryKey: ['sales-pulse', store?.id, shopIds],
    queryFn: async () => {
      if (!store?.id || shopIds.length === 0) return { shops: [] };
      const { data, error } = await supabase.rpc('get_sales_pulse', {
        p_business_id: store.id
      });
      if (error) throw error;
      return { shops: data || [] };
    },
    enabled: !!store?.id && shopIds.length > 0,
  });

  // Fetch revenue summary
  const { data: revenueData, isLoading } = useQuery({
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
        .select(`
          *,
          order_items(*),
          payments(amount, payment_method)
        `)
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
        .eq('business_id', store.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data;
    },
    enabled: !!store?.id,
  });

  const netProfit = (revenueData?.net || 0) - (expenseData?.approved || 0);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'delivered': return 'bg-green-100 text-green-700';
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      case 'confirmed': return 'bg-blue-100 text-blue-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

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
      paymentMethod: order.payment_method,
      payments: order.payments?.map((p: any) => ({
        method: p.payment_method,
        amount: p.amount
      }))
    };
    setSelectedInvoice(invoice);
    setViewInvoiceOpen(true);
  };

  return (
    <TenantPageWrapper
      title="Finance"
      description="Track revenue, expenses, and financial performance"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2">
          <Badge variant={isLive ? "default" : "outline"} className={isLive ? "bg-green-500" : ""}>
            <div className={isLive ? "w-2 h-2 rounded-full bg-white animate-pulse mr-2" : "w-2 h-2 rounded-full bg-gray-400 mr-2"} />
            {isLive ? 'Live' : 'Manual'}
          </Badge>
          <Button variant="ghost" size="icon" onClick={refreshData} disabled={isLoading}>
            <RefreshCw className={isLoading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
          </Button>
          <span className="text-xs text-muted-foreground">Updated: {format(lastUpdated, 'h:mm:ss a')}</span>
        </div>
        <div className="flex items-center gap-2">
           <ExpenseDialog onExpenseCreated={refreshData} />
           <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select Period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="this_month">This Month</SelectItem>
              <SelectItem value="last_month">Last Month</SelectItem>
              <SelectItem value="last_3_months">Last 3 Months</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 lg:grid-cols-8 h-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          {store?.enableMoneyCollection && <TabsTrigger value="collections">Collections</TabsTrigger>}
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
              {pulseData?.shops?.map((shop: any) => (
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

        {store?.enableMoneyCollection && (
          <TabsContent value="collections">
            <MoneyCollectionsManager />
          </TabsContent>
        )}

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
                      <TableCell>{format(new Date(log.created_at), 'MMM dd, HH:mm')}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{log.action}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[300px] truncate" title={JSON.stringify(log.details)}>
                          {typeof log.details === 'string' ? log.details : JSON.stringify(log.details)}
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

      {selectedInvoice && (
        <ViewInvoiceDialog
          open={viewInvoiceOpen}
          onOpenChange={setViewInvoiceOpen}
          invoice={selectedInvoice as any}
        />
      )}
    </TenantPageWrapper>
  );
}
