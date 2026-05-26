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
  Info,
  Eye,
  RotateCcw,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { format, startOfDay, endOfDay } from 'date-fns';
import { DateRange } from "react-day-picker";
import { CalendarDateRangePicker } from '@/components/ui/date-range-picker';
import { useReactToPrint } from 'react-to-print';
import { useNavigate, useParams } from 'react-router-dom';
import { formatCurrency } from '@/utils/currency';
import { ViewInvoiceDialog } from '@/components/invoices/ViewInvoiceDialog';

const ITEMS_PER_PAGE = 20;

type SortConfig = {
  key: string;
  direction: 'asc' | 'desc';
};

export default function SalesReport() {
  const { store, getTenantRoute } = useStoreContext();
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
  const [sellerFilter, setSellerFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'created_at', direction: 'desc' });
  
  const businessId = store?.id;
  const isManagerial = roles.some(r => ['super_admin', 'store_owner', 'admin', 'accountant'].includes(r.role.toLowerCase()));

  const handleResetFilters = () => {
    setDateFilter('30days');
    setDateRange({
      from: new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000),
      to: new Date()
    });
    setPaymentFilter('all');
    setShopFilter('all');
    setSellerFilter('all');
    setSearchTerm('');
    setCurrentPage(1);
    setSortConfig({ key: 'created_at', direction: 'desc' });
  };

  const handleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
    setCurrentPage(1);
  };

  const getSortIcon = (key: string) => {
    if (sortConfig.key !== key) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-50" />;
    return sortConfig.direction === 'asc' ? <ArrowUp className="h-3 w-3 ml-1" /> : <ArrowDown className="h-3 w-3 ml-1" />;
  };

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

  // Fetch all sellers (profiles with seller role in this business)
  const { data: allSellers = [] } = useQuery({
    queryKey: ['all-sellers', businessId],
    queryFn: async () => {
      if (!businessId) return [];
      const { data, error } = await supabase
        .from('user_roles')
        .select(`
          user_id,
          profile:profiles (id, name)
        `)
        .eq('business_id', businessId)
        .eq('role', 'seller');
      
      if (error) throw error;
      
      // Filter unique profiles
      const sellersMap = new Map();
      data.forEach((r: any) => {
        if (r.profile) sellersMap.set(r.profile.id, r.profile.name);
      });
      
      return Array.from(sellersMap.entries()).map(([id, name]) => ({ id, name }));
    },
    enabled: !!businessId,
  });

  // Fetch invoice history (POS Sales)
  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['sales-report-data', businessId, dateFilter, dateRange, paymentFilter, shopFilter, sellerFilter, searchTerm, sortConfig],
    queryFn: async () => {
      if (!businessId || !isManagerial) return [];

      const shopIds = allShops.map(s => s.id);
      if (shopIds.length === 0) return [];

      let query = supabase
        .from('invoices')
        .select(`
          *,
          shop:shops!invoices_shop_id_fkey (name, logo_url, address, phone, owner_email),
          staff:profiles!invoices_staff_id_fkey (name)
        `)
        .in('shop_id', shopFilter !== 'all' ? [shopFilter] : shopIds)
        .order(sortConfig.key, { ascending: sortConfig.direction === 'asc' });

      // Apply payment method filter
      if (paymentFilter !== 'all') {
        if (paymentFilter === 'momo') {
          query = query.eq('payment_method', 'mobile_money');
        } else if (paymentFilter === 'card') {
          query = query.or('payment_method.eq.card,payment_method.eq.pos_card');
        } else {
          query = query.eq('payment_method', paymentFilter);
        }
      }

      // Apply seller filter
      if (sellerFilter !== 'all') {
        query = query.eq('staff_id', sellerFilter);
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
          case 'daily':
            startDate = startOfDay(now);
            break;
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
        if (dateFilter === 'daily') {
          query = query.lte('created_at', endOfDay(now).toISOString());
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      
      // Fetch split payments for these invoices
      const invoiceIds = data.map((i: any) => i.id);
      const paymentsMap: Record<string, any[]> = {};
      
      if (invoiceIds.length > 0) {
        const { data: paymentsData, error: paymentsError } = await supabase
          .from('payments')
          .select('invoice_id, amount, payment_method')
          .in('invoice_id', invoiceIds);
          
        if (!paymentsError && paymentsData) {
          paymentsData.forEach(p => {
            if (!p.invoice_id) return;
            if (!paymentsMap[p.invoice_id]) paymentsMap[p.invoice_id] = [];
            paymentsMap[p.invoice_id].push(p);
          });
        }
      }

      let filteredData = data.map((invoice: any) => ({
        ...invoice,
        payments: paymentsMap[invoice.id] || []
      }));

      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filteredData = filteredData.filter(s => 
          s.invoice_number?.toLowerCase().includes(term) ||
          s.customer_info?.phone?.toLowerCase?.().includes(term)
        );
      }

      return filteredData;
    },
    enabled: !!businessId && isManagerial && allShops.length > 0,
  });

  const stats = useMemo(() => {
    // Calculate accurate revenue per method including split payments
    let cashRevenue = 0;
    let momoRevenue = 0;
    let cardRevenue = 0;
    let totalRevenue = 0;

    invoices.forEach((s: any) => {
      totalRevenue += (Number(s.total_amount) || 0);
      
      if (s.payment_method === 'split' && s.payments?.length > 0) {
        s.payments.forEach((p: any) => {
          const amount = Number(p.amount) || 0;
          if (p.payment_method === 'cash') cashRevenue += amount;
          else if (p.payment_method === 'mobile_money') momoRevenue += amount;
          else if (['card', 'pos_card'].includes(p.payment_method)) cardRevenue += amount;
        });
      } else {
        const amount = Number(s.total_amount) || 0;
        if (s.payment_method === 'cash') cashRevenue += amount;
        else if (s.payment_method === 'mobile_money') momoRevenue += amount;
        else if (['card', 'pos_card'].includes(s.payment_method)) cardRevenue += amount;
      }
    });

    return {
      totalRevenue,
      invoiceCount: invoices.length,
      avgInvoiceValue: invoices.length > 0 ? totalRevenue / invoices.length : 0,
      cashRevenue,
      momoRevenue,
      cardRevenue,
    };
  }, [invoices]);

  const paginatedInvoices = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return invoices.slice(start, start + ITEMS_PER_PAGE);
  }, [invoices, currentPage]);

  const totalPages = Math.ceil(invoices.length / ITEMS_PER_PAGE);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Sales_Report_${format(new Date(), 'yyyy-MM-dd')}`,
  });

  const handleExportCSV = () => {
    if (invoices.length === 0) return;

    const headers = ['Date', 'Invoice Number', 'Amount', 'Payment', 'Shop', 'Staff', 'Customer Phone'];
    const csvData = invoices.map((s: any) => [
      format(new Date(s.created_at), 'yyyy-MM-dd HH:mm'),
      s.invoice_number || '-',
      s.total_amount,
      s.payment_method,
      s.shop?.name || 'Unknown',
      s.staff?.name || 'System',
      s.customer_info?.phone || 'Walk-in'
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
      description="Track revenue, invoices, and payment methods across all shops"
      actions={
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate(getTenantRoute('/reports'))}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Reports
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint} disabled={invoices.length === 0}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={invoices.length === 0}>
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
              <p className="text-xs text-muted-foreground">{stats.invoiceCount} invoices</p>
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
                Avg Invoice
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold">{formatCurrency(stats.avgInvoiceValue, 'RWF')}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Report Filters
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={handleResetFilters} className="text-muted-foreground">
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset Filters
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
              <div className="flex flex-col space-y-2">
                <Label htmlFor="date-filter">Date Range</Label>
                <Select value={dateFilter} onValueChange={(val) => { setDateFilter(val); setCurrentPage(1); }}>
                  <SelectTrigger id="date-filter">
                    <SelectValue placeholder="Select date range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Today (Daily)</SelectItem>
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
                <Label htmlFor="seller-filter">Seller</Label>
                <Select value={sellerFilter} onValueChange={(val) => { setSellerFilter(val); setCurrentPage(1); }}>
                  <SelectTrigger id="seller-filter">
                    <SelectValue placeholder="All Sellers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sellers</SelectItem>
                    {allSellers.map(seller => (
                      <SelectItem key={seller.id} value={seller.id}>{seller.name}</SelectItem>
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
                    <SelectItem value="momo">Mobile Money (MoMo)</SelectItem>
                    <SelectItem value="card">Bank Card</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col space-y-2 xl:col-span-2">
                <Label htmlFor="search">Search Invoice Number/Phone</Label>
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
            <CardTitle className="text-lg">Invoice History ({invoices.length} records)</CardTitle>
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
                  <p className="text-muted-foreground">Loading invoice data...</p>
                </div>
              ) : invoices.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  No records found for the selected criteria
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th 
                          className="p-3 text-left font-semibold cursor-pointer hover:bg-muted/80"
                          onClick={() => handleSort('created_at')}
                        >
                          <div className="flex items-center">
                            Date & Time
                            {getSortIcon('created_at')}
                          </div>
                        </th>
                        <th 
                          className="p-3 text-left font-semibold cursor-pointer hover:bg-muted/80"
                          onClick={() => handleSort('invoice_number')}
                        >
                          <div className="flex items-center">
                            Invoice Number
                            {getSortIcon('invoice_number')}
                          </div>
                        </th>
                        <th 
                          className="p-3 text-right font-semibold cursor-pointer hover:bg-muted/80"
                          onClick={() => handleSort('total_amount')}
                        >
                          <div className="flex items-center justify-end">
                            Amount
                            {getSortIcon('total_amount')}
                          </div>
                        </th>
                        <th className="p-3 text-left font-semibold">Payment</th>
                        <th className="p-3 text-left font-semibold">Shop</th>
                        <th className="p-3 text-left font-semibold">Staff</th>
                        <th className="p-3 text-left font-semibold">Customer</th>
                        <th className="p-3 text-center font-semibold print:hidden">Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedInvoices.map((invoice: any) => (
                        <tr key={invoice.id} className="border-b hover:bg-muted/30 transition-colors print:break-inside-avoid">
                          <td className="p-3 whitespace-nowrap">
                            {format(new Date(invoice.created_at), 'MMM dd, HH:mm')}
                          </td>
                          <td className="p-3 font-mono font-medium text-xs">
                            {invoice.invoice_number || '-'}
                          </td>
                          <td className="p-3 text-right font-mono font-bold">
                            {formatCurrency(Number(invoice.total_amount), 'RWF')}
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-1.5 capitalize text-xs">
                              {getPaymentIcon(invoice.payment_method)}
                              {invoice.payment_method}
                            </div>
                          </td>
                          <td className="p-3 whitespace-nowrap">
                            <div className="flex items-center gap-1.5 text-xs">
                              <MapPin className="h-3 w-3 text-muted-foreground" />
                              {invoice.shop?.name || 'Unknown'}
                            </div>
                          </td>
                          <td className="p-3 whitespace-nowrap text-xs">
                            <div className="flex items-center gap-1.5">
                              <User className="h-3 w-3 text-muted-foreground" />
                              {invoice.staff?.name || 'System'}
                            </div>
                          </td>
                          <td className="p-3 whitespace-nowrap text-xs text-muted-foreground">
                            {invoice.customer_info?.phone || 'Walk-in'}
                          </td>
                          <td className="p-3 text-center print:hidden">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              onClick={() => setSelectedInvoice(invoice)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
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
                  Page {currentPage} of {totalPages} ({invoices.length} total records)
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

      <ViewInvoiceDialog
        open={!!selectedInvoice}
        onOpenChange={(open) => {
          if (!open) setSelectedInvoice(null);
        }}
        invoice={selectedInvoice}
      />
    </TenantPageWrapper>
  );
}
