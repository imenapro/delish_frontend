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
  DollarSign,
  Calendar,
  User,
  MapPin,
  Tag,
  CheckCircle2,
  XCircle,
  Clock,
  PieChart as PieChartIcon,
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

export default function ExpenseReport() {
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
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ 
    key: 'expense_date', 
    direction: 'desc' 
  });
  
  const businessId = store?.id;
  const isManagerial = roles.some(r => ['super_admin', 'store_owner', 'admin', 'accountant'].includes(r.role.toLowerCase()));

  const handleResetFilters = () => {
    setDateFilter('30days');
    setDateRange({
      from: new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000),
      to: new Date()
    });
    setStatusFilter('all');
    setShopFilter('all');
    setCategoryFilter('all');
    setSearchTerm('');
    setCurrentPage(1);
    setSortConfig({ key: 'expense_date', direction: 'desc' });
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

  // Fetch expenses
  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ['expense-report-data', businessId, dateFilter, dateRange, statusFilter, shopFilter, categoryFilter, searchTerm, sortConfig],
    queryFn: async () => {
      if (!businessId || !isManagerial) return [];

      let query = supabase
        .from('expenses')
        .select(`
          *,
          shop:shops (name),
          recorder:profiles!expenses_recorded_by_fkey (name),
          approver:profiles!expenses_approved_by_fkey (name)
        `)
        .eq('business_id', businessId)
        .is('deleted_at', null)
        .order(sortConfig.key, { ascending: sortConfig.direction === 'asc' });

      // Apply shop filter
      if (shopFilter !== 'all') {
        if (shopFilter === 'general') {
          query = query.is('shop_id', null);
        } else {
          query = query.eq('shop_id', shopFilter);
        }
      }

      // Apply category filter
      if (categoryFilter !== 'all') {
        query = query.eq('category', categoryFilter);
      }

      // Apply status filter
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      // Apply date filter
      if (dateFilter === 'custom' && dateRange?.from) {
        query = query.gte('expense_date', format(dateRange.from, 'yyyy-MM-dd'));
        if (dateRange.to) {
          query = query.lte('expense_date', format(dateRange.to, 'yyyy-MM-dd'));
        }
      } else if (dateFilter !== 'all') {
        const now = new Date();
        let startDate: Date;
        
        switch (dateFilter) {
          case 'daily':
            startDate = now;
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
        
        query = query.gte('expense_date', format(startDate, 'yyyy-MM-dd'));
        if (dateFilter === 'daily') {
          query = query.lte('expense_date', format(now, 'yyyy-MM-dd'));
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      
      let filteredData = data;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filteredData = data.filter(e => 
          e.description?.toLowerCase().includes(term) ||
          e.category?.toLowerCase().includes(term)
        );
      }

      return filteredData;
    },
    enabled: !!businessId && isManagerial,
  });

  // Unique categories for filter
  const categories = useMemo(() => {
    const cats = new Set<string>();
    expenses.forEach(e => {
      if (e.category) cats.add(e.category);
    });
    return Array.from(cats).sort();
  }, [expenses]);

  const stats = useMemo(() => {
    return {
      total: expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0),
      approved: expenses.filter(e => e.status === 'approved').reduce((sum, e) => sum + (Number(e.amount) || 0), 0),
      pending: expenses.filter(e => e.status === 'pending').reduce((sum, e) => sum + (Number(e.amount) || 0), 0),
      count: expenses.length
    };
  }, [expenses]);

  const paginatedExpenses = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return expenses.slice(start, start + ITEMS_PER_PAGE);
  }, [expenses, currentPage]);

  const totalPages = Math.ceil(expenses.length / ITEMS_PER_PAGE);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Expense_Report_${format(new Date(), 'yyyy-MM-dd')}`,
  });

  const handleExportCSV = () => {
    if (expenses.length === 0) return;

    const headers = ['Date', 'Category', 'Description', 'Amount', 'Currency', 'Shop', 'Status', 'Recorded By', 'Approved By'];
    const csvData = expenses.map(e => [
      format(new Date(e.expense_date), 'yyyy-MM-dd'),
      e.category || '-',
      e.description || '',
      e.amount,
      e.currency || 'RWF',
      e.shop?.name || 'General',
      e.status,
      e.recorder?.name || 'System',
      e.approver?.name || '-'
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `expense_report_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><CheckCircle2 className="w-3 h-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
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
      title="Expense Report"
      description="Analyze business expenditures and category-wise spending"
      actions={
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate(`/${storeSlug}/reports`)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Reports
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint} disabled={expenses.length === 0}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={expenses.length === 0}>
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
                <DollarSign className="w-4 h-4" />
                Total Expenses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.total, 'RWF')}</div>
              <p className="text-xs text-muted-foreground">{stats.count} records</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                Approved
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{formatCurrency(stats.approved, 'RWF')}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Clock className="w-4 h-4 text-yellow-500" />
                Pending
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{formatCurrency(stats.pending, 'RWF')}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <PieChartIcon className="w-4 h-4 text-blue-500" />
                Categories
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{categories.length}</div>
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
                <Label htmlFor="status-filter">Status</Label>
                <Select value={statusFilter} onValueChange={(val) => { setStatusFilter(val); setCurrentPage(1); }}>
                  <SelectTrigger id="status-filter">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
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
                    <SelectItem value="general">General (No Shop)</SelectItem>
                    {allShops.map(shop => (
                      <SelectItem key={shop.id} value={shop.id}>{shop.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col space-y-2">
                <Label htmlFor="category-filter">Category</Label>
                <Select value={categoryFilter} onValueChange={(val) => { setCategoryFilter(val); setCurrentPage(1); }}>
                  <SelectTrigger id="category-filter">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col space-y-2">
                <Label htmlFor="search">Search Description</Label>
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
            <CardTitle className="text-lg">Expense List ({expenses.length} records)</CardTitle>
          </CardHeader>
          <CardContent>
            <div ref={printRef} className="space-y-4">
              <div className="hidden print:block mb-6">
                <h1 className="text-2xl font-bold">Expense Report</h1>
                <p className="text-muted-foreground">Generated on {format(new Date(), 'PPP p')}</p>
                <div className="mt-2 text-sm">
                  <span>Total Approved: {formatCurrency(stats.approved, 'RWF')}</span>
                </div>
              </div>

              {isLoading ? (
                <div className="text-center py-12">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
                  <p className="text-muted-foreground">Loading expense data...</p>
                </div>
              ) : expenses.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  No records found for the selected criteria
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th 
                          className="p-3 text-left font-semibold cursor-pointer hover:bg-muted/80"
                          onClick={() => handleSort('expense_date')}
                        >
                          <div className="flex items-center">
                            Date
                            {getSortIcon('expense_date')}
                          </div>
                        </th>
                        <th className="p-3 text-left font-semibold">Category</th>
                        <th className="p-3 text-left font-semibold">Description</th>
                        <th 
                          className="p-3 text-right font-semibold cursor-pointer hover:bg-muted/80"
                          onClick={() => handleSort('amount')}
                        >
                          <div className="flex items-center justify-end">
                            Amount
                            {getSortIcon('amount')}
                          </div>
                        </th>
                        <th className="p-3 text-left font-semibold">Shop</th>
                        <th className="p-3 text-left font-semibold">Status</th>
                        <th className="p-3 text-left font-semibold">Recorded By</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedExpenses.map((expense) => (
                        <tr key={expense.id} className="border-b hover:bg-muted/30 transition-colors print:break-inside-avoid">
                          <td className="p-3 whitespace-nowrap">
                            {format(new Date(expense.expense_date), 'MMM dd, yyyy')}
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <Tag className="h-3 w-3 text-muted-foreground" />
                              <span className="font-medium">{expense.category}</span>
                            </div>
                          </td>
                          <td className="p-3 max-w-[250px] truncate">
                            {expense.description}
                          </td>
                          <td className="p-3 text-right font-mono font-bold">
                            {formatCurrency(Number(expense.amount), expense.currency || 'RWF')}
                          </td>
                          <td className="p-3 whitespace-nowrap">
                            <div className="flex items-center gap-1.5 text-xs">
                              <MapPin className="h-3 w-3 text-muted-foreground" />
                              {expense.shop?.name || 'General'}
                            </div>
                          </td>
                          <td className="p-3">
                            {getStatusBadge(expense.status)}
                          </td>
                          <td className="p-3 whitespace-nowrap text-xs">
                            <div className="flex flex-col">
                              <span>{expense.recorder?.name || 'System'}</span>
                              {expense.approver && <span className="text-muted-foreground text-[10px]">App: {expense.approver.name}</span>}
                            </div>
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
                  Page {currentPage} of {totalPages} ({expenses.length} total records)
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
