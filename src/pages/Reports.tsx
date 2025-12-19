import { Layout } from '@/components/Layout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Download, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useState } from 'react';
import { format } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';

export default function Reports() {
  const [dateRange, setDateRange] = useState({
    start: format(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd')
  });

  const { data: salesReport } = useQuery({
    queryKey: ['sales-report', dateRange],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          shop:shops!orders_shop_id_origin_fkey(name),
          seller:profiles!orders_seller_id_fkey(name)
        `)
        .gte('created_at', new Date(dateRange.start).toISOString())
        .lte('created_at', new Date(dateRange.end).toISOString())
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const { data: inventoryReport } = useQuery({
    queryKey: ['inventory-report'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shop_inventory')
        .select(`
          *,
          product:products(name, category, is_active),
          shop:shops(name)
        `)
        .order('stock', { ascending: true });
      
      if (error) throw error;
      
      // Filter out items where product is null or inactive
      return (data || []).filter(item => item.product && item.product.is_active !== false);
    },
  });

  const { data: expenseReport } = useQuery({
    queryKey: ['expense-report', dateRange],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .gte('expense_date', dateRange.start)
        .lte('expense_date', dateRange.end)
        .order('expense_date', { ascending: false });
      
      if (error) throw error;

      // Fetch related data separately
      const shopIds = [...new Set(data.map(e => e.shop_id).filter(Boolean))];
      const userIds = [...new Set(data.map(e => e.recorded_by))];

      const [shopsRes, usersRes] = await Promise.all([
        shopIds.length > 0 ? supabase.from('shops').select('id, name').in('id', shopIds) : { data: [] },
        userIds.length > 0 ? supabase.from('profiles').select('id, name').in('id', userIds) : { data: [] }
      ]);

      const shopsMap = new Map((shopsRes.data || []).map(s => [s.id, s.name] as [string, string]));
      const usersMap = new Map((usersRes.data || []).map(u => [u.id, u.name] as [string, string]));

      return data.map(expense => ({
        ...expense,
        shop: { name: shopsMap.get(expense.shop_id!) || 'N/A' },
        recorded: { name: usersMap.get(expense.recorded_by) || 'N/A' }
      }));
    },
  });

  const exportToCSV = (data: any[], filename: string) => {
    if (!data || data.length === 0) return;
    
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(row => Object.values(row).join(',')).join('\n');
    const csv = `${headers}\n${rows}`;
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  const calculateTotals = (orders: any[]) => {
    const total = orders?.reduce((sum, order) => sum + Number(order.total_amount), 0) || 0;
    const count = orders?.length || 0;
    const avgOrder = count > 0 ? total / count : 0;
    return { total, count, avgOrder };
  };

  const salesTotals = calculateTotals(salesReport || []);

  return (
    <ProtectedRoute requiredRoles={['admin', 'super_admin', 'accountant', 'branch_manager']}>
      <Layout>
        <div className="p-8">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
                <FileText className="h-8 w-8" />
                Advanced Reports
              </h1>
              <p className="text-muted-foreground mt-1">
                Detailed analytics and exportable reports
              </p>
            </div>
          </div>

          {/* Date Range Filter */}
          <Card className="mb-6 shadow-[var(--shadow-soft)]">
            <CardContent className="pt-6">
              <div className="flex items-end gap-4">
                <div className="flex-1">
                  <Label htmlFor="start-date">Start Date</Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                  />
                </div>
                <div className="flex-1">
                  <Label htmlFor="end-date">End Date</Label>
                  <Input
                    id="end-date"
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="sales" className="space-y-6">
            <TabsList>
              <TabsTrigger value="sales">Sales Report</TabsTrigger>
              <TabsTrigger value="inventory">Inventory Report</TabsTrigger>
              <TabsTrigger value="expenses">Expense Report</TabsTrigger>
            </TabsList>

            {/* Sales Report */}
            <TabsContent value="sales" className="space-y-4">
              <Card className="shadow-[var(--shadow-soft)]">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Sales Summary</CardTitle>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => exportToCSV(salesReport || [], 'sales-report')}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-3 mb-6">
                    <div className="p-4 rounded-lg bg-primary/10">
                      <p className="text-sm text-muted-foreground">Total Sales</p>
                      <p className="text-2xl font-bold">{salesTotals.total.toLocaleString()} RWF</p>
                    </div>
                    <div className="p-4 rounded-lg bg-success/10">
                      <p className="text-sm text-muted-foreground">Total Orders</p>
                      <p className="text-2xl font-bold">{salesTotals.count}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-info/10">
                      <p className="text-sm text-muted-foreground">Average Order</p>
                      <p className="text-2xl font-bold">{salesTotals.avgOrder.toFixed(0)} RWF</p>
                    </div>
                  </div>

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order Code</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Shop</TableHead>
                        <TableHead>Seller</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {salesReport?.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-medium">{order.order_code}</TableCell>
                          <TableCell>{format(new Date(order.created_at), 'MMM dd, yyyy')}</TableCell>
                          <TableCell>{order.shop?.name || 'N/A'}</TableCell>
                          <TableCell>{order.seller?.name || 'N/A'}</TableCell>
                          <TableCell className="capitalize">{order.status}</TableCell>
                          <TableCell className="text-right">{Number(order.total_amount).toLocaleString()} RWF</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Inventory Report */}
            <TabsContent value="inventory" className="space-y-4">
              <Card className="shadow-[var(--shadow-soft)]">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Current Inventory Status</CardTitle>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => exportToCSV(inventoryReport || [], 'inventory-report')}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Shop</TableHead>
                        <TableHead className="text-right">Stock</TableHead>
                        <TableHead className="text-right">Daily Quota</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {inventoryReport?.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.product?.name || 'N/A'}</TableCell>
                          <TableCell>{item.product?.category || 'N/A'}</TableCell>
                          <TableCell>{item.shop?.name || 'N/A'}</TableCell>
                          <TableCell className="text-right">{item.stock}</TableCell>
                          <TableCell className="text-right">{item.quota_per_day}</TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              item.stock < 10 ? 'bg-destructive/10 text-destructive' :
                              item.stock < 50 ? 'bg-warning/10 text-warning' :
                              'bg-success/10 text-success'
                            }`}>
                              {item.stock < 10 ? 'Critical' : item.stock < 50 ? 'Low' : 'Good'}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Expense Report */}
            <TabsContent value="expenses" className="space-y-4">
              <Card className="shadow-[var(--shadow-soft)]">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Expense Summary</CardTitle>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => exportToCSV(expenseReport || [], 'expense-report')}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="p-4 rounded-lg bg-destructive/10 mb-6">
                    <p className="text-sm text-muted-foreground">Total Expenses</p>
                    <p className="text-2xl font-bold">
                      {expenseReport?.reduce((sum, exp) => sum + Number(exp.amount), 0).toLocaleString() || 0} RWF
                    </p>
                  </div>

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Shop</TableHead>
                        <TableHead>Recorded By</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {expenseReport?.map((expense) => (
                        <TableRow key={expense.id}>
                          <TableCell>{format(new Date(expense.expense_date), 'MMM dd, yyyy')}</TableCell>
                          <TableCell className="capitalize">{expense.category}</TableCell>
                          <TableCell>{expense.description}</TableCell>
                          <TableCell>{expense.shop?.name || 'N/A'}</TableCell>
                          <TableCell>{expense.recorded?.name || 'N/A'}</TableCell>
                          <TableCell className="capitalize">{expense.status}</TableCell>
                          <TableCell className="text-right">{Number(expense.amount).toLocaleString()} RWF</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
