import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { TenantPageWrapper } from '@/components/tenant/TenantPageWrapper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useStoreContext } from '@/contexts/StoreContext';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { Download, Loader2, FileText } from 'lucide-react';
import { formatCurrency, DEFAULT_SYSTEM_CURRENCY } from '@/utils/currency';
import { toast } from 'sonner';

interface ProductAuditRecord {
  product_id: string;
  product_name: string;
  category?: string;
  opening_stock: number;
  added_stock: number;
  closing_stock: number;
  sold_quantity: number;
  unit_price: number;
  total_revenue: number;
  shop_name: string;
  seller_name: string;
  date: string;
}

export default function TenantAuditReports() {
  const { store } = useStoreContext();
  const currency = store?.currency || DEFAULT_SYSTEM_CURRENCY;
  const [selectedShop, setSelectedShop] = useState<string>('all');
  const [selectedSeller, setSelectedSeller] = useState<string>('all');
  const [dateRange, setDateRange] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [isExporting, setIsExporting] = useState(false);

  // Fetch shops
  const { data: shops = [] } = useQuery({
    queryKey: ['tenant-audit-shops', store?.id],
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

  // Fetch sellers
  const { data: sellers = [] } = useQuery({
    queryKey: ['tenant-audit-sellers', store?.id, selectedShop],
    queryFn: async () => {
      if (!store?.id) return [];
      let query = supabase
        .from('user_roles')
        .select('user_id, users!inner(id, name, email)')
        .eq('business_id', store.id)
        .eq('role', 'seller');

      if (selectedShop !== 'all') {
        query = query.eq('shop_id', selectedShop);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data?.map((ur: any) => ur.users).filter(Boolean) || [];
    },
    enabled: !!store?.id,
  });

  // Fetch audit data
  const { data: auditData = [], isLoading } = useQuery({
    queryKey: ['audit-reports', store?.id, selectedShop, selectedSeller, dateRange, selectedDate],
    queryFn: async () => {
      if (!store?.id) return [];

      let dateStart, dateEnd;
      const queryDate = new Date(selectedDate);

      if (dateRange === 'daily') {
        dateStart = startOfDay(queryDate).toISOString();
        dateEnd = endOfDay(queryDate).toISOString();
      } else if (dateRange === 'weekly') {
        dateStart = startOfWeek(queryDate).toISOString();
        dateEnd = endOfWeek(queryDate).toISOString();
      } else {
        dateStart = startOfMonth(queryDate).toISOString();
        dateEnd = endOfMonth(queryDate).toISOString();
      }

      let query = supabase
        .from('pos_session_inventory_snapshots')
        .select(
          `
          *,
          session:pos_sessions (
            id,
            opened_at,
            closed_at,
            user:profiles(id, name),
            shop:shops(id, name)
          )
        `
        )
        .gte('created_at', dateStart)
        .lte('created_at', dateEnd);

      if (selectedShop !== 'all') {
        query = query.eq('session.shop_id', selectedShop);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Process and aggregate data
      const processed: ProductAuditRecord[] = [];
      data?.forEach((snapshot: any) => {
        if (selectedSeller !== 'all' && snapshot.session?.user?.id !== selectedSeller) return;

        processed.push({
          product_id: snapshot.product_id,
          product_name: snapshot.product_name,
          category: snapshot.category,
          opening_stock: snapshot.opening_stock || 0,
          added_stock: snapshot.added_stock || 0,
          closing_stock: snapshot.quantity || 0,
          sold_quantity: (snapshot.opening_stock || 0) + (snapshot.added_stock || 0) - (snapshot.quantity || 0),
          unit_price: snapshot.unit_price || 0,
          total_revenue: ((snapshot.opening_stock || 0) + (snapshot.added_stock || 0) - (snapshot.quantity || 0)) * (snapshot.unit_price || 0),
          shop_name: snapshot.session?.shop?.name || 'Unknown',
          seller_name: snapshot.session?.user?.name || 'Unknown',
          date: format(new Date(snapshot.created_at), 'PPP p'),
        });
      });

      return processed;
    },
    enabled: !!store?.id,
  });

  const handleExportCSV = () => {
    if (auditData.length === 0) {
      toast.error('No data to export');
      return;
    }

    setIsExporting(true);
    try {
      const headers = [
        'Date',
        'Shop',
        'Seller',
        'Product',
        'Category',
        'Opening Stock',
        'Added Stock',
        'Closing Stock',
        'Sold Quantity',
        'Unit Price',
        'Total Revenue',
      ];

      const rows = auditData.map(record => [
        record.date,
        record.shop_name,
        record.seller_name,
        record.product_name,
        record.category || 'N/A',
        record.opening_stock,
        record.added_stock,
        record.closing_stock,
        record.sold_quantity,
        formatCurrency(record.unit_price, currency),
        formatCurrency(record.total_revenue, currency),
      ]);

      const csvContent = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-report-${format(new Date(), 'yyyyMMdd_HHmm')}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Report exported successfully');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export report');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <TenantPageWrapper
      title="Audit Reports"
      description="Detailed inventory and sales audit trails by shop, seller, and period"
    >
      <div className="space-y-6">
        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Report Filters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-xs block mb-2">Shop</label>
                <Select value={selectedShop} onValueChange={setSelectedShop}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Shops" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Shops</SelectItem>
                    {shops.map(shop => (
                      <SelectItem key={shop.id} value={shop.id}>
                        {shop.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs block mb-2">Seller</label>
                <Select value={selectedSeller} onValueChange={setSelectedSeller}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Sellers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sellers</SelectItem>
                    {sellers.map((seller: any) => (
                      <SelectItem key={seller.id} value={seller.id}>
                        {seller.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs block mb-2">Period</label>
                <Select value={dateRange} onValueChange={(v: any) => setDateRange(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Daily" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs block mb-2">Date</label>
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={handleExportCSV} disabled={isExporting}>
                {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                Export to CSV
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Data Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <FileText className="h-4 w-4" />
              Audit Records ({auditData.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : auditData.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No audit records found for the selected filters.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Date</TableHead>
                      <TableHead className="text-xs">Shop</TableHead>
                      <TableHead className="text-xs">Seller</TableHead>
                      <TableHead className="text-xs">Product</TableHead>
                      <TableHead className="text-xs">Category</TableHead>
                      <TableHead className="text-xs text-right">Opening</TableHead>
                      <TableHead className="text-xs text-right">Added</TableHead>
                      <TableHead className="text-xs text-right">Closing</TableHead>
                      <TableHead className="text-xs text-right">Sold</TableHead>
                      <TableHead className="text-xs text-right">Unit Price</TableHead>
                      <TableHead className="text-xs text-right">Total Revenue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditData.map((record, idx) => (
                      <TableRow key={`${record.product_id}-${record.date}-${idx}`} className="text-xs">
                        <TableCell>{record.date}</TableCell>
                        <TableCell>{record.shop_name}</TableCell>
                        <TableCell>{record.seller_name}</TableCell>
                        <TableCell className="font-medium">{record.product_name}</TableCell>
                        <TableCell>{record.category || '-'}</TableCell>
                        <TableCell className="text-right">{record.opening_stock}</TableCell>
                        <TableCell className="text-right">{record.added_stock}</TableCell>
                        <TableCell className="text-right font-medium">{record.closing_stock}</TableCell>
                        <TableCell className="text-right text-red-600">{record.sold_quantity}</TableCell>
                        <TableCell className="text-right">{formatCurrency(record.unit_price, currency)}</TableCell>
                        <TableCell className="text-right font-semibold text-green-600">
                          {formatCurrency(record.total_revenue, currency)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Summary Stats */}
        {auditData.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs">Total Products</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{new Set(auditData.map(r => r.product_id)).size}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs">Total Units Sold</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{auditData.reduce((sum, r) => sum + r.sold_quantity, 0)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs">Total Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{formatCurrency(auditData.reduce((sum, r) => sum + r.total_revenue, 0), currency)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs">Avg Revenue per Product</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-semibold">{formatCurrency(auditData.reduce((sum, r) => sum + r.total_revenue, 0) / new Set(auditData.map(r => r.product_id)).size, currency)}</div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </TenantPageWrapper>
  );
}
