import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { TenantPageWrapper } from '@/components/tenant/TenantPageWrapper';
import { supabase } from '@/integrations/supabase/client';
import { useStoreContext } from '@/contexts/StoreContext';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Clock,
  Check,
  AlertCircle,
  Phone,
  Tag,
  DollarSign,
  Calendar,
  ChefHat,
} from 'lucide-react';
import { formatCurrency, DEFAULT_SYSTEM_CURRENCY } from '@/utils/currency';
import { format } from 'date-fns';

interface CommandWithItems {
  id: string;
  order_code: string;
  customer_name: string;
  customer_phone: string;
  total_amount: number;
  advance_paid: number;
  remaining_due: number;
  status: string;
  order_type: string;
  created_at: string;
  items?: {
    name: string;
    quantity: number;
    unit_price: number;
  }[];
}

export default function CommandsDashboard() {
  const { store } = useStoreContext();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const currency = store?.currency || DEFAULT_SYSTEM_CURRENCY;

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // Fetch all pending commands
  const { data: commands = [], isLoading, error } = useQuery({
    queryKey: ['production-commands', store?.id],
    queryFn: async () => {
      if (!store?.id) return [];

      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          order_code,
          customer_name,
          customer_phone,
          total_amount,
          advance_paid,
          remaining_due,
          status,
          order_type,
          created_at,
          order_items (
            product:products(name),
            quantity,
            unit_price
          )
        `)
        .eq('shop_id_origin', store.id)
        .eq('order_type', 'command')
        .in('status', ['pending', 'confirmed'])
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data as CommandWithItems[];
    },
    enabled: !!store?.id,
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  // Update command status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({
      orderId,
      newStatus,
    }: {
      orderId: string;
      newStatus: string;
    }) => {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production-commands'] });
      toast.success('Command status updated');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update status');
    },
  });

  // Filter commands
  const filteredCommands = commands.filter(cmd => {
    const matchesSearch =
      cmd.order_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cmd.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cmd.customer_phone.includes(searchTerm);

    const matchesStatus =
      filterStatus === 'all' || cmd.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  // Statistics
  const stats = {
    total: commands.length,
    pending: commands.filter(c => c.status === 'pending').length,
    ready: commands.filter(c => c.status === 'confirmed').length,
    totalAdvance: commands.reduce((sum, c) => sum + c.advance_paid, 0),
    totalRemaining: commands.reduce((sum, c) => sum + c.remaining_due, 0),
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300';
      case 'confirmed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'confirmed':
        return <Check className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  return (
    <TenantPageWrapper>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <ChefHat className="h-8 w-8" />
              Production Dashboard
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage special commands and advance payments
            </p>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Commands
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.pending} pending, {stats.ready} ready
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Pending
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">{stats.pending}</div>
              <p className="text-xs text-muted-foreground mt-1">Awaiting preparation</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Ready for Pickup
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.ready}</div>
              <p className="text-xs text-muted-foreground mt-1">Awaiting payment</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Advance Collected
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {formatCurrency(stats.totalAdvance, currency)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Already received</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Outstanding
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {formatCurrency(stats.totalRemaining, currency)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Due on pickup</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Search & Filter</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-3">
              <Input
                placeholder="Search by order code, customer name, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="sm:flex-1"
              />
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full sm:w-44">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Commands</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="confirmed">Ready for Pickup</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Showing {filteredCommands.length} of {commands.length} commands
            </p>
          </CardContent>
        </Card>

        {/* Commands Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Active Commands</CardTitle>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="p-4 bg-destructive/10 text-destructive rounded-lg mb-4">
                Error loading commands: {error.message}
              </div>
            )}

            {isLoading ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Loading commands...</p>
              </div>
            ) : filteredCommands.length === 0 ? (
              <div className="text-center py-8">
                <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">No commands found</p>
              </div>
            ) : (
              <ScrollArea className="w-full overflow-x-auto">
                <div className="min-w-full">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="whitespace-nowrap">Order Code</TableHead>
                        <TableHead className="whitespace-nowrap">Customer</TableHead>
                        <TableHead className="whitespace-nowrap">Phone</TableHead>
                        <TableHead className="whitespace-nowrap">Items</TableHead>
                        <TableHead className="whitespace-nowrap text-right">Total</TableHead>
                        <TableHead className="whitespace-nowrap text-right">Advance</TableHead>
                        <TableHead className="whitespace-nowrap text-right">Due</TableHead>
                        <TableHead className="whitespace-nowrap">Created</TableHead>
                        <TableHead className="whitespace-nowrap">Status</TableHead>
                        <TableHead className="whitespace-nowrap">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCommands.map((command) => (
                        <TableRow key={command.id}>
                          <TableCell className="font-mono font-semibold">
                            <span className="text-primary">{command.order_code}</span>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{command.customer_name}</div>
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {command.customer_phone}
                          </TableCell>
                          <TableCell className="text-sm">
                            {command.order_items?.map((item, idx) => (
                              <div key={idx}>
                                {item.quantity}x {item.product?.name}
                              </div>
                            ))}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(command.total_amount, currency)}
                          </TableCell>
                          <TableCell className="text-right text-green-600 dark:text-green-400 font-medium">
                            {formatCurrency(command.advance_paid, currency)}
                          </TableCell>
                          <TableCell className="text-right text-orange-600 dark:text-orange-400 font-medium">
                            {formatCurrency(command.remaining_due, currency)}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {format(new Date(command.created_at), 'MMM dd, HH:mm')}
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={`${getStatusColor(
                                command.status
                              )} flex items-center gap-1 w-fit`}
                            >
                              {getStatusIcon(command.status)}
                              {command.status === 'pending'
                                ? 'Pending'
                                : 'Ready'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {command.status === 'pending' ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  updateStatusMutation.mutate({
                                    orderId: command.id,
                                    newStatus: 'confirmed',
                                  })
                                }
                                disabled={updateStatusMutation.isPending}
                                className="text-xs"
                              >
                                Mark Ready
                              </Button>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                Awaiting payment
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Payment Tracking Info */}
        <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Payment Tracking Info
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm font-medium">How it works:</p>
              <ul className="text-sm text-muted-foreground space-y-2 mt-2 ml-4">
                <li>✓ Customers pay advance when ordering (shown in this dashboard)</li>
                <li>✓ When ready, mark command as "Ready for Pickup"</li>
                <li>✓ Staff at POS handles final payment when customer arrives</li>
                <li>✓ View command payment details in Finance module</li>
              </ul>
            </div>
            <Separator />
            <div className="text-sm">
              <span className="font-medium">Total Cash Flow:</span>
              <div className="mt-2 space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Advance Collected:</span>
                  <span className="font-semibold text-green-600">
                    {formatCurrency(stats.totalAdvance, currency)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Remaining Due:</span>
                  <span className="font-semibold text-orange-600">
                    {formatCurrency(stats.totalRemaining, currency)}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="font-medium">Total Order Value:</span>
                  <span className="font-bold">
                    {formatCurrency(
                      stats.totalAdvance + stats.totalRemaining,
                      currency
                    )}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </TenantPageWrapper>
  );
}
