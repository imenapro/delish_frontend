import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { TenantPageWrapper } from '@/components/tenant/TenantPageWrapper';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useStoreContext } from '@/contexts/StoreContext';
import { format, subDays } from 'date-fns';
import { Search, Eye, Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { ViewInvoiceDialog } from '@/components/invoices/ViewInvoiceDialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 10;

interface Invoice {
  id: string;
  invoice_number: string;
  created_at: string;
  shop?: { name: string; logo_url?: string; address?: string; phone?: string };
  customer_info?: { name: string; phone?: string };
  total_amount: number;
  status: string;
  payment_method: string;
  subtotal: number;
  tax_amount: number;
  items_snapshot: any[];
  notes?: string;
}

export default function TenantInvoiceManagement() {
  const { store } = useStoreContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedShop, setSelectedShop] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [page, setPage] = useState(1);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({
    key: 'created_at',
    direction: 'desc',
  });

  const invoiceId = searchParams.get('invoiceId');
  const viewDialogOpen = !!invoiceId;

  // Fetch specific invoice details when URL param is present
   const { data: selectedInvoice } = useQuery({
     queryKey: ['invoice', invoiceId],
     queryFn: async () => {
       if (!invoiceId) return null;
       const { data, error } = await supabase
         .from('invoices')
         .select(`
           *,
           shop:shops!inner (
             name,
             address,
             phone,
             logo_url,
             business_id
           )
         `)
         .eq('id', invoiceId)
          .eq('shop.business_id', store?.id)
          .maybeSingle();
        
        if (error) throw error;
        return data as Invoice;
      },
      enabled: !!invoiceId && !!store?.id,
      retry: false
    });

  // Fetch shops for filtering
  const { data: shops } = useQuery({
    queryKey: ['shops', store?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shops')
        .select('id, name')
        .eq('business_id', store?.id)
        .eq('is_active', true);
      
      if (error) throw error;
      return data;
    },
    enabled: !!store?.id,
  });

  // Fetch invoices with server-side pagination and filtering
  const { data: invoicesData, isLoading } = useQuery({
    queryKey: ['invoices', selectedShop, store?.id, page, dateRange, searchTerm, sortConfig],
    queryFn: async () => {
      // Use !inner join to enforce relationship and allow filtering by shop's business_id
      let query = supabase
        .from('invoices')
        .select(`
          *,
          shop:shops!inner (
            name,
            address,
            phone,
            logo_url,
            business_id
           )
        `, { count: 'exact' });

      // Filter by business (Tenant) using the shop relation
      if (store?.id) {
        query = query.eq('shop.business_id', store.id);
      }

      // Filter by shop (if selected)
      if (selectedShop !== 'all') {
        query = query.eq('shop_id', selectedShop);
      }

      // Filter by date range
      if (dateRange?.from) {
        query = query.gte('created_at', dateRange.from.toISOString());
      }
      if (dateRange?.to) {
        const toDate = new Date(dateRange.to);
        toDate.setHours(23, 59, 59, 999);
        query = query.lte('created_at', toDate.toISOString());
      }

      // Filter by search term
      if (searchTerm) {
        query = query.ilike('invoice_number', `%${searchTerm}%`);
      }

      // Sorting
      query = query.order(sortConfig.key, { ascending: sortConfig.direction === 'asc' });
      
      // Pagination
      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      query = query.range(from, to);

      const { data, count, error } = await query;
      if (error) throw error;
      return { data: data as Invoice[], count };
    },
    enabled: !!store?.id,
  });

  const totalPages = Math.ceil((invoicesData?.count || 0) / PAGE_SIZE);

  const handleSort = (key: string) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const handleViewInvoice = (invoice: Invoice) => {
    setSearchParams({ invoiceId: invoice.id });
  };

  const handleCloseViewDialog = (open: boolean) => {
    if (!open) {
      setSearchParams({});
    }
  };

  return (
    <TenantPageWrapper
      title="Invoice Management"
      description="View and manage customer invoices"
    >
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4 justify-between">
            <div className="flex flex-col md:flex-row gap-4 flex-1">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                    placeholder="Search invoice number..."
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setPage(1);
                    }}
                    />
                </div>
            
            <Select
              value={selectedShop}
              onValueChange={(val) => { setSelectedShop(val); setPage(1); }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Shops" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Shops</SelectItem>
                {shops?.map((shop) => (
                  <SelectItem key={shop.id} value={shop.id}>
                        {shop.name}
                        </SelectItem>
                    ))}
                    </SelectContent>
                </Select>

                <Popover>
                    <PopoverTrigger asChild>
                    <Button
                        id="date"
                        variant={"outline"}
                        className={cn(
                        "w-[240px] justify-start text-left font-normal",
                        !dateRange && "text-muted-foreground"
                        )}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateRange?.from ? (
                        dateRange.to ? (
                            <>
                            {format(dateRange.from, "LLL dd, y")} -{" "}
                            {format(dateRange.to, "LLL dd, y")}
                            </>
                        ) : (
                            format(dateRange.from, "LLL dd, y")
                        )
                        ) : (
                        <span>Pick a date</span>
                        )}
                    </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={dateRange?.from}
                        selected={dateRange}
                        onSelect={(range) => { setDateRange(range); setPage(1); }}
                        numberOfMonths={2}
                    />
                    </PopoverContent>
                </Popover>
            </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invoices ({invoicesData?.count || 0})</CardTitle>
        </CardHeader>
        <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('invoice_number')}>
                      Invoice # {sortConfig.key === 'invoice_number' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('created_at')}>
                      Date {sortConfig.key === 'created_at' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Shop</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead className="cursor-pointer hover:bg-muted/50 text-right" onClick={() => handleSort('total_amount')}>
                      Amount {sortConfig.key === 'total_amount' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                      <TableRow>
                          <TableCell colSpan={7} className="text-center py-8">
                              <div className="flex justify-center items-center">
                                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                              </div>
                          </TableCell>
                      </TableRow>
                  ) : invoicesData?.data?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No invoices found
                      </TableCell>
                    </TableRow>
                  ) : (
                    invoicesData?.data?.map((invoice: Invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                        <TableCell>
                          {format(new Date(invoice.created_at), 'MMM dd, yyyy HH:mm')}
                        </TableCell>
                        <TableCell>
                            <Badge variant="secondary" className="uppercase text-[10px] h-5">
                                POS
                            </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-normal bg-muted/50">
                              {invoice.shop?.name || '-'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {invoice.customer_info?.name || 'Guest'}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {Number(invoice.total_amount).toLocaleString()} RWF
                        </TableCell>
                        <TableCell>
                          <Badge variant={invoice.status === 'paid' ? 'default' : 'secondary'} className={
                            invoice.status === 'paid' ? 'bg-green-500/15 text-green-700 hover:bg-green-500/25 border-green-500/50' : ''
                          }>
                            {invoice.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewInvoice(invoice)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
        </CardContent>
        <CardFooter className="flex justify-between items-center py-4">
            <div className="text-sm text-muted-foreground">
                Showing {(page - 1) * PAGE_SIZE + 1} to {Math.min(page * PAGE_SIZE, invoicesData?.count || 0)} of {invoicesData?.count || 0} entries
            </div>
            {totalPages > 1 && (
                <div className="flex items-center space-x-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                    >
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Previous
                    </Button>
                    <div className="text-sm font-medium">
                        Page {page} of {totalPages}
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                    >
                        Next
                        <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                </div>
            )}
        </CardFooter>
      </Card>

      {selectedInvoice && (
        <ViewInvoiceDialog
          open={viewDialogOpen}
          onOpenChange={handleCloseViewDialog}
          invoice={selectedInvoice}
        />
      )}
    </TenantPageWrapper>
  );
}
