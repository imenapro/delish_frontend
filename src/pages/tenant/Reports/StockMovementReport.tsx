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
  Package,
  ArrowUpCircle,
  ArrowDownCircle,
  ArrowLeftRight,
  ShoppingCart,
  User,
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

const ITEMS_PER_PAGE = 20;

export default function StockMovementReport() {
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
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [shopFilter, setShopFilter] = useState<string>('all');
  const [staffFilter, setStaffFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ 
    key: 'created_at', 
    direction: 'desc' 
  });
  
  const businessId = store?.id;
  const isManagerial = roles.some(r => ['super_admin', 'store_owner', 'admin'].includes(r.role.toLowerCase()));

  const handleResetFilters = () => {
    setDateFilter('30days');
    setDateRange({
      from: new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000),
      to: new Date()
    });
    setStatusFilter('all');
    setShopFilter('all');
    setStaffFilter('all');
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

  // Fetch movements
  const { data: movements = [], isLoading } = useQuery({
    queryKey: ['stock-movement-report', businessId, dateFilter, dateRange, statusFilter, shopFilter, staffFilter, searchTerm, sortConfig],
    queryFn: async () => {
      if (!businessId || !isManagerial) return [];

      let query = supabase
        .from('inventory_transactions')
        .select(`
          *,
          product:products (name, category),
          shop:shops!inventory_transactions_shop_id_fkey (name),
          reason:inventory_reasons (name),
          creator:profiles!inventory_transactions_created_by_fkey (name)
        `)
        .order(sortConfig.key, { ascending: sortConfig.direction === 'asc' });

      // Apply shop filter
      if (shopFilter !== 'all') {
        query = query.eq('shop_id', shopFilter);
      } else {
        // Only shops for this business
        const shopIds = allShops.map(s => s.id);
        if (shopIds.length > 0) {
          query = query.in('shop_id', shopIds);
        }
      }

      // Apply staff filter
      if (staffFilter !== 'all') {
        query = query.eq('created_by', staffFilter);
      }

      // Apply transaction type filter
      if (statusFilter !== 'all') {
        query = query.eq('transaction_type', statusFilter);
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
      
      let filteredData = data;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filteredData = data.filter(m => 
          m.product?.name?.toLowerCase().includes(term) ||
          m.notes?.toLowerCase().includes(term) ||
          m.reason?.name?.toLowerCase().includes(term)
        );
      }

      return filteredData;
    },
    enabled: !!businessId && isManagerial && allShops.length > 0,
  });

  // Unique staff for filter
  const staffMembers = useMemo(() => {
    const staff = new Map();
    movements.forEach(m => {
      if (m.created_by && m.creator) {
        staff.set(m.created_by, m.creator.name);
      }
    });
    return Array.from(staff.entries()).map(([id, name]) => ({ id, name }));
  }, [movements]);

  const paginatedMovements = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return movements.slice(start, start + ITEMS_PER_PAGE);
  }, [movements, currentPage]);

  const totalPages = Math.ceil(movements.length / ITEMS_PER_PAGE);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Stock_Movement_Report_${format(new Date(), 'yyyy-MM-dd')}`,
  });

  const handleExportCSV = () => {
    if (movements.length === 0) return;

    const headers = ['Date', 'Product', 'Type', 'Quantity', 'Shop', 'Reason', 'Staff', 'Notes'];
    const csvData = movements.map(m => [
      format(new Date(m.created_at), 'yyyy-MM-dd HH:mm'),
      m.product?.name || 'Unknown',
      m.transaction_type,
      m.quantity,
      m.shop?.name || 'Unknown',
      m.reason?.name || '-',
      m.creator?.name || 'System',
      m.notes || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `stock_movement_report_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'stock_in': return <ArrowUpCircle className="h-4 w-4 text-green-500" />;
      case 'stock_out': return <ArrowDownCircle className="h-4 w-4 text-red-500" />;
      case 'transfer_in': 
      case 'transfer_out': return <ArrowLeftRight className="h-4 w-4 text-blue-500" />;
      case 'sale': return <ShoppingCart className="h-4 w-4 text-purple-500" />;
      default: return <Package className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTransactionLabel = (type: string) => {
    return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
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
      title="Stock Movement Report"
      description="Detailed log of all stock changes across all shops"
      actions={
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate(`/${storeSlug}/reports`)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Reports
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint} disabled={movements.length === 0}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={movements.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
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
                <Label htmlFor="status-filter">Transaction Type</Label>
                <Select value={statusFilter} onValueChange={(val) => { setStatusFilter(val); setCurrentPage(1); }}>
                  <SelectTrigger id="status-filter">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="stock_in">Stock In</SelectItem>
                    <SelectItem value="stock_out">Stock Out</SelectItem>
                    <SelectItem value="transfer_in">Transfer In</SelectItem>
                    <SelectItem value="transfer_out">Transfer Out</SelectItem>
                    <SelectItem value="sale">Sale</SelectItem>
                    <SelectItem value="adjustment">Adjustment</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col space-y-2">
                <Label htmlFor="shop-filter">Shop</Label>
                <Select value={shopFilter} onValueChange={(val) => { setShopFilter(val); setCurrentPage(1); }}>
                  <SelectTrigger id="shop-filter">
                    <SelectValue placeholder="All Shops" />
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
                <Label htmlFor="staff-filter">Staff</Label>
                <Select value={staffFilter} onValueChange={(val) => { setStaffFilter(val); setCurrentPage(1); }}>
                  <SelectTrigger id="staff-filter">
                    <SelectValue placeholder="All Staff" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Staff</SelectItem>
                    {staffMembers.map(staff => (
                      <SelectItem key={staff.id} value={staff.id}>{staff.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col space-y-2">
                <Label htmlFor="search">Search Product</Label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Search name..."
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
            <CardTitle className="text-lg">Movement History ({movements.length} records)</CardTitle>
          </CardHeader>
          <CardContent>
            <div ref={printRef} className="space-y-4">
              <div className="hidden print:block mb-6">
                <h1 className="text-2xl font-bold">Stock Movement Report</h1>
                <p className="text-muted-foreground">Generated on {format(new Date(), 'PPP p')}</p>
                <div className="mt-2 text-sm">
                  <span>Range: {dateFilter === 'custom' && dateRange?.from ? `${format(dateRange.from, 'PP')} - ${dateRange.to ? format(dateRange.to, 'PP') : 'Today'}` : dateFilter}</span>
                  <span className="ml-4">Type: {statusFilter}</span>
                  <span className="ml-4">Shop: {shopFilter === 'all' ? 'All' : allShops.find(s => s.id === shopFilter)?.name}</span>
                </div>
              </div>

              {isLoading ? (
                <div className="text-center py-12">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
                  <p className="text-muted-foreground">Loading movement data...</p>
                </div>
              ) : movements.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-20" />
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
                        <th className="p-3 text-left font-semibold">Product</th>
                        <th className="p-3 text-left font-semibold">Type</th>
                        <th 
                          className="p-3 text-right font-semibold cursor-pointer hover:bg-muted/80"
                          onClick={() => handleSort('quantity')}
                        >
                          <div className="flex items-center justify-end">
                            Qty
                            {getSortIcon('quantity')}
                          </div>
                        </th>
                        <th className="p-3 text-left font-semibold">Shop</th>
                        <th className="p-3 text-left font-semibold">Staff</th>
                        <th className="p-3 text-left font-semibold">Reason/Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedMovements.map((movement) => (
                        <tr key={movement.id} className="border-b hover:bg-muted/30 transition-colors print:break-inside-avoid">
                          <td className="p-3 whitespace-nowrap">
                            {format(new Date(movement.created_at), 'MMM dd, HH:mm')}
                          </td>
                          <td className="p-3 font-medium">
                            {movement.product?.name || 'Unknown'}
                            <div className="text-xs text-muted-foreground font-normal">{movement.product?.category}</div>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              {getTransactionIcon(movement.transaction_type)}
                              <span>{getTransactionLabel(movement.transaction_type)}</span>
                            </div>
                          </td>
                          <td className="p-3 text-right font-mono font-semibold">
                            <span className={movement.quantity > 0 ? 'text-green-600' : 'text-red-600'}>
                              {movement.quantity > 0 ? '+' : ''}{movement.quantity}
                            </span>
                          </td>
                          <td className="p-3 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                              {movement.shop?.name || 'Unknown'}
                            </div>
                          </td>
                          <td className="p-3 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <User className="h-3.5 w-3.5 text-muted-foreground" />
                              {movement.creator?.name || 'System'}
                            </div>
                          </td>
                          <td className="p-3 max-w-[200px] truncate">
                            <div className="font-medium text-xs">{movement.reason?.name || '-'}</div>
                            <div className="text-xs text-muted-foreground truncate">{movement.notes}</div>
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
                  Page {currentPage} of {totalPages} ({movements.length} total records)
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
