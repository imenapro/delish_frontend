import { useState, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStoreContext } from '@/contexts/StoreContext';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Calendar as LucideCalendar, Package, ArrowRight, User, Eye, ChevronLeft, ChevronRight, Printer, Download } from 'lucide-react';
import { format, startOfDay, endOfDay } from 'date-fns';
import { DateRange } from "react-day-picker";
import { CalendarDateRangePicker } from '@/components/ui/date-range-picker';
import { useReactToPrint } from 'react-to-print';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface Transfer {
  id: string;
  from_shop: { name: string };
  to_shop: { name: string };
  product: { name: string };
  quantity: number;
  status: 'pending' | 'approved' | 'rejected' | 'in_transit' | 'completed';
  notes: string;
  created_at: string;
  updated_at: string;
  requested_by: string;
  approved_by: string | null;
  requester_profile?: { name: string };
  approver_profile?: { name: string };
}

const ITEMS_PER_PAGE = 10;

export function ProductionTransferHistory() {
  const { store } = useStoreContext();
  const { roles, user } = useAuth();
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [shopFilter, setShopFilter] = useState<string>('all');
  const [staffFilter, setStaffFilter] = useState<string>('all');
  const [onlyMine, setOnlyMine] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState<Transfer | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const printRef = useRef<HTMLDivElement>(null);
  
  const businessId = store?.id;
  const isProduction = roles.some(r => r.role.toLowerCase() === 'production');
  const isManagerial = roles.some(r => ['super_admin', 'store_owner', 'admin'].includes(r.role.toLowerCase()));
  const canAccess = isProduction || isManagerial;

  const { data: allShops = [] } = useQuery({
    queryKey: ['all-shops', businessId],
    queryFn: async () => {
      if (!businessId) return [];
      const { data, error } = await supabase
        .from('shops')
        .select('id, name')
        .eq('business_id', businessId)
        .eq('is_active', true);
      if (error) throw error;
      return data;
    },
    enabled: !!businessId,
  });

  const { data: transfers = [], isLoading: isTransfersLoading } = useQuery({
    queryKey: ['production-transfer-history', businessId, dateFilter, dateRange, statusFilter, shopFilter, staffFilter, onlyMine, canAccess, allShops.length],
    queryFn: async () => {
      if (!businessId || !canAccess || allShops.length === 0) return [];

      const productionShop = allShops?.find(s => s.name.toUpperCase() === 'PRODUCTION');
      if (!productionShop) return [];

      let query = supabase
        .from('stock_transfers')
        .select(`
          *,
          product:products (name),
          from_shop:shops!stock_transfers_from_shop_id_fkey (name),
          to_shop:shops!stock_transfers_to_shop_id_fkey (name)
        `)
        .eq('from_shop_id', productionShop.id)
        .order('created_at', { ascending: false });

      // Apply "Only Mine" filter
      if (onlyMine && user?.id) {
        query = query.eq('requested_by', user.id);
      }

      // Apply staff filter
      if (staffFilter !== 'all') {
        query = query.eq('requested_by', staffFilter);
      }

      // Apply shop filter
      if (shopFilter !== 'all') {
        query = query.eq('to_shop_id', shopFilter);
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

      // Apply status filter
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Transfer[];
    },
    enabled: !!businessId && (isProduction || isManagerial),
  });

  // Fetch names for transfers
  const userIds = useMemo(() => {
    const ids = new Set<string>();
    transfers.forEach(t => {
      if (t.requested_by) ids.add(t.requested_by);
      if (t.approved_by) ids.add(t.approved_by);
    });
    return Array.from(ids);
  }, [transfers]);

  const { data: profiles = {} } = useQuery({
    queryKey: ['profiles', userIds],
    queryFn: async () => {
      if (userIds.length === 0) return {};
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', userIds);
      if (error) throw error;
      
      return data.reduce((acc: Record<string, string>, p) => {
        acc[p.id] = p.name;
        return acc;
      }, {});
    },
    enabled: userIds.length > 0,
  });

  const paginatedTransfers = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return transfers.slice(start, start + ITEMS_PER_PAGE);
  }, [transfers, currentPage]);

  const totalPages = Math.ceil(transfers.length / ITEMS_PER_PAGE);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Production_Transfer_History_${format(new Date(), 'yyyy-MM-dd')}`,
  });

  const handleExportCSV = () => {
    if (transfers.length === 0) return;

    const headers = ['Date', 'Product', 'From', 'To', 'Quantity', 'Status', 'Requested By', 'Notes'];
    const csvData = transfers.map(t => [
      format(new Date(t.created_at), 'yyyy-MM-dd HH:mm'),
      t.product.name,
      t.from_shop.name,
      t.to_shop.name,
      t.quantity,
      t.status,
      profiles[t.requested_by] || 'System',
      t.notes || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `production_transfers_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'in_transit': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Pending';
      case 'approved': return 'Approved';
      case 'rejected': return 'Rejected';
      case 'in_transit': return 'In Transit';
      case 'completed': return 'Completed';
      default: return status;
    }
  };

  if (!isProduction && !isManagerial) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Transfer History
          </CardTitle>
          <CardDescription>
            This feature is only available for Production or Management users
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Production Transfer History
          </CardTitle>
          <CardDescription>
            View all transfers initiated from Production
          </CardDescription>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint} disabled={transfers.length === 0}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={transfers.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex flex-col space-y-4 mb-6">
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
              <Label htmlFor="status-filter">Status</Label>
              <Select value={statusFilter} onValueChange={(val) => { setStatusFilter(val); setCurrentPage(1); }}>
                <SelectTrigger id="status-filter">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="in_transit">In Transit</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col space-y-2">
              <Label htmlFor="shop-filter">Destination Shop</Label>
              <Select value={shopFilter} onValueChange={(val) => { setShopFilter(val); setCurrentPage(1); }}>
                <SelectTrigger id="shop-filter">
                  <SelectValue placeholder="All Shops" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Shops</SelectItem>
                  {allShops.filter(s => s.name.toUpperCase() !== 'PRODUCTION').map(shop => (
                    <SelectItem key={shop.id} value={shop.id}>{shop.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col space-y-2">
              <Label htmlFor="staff-filter">Requested By</Label>
              <Select value={staffFilter} onValueChange={(val) => { setStaffFilter(val); setCurrentPage(1); }}>
                <SelectTrigger id="staff-filter">
                  <SelectValue placeholder="All Staff" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Staff</SelectItem>
                  {Object.entries(profiles).map(([id, name]) => (
                    <SelectItem key={id} value={id}>{name as string}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Switch
                id="only-mine"
                checked={onlyMine}
                onCheckedChange={(val) => { setOnlyMine(val); setCurrentPage(1); }}
              />
              <Label htmlFor="only-mine" className="flex items-center gap-2 cursor-pointer">
                <User className="h-4 w-4" />
                Only my transfers
              </Label>
            </div>
          </div>

          {dateFilter === 'custom' && (
            <div className="flex flex-col space-y-2 animate-in fade-in slide-in-from-top-2">
              <Label>Select Date Range</Label>
              <CalendarDateRangePicker 
                date={dateRange} 
                onDateChange={(range) => { setDateRange(range); setCurrentPage(1); }} 
              />
            </div>
          )}
        </div>

        {/* Transfer List */}
        <div ref={printRef} className="space-y-4">
          <div className="hidden print:block mb-6">
            <h1 className="text-2xl font-bold">Production Transfer History</h1>
            <p className="text-muted-foreground">Generated on {format(new Date(), 'PPP p')}</p>
          </div>
          {isTransfersLoading ? (
            <div className="text-center py-8">Loading transfers...</div>
          ) : transfers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No transfers found for the selected criteria
            </div>
          ) : (
            <>
              {paginatedTransfers.map((transfer) => (
                <div key={transfer.id} className="border rounded-lg p-4 hover:bg-muted/30 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Package className="h-4 w-4" />
                        <span className="font-medium">{transfer.product.name}</span>
                        <Badge className={getStatusColor(transfer.status)}>
                          {getStatusText(transfer.status)}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                        <span>{transfer.from_shop.name}</span>
                        <ArrowRight className="h-3 w-3" />
                        <span>{transfer.to_shop.name}</span>
                        <span>•</span>
                        <span>{transfer.quantity} units</span>
                      </div>
                      
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <LucideCalendar className="h-3 w-3" />
                            <span>{format(new Date(transfer.created_at), 'MMM dd, yyyy HH:mm')}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            <span>By: {profiles[transfer.requested_by] || 'System'}</span>
                          </div>
                        </div>
                    </div>
                    
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => setSelectedTransfer(transfer)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages} ({transfers.length} total)
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </CardContent>

      {/* Details Dialog */}
      <Dialog open={!!selectedTransfer} onOpenChange={(open) => !open && setSelectedTransfer(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Transfer Details</DialogTitle>
            <DialogDescription>
              Detailed information about this stock transfer.
            </DialogDescription>
          </DialogHeader>

          {selectedTransfer && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="col-span-2 flex justify-between items-center p-3 bg-muted rounded-lg">
                  <span className="font-semibold text-base">{selectedTransfer.product.name}</span>
                  <Badge className={getStatusColor(selectedTransfer.status)}>
                    {getStatusText(selectedTransfer.status)}
                  </Badge>
                </div>
                
                <div>
                  <p className="text-muted-foreground">Quantity</p>
                  <p className="font-medium text-lg">{selectedTransfer.quantity} units</p>
                </div>
                
                <div>
                  <p className="text-muted-foreground">Date</p>
                  <p className="font-medium">{format(new Date(selectedTransfer.created_at), "PPP p")}</p>
                </div>

                <div>
                  <p className="text-muted-foreground">From Shop</p>
                  <p className="font-medium">{selectedTransfer.from_shop.name}</p>
                </div>

                <div>
                  <p className="text-muted-foreground">To Shop</p>
                  <p className="font-medium">{selectedTransfer.to_shop.name}</p>
                </div>

                <div>
                  <p className="text-muted-foreground">Requested By</p>
                  <p className="font-medium">{profiles[selectedTransfer.requested_by] || 'System'}</p>
                </div>

                {selectedTransfer.approved_by && (
                  <div>
                    <p className="text-muted-foreground">Approved By</p>
                    <p className="font-medium">{profiles[selectedTransfer.approved_by] || 'Manager'}</p>
                  </div>
                )}

                <div className="col-span-2">
                  <p className="text-muted-foreground">Notes</p>
                  <p className="font-medium whitespace-pre-wrap bg-muted/50 p-2 rounded">
                    {selectedTransfer.notes || "No notes provided"}
                  </p>
                </div>
              </div>
            </div>
          )}
          
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setSelectedTransfer(null)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
