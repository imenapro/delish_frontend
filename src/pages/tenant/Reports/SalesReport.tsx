import { useState, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStoreContext } from '@/contexts/StoreContext';
import { useAuth } from '@/hooks/useAuth';
import { TenantPageWrapper } from '@/components/tenant/TenantPageWrapper';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { 
  Search, 
  Filter, 
  Download, 
  Printer, 
  ArrowLeft, 
  ChevronLeft, 
  ChevronRight,
  ShoppingCart,
  DollarSign,
  Calendar,
  User,
  MapPin,
  CreditCard,
  Banknote,
  Smartphone,
  Info
} from 'lucide-react';
import { format, startOfDay, endOfDay } from 'date-fns';
import { DateRange } from "react-day-picker";
import { CalendarDateRangePicker } from '@/components/ui/date-range-picker';
import { useReactToPrint } from 'react-to-print';
import { useNavigate, useParams } from 'react-router-dom';
import { formatCurrency } from '@/utils/currency';

const ITEMS_PER_PAGE = 20;

export default function SalesReport() {
  const { store } = useStoreContext();
  const { roles } = useAuth();
  const { storeSlug } = useParams();
  const navigate = useNavigate();
  const printRef = useRef<HTMLDivElement>(null);

  const [dateFilter, setDateFilter] = useState<string>('30days');
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000),
    to: new Date()
  });
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [shopFilter, setShopFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  
  const businessId = store?.id;
  const isManagerial = roles.some(r => ['super_admin', 'store_owner', 'admin', 'accountant'].includes(r.role.toLowerCase()));

  // Fetch all shops for filter
  const { data: allShops = [] } = useQuery({
    queryKey: ['all-shops', businessId],
    queryFn: async () => {
      if (!businessId) return [];
      const { data, error } = await supabase
        .from('shops')
        .select('id, name')
        .eq('business_id', businessId)
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!businessId,
  });

  // Fetch sales (orders)
  const { data: sales = [], isLoading } = useQuery({
    queryKey: ['sales-report-data', businessId, dateFilter, dateRange, paymentFilter, shopFilter, searchTerm],
    queryFn: async () => {
      if (!businessId || !isManagerial) return [];

      let query = supabase
        .from('orders')
        .select(`
          *,
          shop:shops!orders_shop_id_origin_fkey (name),
          seller:profiles!orders_seller_id_fkey (name),
          order_items (
            product:products (name),
            quantity,
            unit_price,
            subtotal
          )
        `)
        .eq('shop_id_origin', shopFilter !== 'all' ? shopFilter : allShops[0]?.id) // Placeholder, better to handle business_id if exists
        .eq('source', 'pos')
        .order('created_at', { ascending: false });
        
      // If business_id is available on orders table, use it
      // Based on migrations, it might not be there directly but shop_id_origin links to shop which links to business
      
      // Let's refine the query to use business_id if possible, or filter by shopIds
      const shopIds = allShops.map(s => s.id);
      if (shopFilter !== 'all') {
        query = supabase.from('orders').select('*, shop:shops!orders_shop_id_origin_fkey(name), seller:profiles!orders_seller_id_fkey(name)')
          .eq('shop_id_origin', shopFilter)
          .eq('source', 'pos')
          .order('created_at', { ascending: false });
      } else if (shopIds.length > 0) {
        query = supabase.from('orders').select('*, shop:shops!orders_shop_id_origin_fkey(name), seller:profiles!orders_seller_id_fkey(name)')
          .in('shop_id_origin', shopIds)
          .eq('source', 'pos')
          .order('created_at', { ascending: false });
      }

      // Apply payment method filter
      if (paymentFilter !== 'all') {
        query = query.eq('payment_method', paymentFilter);
      }

      // Apply date filter
      if (dateFilter === 'custom' && dateRange?.from) {
        query = query.gte('created_at', startOfDay(dateRange.from).toISOString());
        if (dateRange.to) {
          query = query.lte('created_at', endOfDay(dateRange.to).toISOString());
        }
      } else if (dateFilter !== 'all') {
        const now = new Date();
        let startDate: Date;
        
        switch (dateFilter) {
          case '7days':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case '30days':
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
          case '90days':
            startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
            break;
          default:
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        }
        
        query = query.gte('created_at', startDate.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;
      
      let filteredData = data;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filteredData = data.filter(s => 
          s.order_code?.toLowerCase().includes(term) ||
          s.customer_phone?.toLowerCase().includes(term)
        );
      }

      return filteredData;
    },
    enabled: !!businessId && isManagerial && allShops.length > 0,
  });

  const stats = useMemo(() => {
    return {
      totalRevenue: sales.reduce((sum, s) => sum + (Number(s.total_amount) || 0), 0),
      orderCount: sales.length,
      avgOrderValue: sales.length > 0 ? sales.reduce((sum, s) => sum + (Number(s.total_amount) || 0), 0) / sales.length : 0,
      cashRevenue: sales.filter(s => s.payment_method === 'cash').reduce((sum, s) => sum + (Number(s.total_amount) || 0), 0),
      momoRevenue: sales.filter(s => s.payment_method === 'momo' || s.payment_method === 'mobile_money').reduce((sum, s) => sum + (Number(s.total_amount) || 0), 0),
      cardRevenue: sales.filter(s => s.payment_method === 'card' || s.payment_method === 'pos_card').reduce((sum, s) => sum + (Number(s.total_amount) || 0), 0),
    };
  }, [sales]);

  const paginatedSales = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return sales.slice(start, start + ITEMS_PER_PAGE);
  }, [sales, currentPage]);

  const totalPages = Math.ceil(sales.length / ITEMS_PER_PAGE);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Sales_Report_${format(new Date(), 'yyyy-MM-dd')}`,
  });

  const handleExportCSV = () => {
    if (sales.length === 0) return;

    const headers = ['Date', 'Order Code', 'Amount', 'Payment', 'Shop', 'Seller', 'Customer Phone'];
    const csvData = sales.map(s => [
      format(new Date(s.created_at), 'yyyy-MM-dd HH:mm'),
      s.order_code || '-',
      s.total_amount,
      s.payment_method,
      s.shop?.name || 'Unknown',
      s.seller?.name || 'System',
      s.customer_phone || 'Walk-in'
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `sales_report_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getPaymentIcon = (method: string) => {
    switch (method.toLowerCase()) {
      case 'cash': return <Banknote className="h-3 w-3 text-green-600" />;
      case 'momo':
      case 'mobile_money': return <Smartphone className="h-3 w-3 text-yellow-600" />;
      case 'card':
      case 'pos_card': return <CreditCard className="h-3 w-3 text-blue-600" />;
      default: return <Info className="h-3 w-3 text-gray-600" />;
    }
  };

  if (!isManagerial) {
    return (
      <TenantPageWrapper title="Access Denied">
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <h2 className="text-xl font-semibold">You do not have permission to view reports.</h2>
          <Button className="mt-4" onClick={() => navigate(`/${storeSlug}/dashboard`)}>Back to Dashboard</Button>
        </div>
      </TenantPageWrapper>
    );
  }

  return (
    <TenantPageWrapper
      title="POS Sales Report"
      description="Track revenue, orders, and payment methods across all shops"
      actions={
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate(`/${storeSlug}/reports`)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Reports
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint} disabled={sales.length === 0}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={sales.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Summary Stats */}
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Total Revenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.totalRevenue, 'RWF')}</div>
              <p className="text-xs text-muted-foreground">{stats.orderCount} orders</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Banknote className="w-4 h-4 text-green-500" />
                Cash
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold">{formatCurrency(stats.cashRevenue, 'RWF')}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-yellow-500" />
                MoMo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold">{formatCurrency(stats.momoRevenue, 'RWF')}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-blue-500" />
                Card
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold">{formatCurrency(stats.cardRevenue, 'RWF')}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-purple-500" />
                Avg Order
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold">{formatCurrency(stats.avgOrderValue, 'RWF')}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Report Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="flex flex-col space-y-2">
                <Label htmlFor="date-filter">Date Range</Label>
                <Select value={dateFilter} onValueChange={(val) => { setDateFilter(val); setCurrentPage(1); }}>
                  <SelectTrigger id="date-filter">
                    <SelectValue placeholder="Select date range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7days">Last 7 days</SelectItem>
                    <SelectItem value="30days">Last 30 days</SelectItem>
                    <SelectItem value="90days">Last 90 days</SelectItem>
                    <SelectItem value="custom">Pick from date to date</SelectItem>
                    <SelectItem value="all">All time</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col space-y-2">
                <Label htmlFor="shop-filter">Shop</Label>
                <Select value={shopFilter} onValueChange={(val) => { setShopFilter(val); setCurrentPage(1); }}>
                  <SelectTrigger id="shop-filter">
                    <SelectValue placeholder="Select Shop" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Shops</SelectItem>
                    {allShops.map(shop => (
                      <SelectItem key={shop.id} value={shop.id}>{shop.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col space-y-2">
                <Label htmlFor="payment-filter">Payment Method</Label>
                <Select value={paymentFilter} onValueChange={(val) => { setPaymentFilter(val); setCurrentPage(1); }}>
                  <SelectTrigger id="payment-filter">
                    <SelectValue placeholder="All Methods" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Methods</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="momo">Mobile Money</SelectItem>
                    <SelectItem value="card">Bank Card</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col space-y-2">
                <Label htmlFor="search">Search Order Code/Phone</Label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Search..."
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                  />
                </div>
              </div>
            </div>

            {dateFilter === 'custom' && (
              <div className="mt-4 flex flex-col space-y-2 animate-in fade-in slide-in-from-top-2">
                <Label>Select Custom Range</Label>
                <CalendarDateRangePicker 
                  date={dateRange} 
                  onDateChange={(range) => { setDateRange(range); setCurrentPage(1); }} 
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Order History ({sales.length} records)</CardTitle>
          </CardHeader>
          <CardContent>
            <div ref={printRef} className="space-y-4">
              <div className="hidden print:block mb-6">
                <h1 className="text-2xl font-bold">POS Sales Report</h1>
                <p className="text-muted-foreground">Generated on {format(new Date(), 'PPP p')}</p>
                <div className="mt-2 text-sm">
                  <span>Total Revenue: {formatCurrency(stats.totalRevenue, 'RWF')}</span>
                </div>
              </div>

              {isLoading ? (
                <div className="text-center py-12">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
                  <p className="text-muted-foreground">Loading sales data...</p>
                </div>
              ) : sales.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  No records found for the selected criteria
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="p-3 text-left font-semibold">Date & Time</th>
                        <th className="p-3 text-left font-semibold">Order Code</th>
                        <th className="p-3 text-right font-semibold">Amount</th>
                        <th className="p-3 text-left font-semibold">Payment</th>
                        <th className="p-3 text-left font-semibold">Shop</th>
                        <th className="p-3 text-left font-semibold">Seller</th>
                        <th className="p-3 text-left font-semibold">Customer</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedSales.map((order) => (
                        <tr key={order.id} className="border-b hover:bg-muted/30 transition-colors print:break-inside-avoid">
                          <td className="p-3 whitespace-nowrap">
                            {format(new Date(order.created_at), 'MMM dd, HH:mm')}
                          </td>
                          <td className="p-3 font-mono font-medium text-xs">
                            {order.order_code}
                          </td>
                          <td className="p-3 text-right font-mono font-bold">
                            {formatCurrency(Number(order.total_amount), 'RWF')}
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-1.5 capitalize text-xs">
                              {getPaymentIcon(order.payment_method)}
                              {order.payment_method}
                            </div>
                          </td>
                          <td className="p-3 whitespace-nowrap">
                            <div className="flex items-center gap-1.5 text-xs">
                              <MapPin className="h-3 w-3 text-muted-foreground" />
                              {order.shop?.name || 'Unknown'}
                            </div>
                          </td>
                          <td className="p-3 whitespace-nowrap text-xs">
                            <div className="flex items-center gap-1.5">
                              <User className="h-3 w-3 text-muted-foreground" />
                              {order.seller?.name || 'System'}
                            </div>
                          </td>
                          <td className="p-3 whitespace-nowrap text-xs text-muted-foreground">
                            {order.customer_phone || 'Walk-in'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Pagination */}
            {!isLoading && totalPages > 1 && (
              <div className="flex items-center justify-between pt-6 border-t mt-4 print:hidden">
                <div className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages} ({sales.length} total records)
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setCurrentPage(prev => Math.max(1, prev - 1)); window.scrollTo(0, 0); }}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setCurrentPage(prev => Math.min(totalPages, prev + 1)); window.scrollTo(0, 0); }}
                    disabled={currentPage === totalPages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </TenantPageWrapper>
  );
}
