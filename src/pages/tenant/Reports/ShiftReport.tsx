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
  Clock,
  Calendar,
  User,
  MapPin,
  CheckCircle2,
  Lock,
  Unlock,
  DollarSign,
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

const ITEMS_PER_PAGE = 20;

export default function ShiftReport() {
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
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ 
    key: 'opened_at', 
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
    setSearchTerm('');
    setCurrentPage(1);
    setSortConfig({ key: 'opened_at', direction: 'desc' });
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

  // Fetch shifts (pos_sessions)
  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['shift-report-data', businessId, dateFilter, dateRange, statusFilter, shopFilter, searchTerm, sortConfig],
    queryFn: async () => {
      if (!businessId || !isManagerial) return [];

      let query = supabase
        .from('pos_sessions')
        .select(`
          *,
          shop:shops (name),
          user:profiles!pos_sessions_user_id_fkey (name)
        `)
        .eq('business_id', businessId)
        .order(sortConfig.key, { ascending: sortConfig.direction === 'asc' });

      // Apply shop filter
      if (shopFilter !== 'all') {
        query = query.eq('shop_id', shopFilter);
      }

      // Apply status filter
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      // Apply date filter
      if (dateFilter === 'custom' && dateRange?.from) {
        query = query.gte('opened_at', startOfDay(dateRange.from).toISOString());
        if (dateRange.to) {
          query = query.lte('opened_at', endOfDay(dateRange.to).toISOString());
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
        
        query = query.gte('opened_at', startDate.toISOString());
        if (dateFilter === 'daily') {
          query = query.lte('opened_at', endOfDay(now).toISOString());
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      
      let filteredData = data;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filteredData = data.filter(s => 
          s.user?.name?.toLowerCase().includes(term) ||
          s.notes?.toLowerCase().includes(term)
        );
      }

      return filteredData;
    },
    enabled: !!businessId && isManagerial && allShops.length > 0,
  });

  const stats = useMemo(() => {
    return {
      totalSales: sessions.reduce((sum, s) => sum + (Number(s.total_sales) || 0), 0),
      totalOrders: sessions.reduce((sum, s) => sum + (Number(s.total_orders) || 0), 0),
      openShifts: sessions.filter(s => s.status === 'open').length,
      closedShifts: sessions.filter(s => s.status === 'closed').length,
    };
  }, [sessions]);

  const paginatedSessions = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return sessions.slice(start, start + ITEMS_PER_PAGE);
  }, [sessions, currentPage]);

  const totalPages = Math.ceil(sessions.length / ITEMS_PER_PAGE);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Shift_Report_${format(new Date(), 'yyyy-MM-dd')}`,
  });

  const handleExportCSV = () => {
    if (sessions.length === 0) return;

    const headers = ['Opened At', 'Closed At', 'Staff', 'Shop', 'Opening Cash', 'Total Sales', 'Closing Cash', 'Status', 'Notes'];
    const csvData = sessions.map(s => [
      format(new Date(s.opened_at), 'yyyy-MM-dd HH:mm'),
      s.closed_at ? format(new Date(s.closed_at), 'yyyy-MM-dd HH:mm') : '-',
      s.user?.name || 'Unknown',
      s.shop?.name || 'Unknown',
      s.opening_cash,
      s.total_sales,
      s.closing_cash || '-',
      s.status,
      s.notes || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `shift_report_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><Unlock className="w-3 h-3 mr-1" />Open</Badge>;
      case 'closed':
        return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200"><Lock className="w-3 h-3 mr-1" />Closed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
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
      title="POS Shift Report"
      description="Monitor staff shifts, cash handling, and sales per session"
      actions={
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate(`/${storeSlug}/reports`)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Reports
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint} disabled={sessions.length === 0}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={sessions.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Summary Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-green-500" />
                Total Session Sales
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.totalSales, 'RWF')}</div>
              <p className="text-xs text-muted-foreground">{stats.totalOrders} total orders</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Unlock className="w-4 h-4 text-green-500" />
                Active Shifts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.openShifts}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Lock className="w-4 h-4 text-gray-500" />
                Closed Shifts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-600">{stats.closedShifts}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <User className="w-4 h-4 text-blue-500" />
                Total Sessions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{sessions.length}</div>
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                <Label htmlFor="status-filter">Status</Label>
                <Select value={statusFilter} onValueChange={(val) => { setStatusFilter(val); setCurrentPage(1); }}>
                  <SelectTrigger id="status-filter">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
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
                <Label htmlFor="search">Search Staff/Notes</Label>
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
            <CardTitle className="text-lg">Session History ({sessions.length} records)</CardTitle>
          </CardHeader>
          <CardContent>
            <div ref={printRef} className="space-y-4">
              <div className="hidden print:block mb-6">
                <h1 className="text-2xl font-bold">POS Shift Report</h1>
                <p className="text-muted-foreground">Generated on {format(new Date(), 'PPP p')}</p>
              </div>

              {isLoading ? (
                <div className="text-center py-12">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
                  <p className="text-muted-foreground">Loading shift data...</p>
                </div>
              ) : sessions.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  No records found for the selected criteria
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th 
                          className="p-3 text-left font-semibold cursor-pointer hover:bg-muted/80"
                          onClick={() => handleSort('opened_at')}
                        >
                          <div className="flex items-center">
                            Opened At
                            {getSortIcon('opened_at')}
                          </div>
                        </th>
                        <th className="p-3 text-left font-semibold">Closed At</th>
                        <th className="p-3 text-left font-semibold">Staff</th>
                        <th className="p-3 text-left font-semibold">Shop</th>
                        <th 
                          className="p-3 text-right font-semibold cursor-pointer hover:bg-muted/80"
                          onClick={() => handleSort('opening_cash')}
                        >
                          <div className="flex items-center justify-end">
                            Opening Cash
                            {getSortIcon('opening_cash')}
                          </div>
                        </th>
                        <th 
                          className="p-3 text-right font-semibold cursor-pointer hover:bg-muted/80"
                          onClick={() => handleSort('total_sales')}
                        >
                          <div className="flex items-center justify-end">
                            Total Sales
                            {getSortIcon('total_sales')}
                          </div>
                        </th>
                        <th 
                          className="p-3 text-right font-semibold cursor-pointer hover:bg-muted/80"
                          onClick={() => handleSort('closing_cash')}
                        >
                          <div className="flex items-center justify-end">
                            Closing Cash
                            {getSortIcon('closing_cash')}
                          </div>
                        </th>
                        <th className="p-3 text-left font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedSessions.map((session) => (
                        <tr key={session.id} className="border-b hover:bg-muted/30 transition-colors print:break-inside-avoid">
                          <td className="p-3 whitespace-nowrap">
                            {format(new Date(session.opened_at), 'MMM dd, HH:mm')}
                          </td>
                          <td className="p-3 whitespace-nowrap text-muted-foreground">
                            {session.closed_at ? format(new Date(session.closed_at), 'MMM dd, HH:mm') : '-'}
                          </td>
                          <td className="p-3 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <User className="h-3.5 w-3.5 text-muted-foreground" />
                              {session.user?.name || 'Unknown'}
                            </div>
                          </td>
                          <td className="p-3 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                              {session.shop?.name || 'Unknown'}
                            </div>
                          </td>
                          <td className="p-3 text-right font-mono text-xs">
                            {formatCurrency(Number(session.opening_cash), 'RWF')}
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-green-600">
                            {formatCurrency(Number(session.total_sales), 'RWF')}
                          </td>
                          <td className="p-3 text-right font-mono text-xs">
                            {session.closing_cash ? formatCurrency(Number(session.closing_cash), 'RWF') : '-'}
                          </td>
                          <td className="p-3">
                            {getStatusBadge(session.status)}
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
                  Page {currentPage} of {totalPages} ({sessions.length} total records)
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
