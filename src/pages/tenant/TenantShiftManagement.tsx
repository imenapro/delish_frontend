import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { TenantPageWrapper } from '@/components/tenant/TenantPageWrapper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useStoreContext } from '@/contexts/StoreContext';
import { format, formatDistanceToNow } from 'date-fns';
import { Clock, Users, DollarSign, AlertCircle, CheckCircle, Eye, Printer, Loader2 } from 'lucide-react';
import { ViewShiftReportDialog } from '@/components/shifts/ViewShiftReportDialog';
import { generateShiftReportPDF } from '@/utils/pdfGenerator';
import { toast } from 'sonner';

export default function TenantShiftManagement() {
  const { store } = useStoreContext();
  const [selectedShop, setSelectedShop] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [printingSessionId, setPrintingSessionId] = useState<string | null>(null);

  const handleViewReport = (session: any) => {
    setSelectedSession(session);
    setViewDialogOpen(true);
  };

  const handlePrintReport = async (session: any) => {
    setPrintingSessionId(session.id);
    try {
        // Fetch orders for this session
        const { data: shiftOrders, error } = await supabase
            .from('orders')
            .select(`
              *,
              order_items (
                id,
                quantity,
                unit_price,
                subtotal,
                product:products (name)
              )
            `)
            .eq('shop_id_origin', session.shop_id)
            .eq('seller_id', session.user_id)
            .gte('created_at', session.opened_at)
            .lte('created_at', session.closed_at || new Date().toISOString())
            .order('created_at', { ascending: false });

        if (error) throw error;

        const expectedCash = session.expected_cash ?? (session.opening_cash + session.total_sales);
        const closingCash = session.closing_cash ?? 0;

        await generateShiftReportPDF({
            session,
            shiftOrders: shiftOrders || [],
            closingCash,
            expectedCash,
            description: session.notes || undefined
        });
    } catch (error) {
        console.error("Print Error:", error);
        toast.error("Failed to generate report PDF");
    } finally {
        setPrintingSessionId(null);
    }
  };

  // Fetch shops
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

  // Fetch all POS sessions
  const { data: sessions = [], isLoading: sessionsLoading } = useQuery({
    queryKey: ['pos-sessions', store?.id, selectedShop, dateFilter],
    queryFn: async () => {
      if (!store?.id) return [];
      
      let query = supabase
        .from('pos_sessions')
        .select(`
          *,
          user:profiles(id, name),
          shop:shops(id, name)
        `)
        .eq('business_id', store.id)
        .order('opened_at', { ascending: false });

      if (selectedShop !== 'all') {
        query = query.eq('shop_id', selectedShop);
      }

      if (dateFilter) {
        query = query.gte('opened_at', `${dateFilter}T00:00:00`);
        query = query.lte('opened_at', `${dateFilter}T23:59:59`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!store?.id,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch active shifts
  const { data: activeShifts = [] } = useQuery({
    queryKey: ['active-shifts', store?.id],
    queryFn: async () => {
      if (!store?.id) return [];
      const { data, error } = await supabase
        .from('pos_sessions')
        .select(`
          *,
          user:profiles(id, name),
          shop:shops(id, name)
        `)
        .eq('business_id', store.id)
        .eq('status', 'open')
        .order('opened_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!store?.id,
    refetchInterval: 15000, // Refresh every 15 seconds
  });

  // Summary stats
  const totalSales = sessions.filter(s => s.status === 'closed').reduce((sum, s) => sum + (s.total_sales || 0), 0);
  const totalOrders = sessions.filter(s => s.status === 'closed').reduce((sum, s) => sum + (s.total_orders || 0), 0);
  const cashVariance = sessions.filter(s => s.status === 'closed').reduce((sum, s) => {
    const expected = s.expected_cash || 0;
    const actual = s.closing_cash || 0;
    return sum + (actual - expected);
  }, 0);

  const getShiftDuration = (openedAt: string, closedAt?: string) => {
    const start = new Date(openedAt);
    const end = closedAt ? new Date(closedAt) : new Date();
    const diffMs = end.getTime() - start.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  return (
    <TenantPageWrapper
      title="Shift Management"
      description="Monitor all POS shifts across your shops"
    >
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Shifts</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeShifts.length}</div>
            <p className="text-xs text-muted-foreground">Currently open</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Sales</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSales.toLocaleString()} RWF</div>
            <p className="text-xs text-muted-foreground">{totalOrders} orders</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Shifts Today</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sessions.length}</div>
            <p className="text-xs text-muted-foreground">Total shifts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cash Variance</CardTitle>
            {cashVariance === 0 ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <AlertCircle className="h-4 w-4 text-yellow-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${cashVariance > 0 ? 'text-green-600' : cashVariance < 0 ? 'text-red-600' : ''}`}>
              {cashVariance > 0 ? '+' : ''}{cashVariance.toLocaleString()} RWF
            </div>
            <p className="text-xs text-muted-foreground">Overall difference</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="active" className="space-y-4">
        <TabsList>
          <TabsTrigger value="active">
            Active Shifts
            {activeShifts.length > 0 && (
              <Badge variant="secondary" className="ml-2">{activeShifts.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="history">Shift History</TabsTrigger>
        </TabsList>

        {/* Active Shifts Tab */}
        <TabsContent value="active">
          <Card>
            <CardHeader>
              <CardTitle>Currently Open Shifts</CardTitle>
            </CardHeader>
            <CardContent>
              {activeShifts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No active shifts at the moment</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Staff Member</TableHead>
                      <TableHead>Shop</TableHead>
                      <TableHead>Started</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Opening Cash</TableHead>
                      <TableHead>Sales</TableHead>
                      <TableHead>Orders</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeShifts.map((shift) => (
                      <TableRow key={shift.id}>
                        <TableCell className="font-medium">{shift.user?.name || 'Unknown'}</TableCell>
                        <TableCell>{shift.shop?.name || 'Unknown'}</TableCell>
                        <TableCell>{format(new Date(shift.opened_at), 'HH:mm')}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{getShiftDuration(shift.opened_at)}</Badge>
                        </TableCell>
                        <TableCell>{(shift.opening_cash || 0).toLocaleString()} RWF</TableCell>
                        <TableCell>{(shift.total_sales || 0).toLocaleString()} RWF</TableCell>
                        <TableCell>{shift.total_orders || 0}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <CardTitle>Shift History</CardTitle>
                <div className="flex gap-2">
                  <Select value={selectedShop} onValueChange={setSelectedShop}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="All shops" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Shops</SelectItem>
                      {shops.map((shop) => (
                        <SelectItem key={shop.id} value={shop.id}>{shop.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="date"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="w-40"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {sessionsLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : sessions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No shifts found for the selected filters</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Staff</TableHead>
                      <TableHead>Shop</TableHead>
                      <TableHead>Started</TableHead>
                      <TableHead>Ended</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Sales</TableHead>
                      <TableHead>Orders</TableHead>
                      <TableHead>Variance</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sessions.map((session) => {
                      const variance = (session.closing_cash || 0) - (session.expected_cash || 0);
                      return (
                        <TableRow key={session.id}>
                          <TableCell className="font-medium">{session.user?.name || 'Unknown'}</TableCell>
                          <TableCell>{session.shop?.name || 'Unknown'}</TableCell>
                          <TableCell>{format(new Date(session.opened_at), 'HH:mm')}</TableCell>
                          <TableCell>
                            {session.closed_at ? format(new Date(session.closed_at), 'HH:mm') : '-'}
                          </TableCell>
                          <TableCell>{getShiftDuration(session.opened_at, session.closed_at)}</TableCell>
                          <TableCell>{(session.total_sales || 0).toLocaleString()} RWF</TableCell>
                          <TableCell>{session.total_orders || 0}</TableCell>
                          <TableCell>
                            {session.status === 'closed' && (
                              <span className={variance > 0 ? 'text-green-600' : variance < 0 ? 'text-red-600' : ''}>
                                {variance > 0 ? '+' : ''}{variance.toLocaleString()} RWF
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant={session.status === 'open' ? 'secondary' : 'outline'}>
                              {session.status === 'open' ? 'Active' : 'Closed'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                             <div className="flex justify-end gap-2">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    title="View Report"
                                    onClick={() => handleViewReport(session)}
                                >
                                    <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    title="Print Report"
                                    onClick={() => handlePrintReport(session)}
                                    disabled={printingSessionId === session.id}
                                >
                                    {printingSessionId === session.id ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Printer className="h-4 w-4" />
                                    )}
                                </Button>
                             </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ViewShiftReportDialog
        open={viewDialogOpen}
        onOpenChange={setViewDialogOpen}
        session={selectedSession}
      />
    </TenantPageWrapper>
  );
}
