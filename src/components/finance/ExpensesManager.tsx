import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStoreContext } from '@/contexts/StoreContext';
import { formatCurrency } from '@/utils/currency';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { ExpenseFormDialog, ExpenseRow } from '@/components/finance/ExpenseFormDialog';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

type ShopRow = { id: string; name: string };

type ExpenseListRow = ExpenseRow & {
  shop?: { name: string } | null;
  account?: { name: string } | null;
};

const getErrorMessage = (err: unknown): string => {
  if (err instanceof Error) return err.message;
  if (err && typeof err === 'object' && 'message' in err) {
    const msg = (err as { message?: unknown }).message;
    if (typeof msg === 'string') return msg;
  }
  return 'Unknown error';
};

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    pending: 'bg-warning text-warning-foreground',
    approved: 'bg-success text-success-foreground',
    rejected: 'bg-destructive text-destructive-foreground',
  };
  return colors[status] || 'bg-secondary';
};

export function ExpensesManager({
  title = 'Expenses',
  description = 'Manage expense records',
  shopIds,
  dateRange,
}: {
  title?: string;
  description?: string;
  shopIds?: string[];
  dateRange?: { start: Date; end: Date };
}) {
  const { store } = useStoreContext();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const currency = useMemo(() => (store?.currency || 'RWF').trim().toUpperCase(), [store?.currency]);

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<ExpenseListRow | null>(null);
  const [deleteExpense, setDeleteExpense] = useState<ExpenseListRow | null>(null);

  const [status, setStatus] = useState<string>('all');
  const [category, setCategory] = useState<string>('all');
  const [shopId, setShopId] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const pageSize = 50;

  const { data: shops = [] } = useQuery({
    queryKey: ['shops', store?.id],
    queryFn: async () => {
      if (!store?.id) return [] as ShopRow[];
      const { data, error } = await supabase
        .from('shops')
        .select('id, name')
        .eq('is_active', true)
        .eq('business_id', store.id)
        .order('name');
      if (error) throw error;
      return (data ?? []) as ShopRow[];
    },
    enabled: !!store?.id,
  });

  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ['expense-list', store?.id, shopIds, dateRange?.start?.toISOString(), dateRange?.end?.toISOString(), status, category, shopId, search, page],
    queryFn: async () => {
      if (!store?.id) return [] as ExpenseListRow[];

      let query = supabase
        .from('expenses')
        .select(
          `
          id,
          business_id,
          shop_id,
          category,
          amount,
          currency,
          description,
          receipt_url,
          expense_date,
          recorded_by,
          approved_by,
          status,
          rejected_reason,
          account_id,
          created_at,
          updated_at,
          deleted_at,
          shop:shops(name),
          account:financial_accounts(name)
        `
        )
        .eq('business_id', store.id)
        .is('deleted_at', null)
        .order('expense_date', { ascending: false })
        .range(page * pageSize, page * pageSize + pageSize - 1);

      if (shopIds && shopIds.length > 0) {
        const inList = shopIds.join(',');
        query = query.or(`shop_id.in.(${inList}),shop_id.is.null`);
      }

      if (dateRange) {
        query = query
          .gte('expense_date', dateRange.start.toISOString().split('T')[0])
          .lte('expense_date', dateRange.end.toISOString().split('T')[0]);
      }

      if (status !== 'all') query = query.eq('status', status);
      if (category !== 'all') query = query.eq('category', category);
      if (shopId !== 'all') {
        if (shopId === 'general') query = query.is('shop_id', null);
        else query = query.eq('shop_id', shopId);
      }

      if (search.trim()) {
        const q = search.trim().replaceAll('%', '');
        query = query.or(`description.ilike.%${q}%,category.ilike.%${q}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as ExpenseListRow[];
    },
    enabled: !!store?.id,
    placeholderData: (prev) => prev,
  });

  const softDeleteMutation = useMutation({
    mutationFn: async (expense: ExpenseListRow) => {
      if (!store?.id) throw new Error('No active business selected');
      const { error } = await supabase
        .from('expenses')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', expense.id)
        .eq('business_id', store.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-list'] });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['tenant-finance-expenses'] });
      toast({ title: 'Expense deleted' });
      setDeleteExpense(null);
    },
    onError: (err) => {
      toast({ title: 'Error', description: getErrorMessage(err), variant: 'destructive' });
    },
  });

  const categories = useMemo(() => {
    const set = new Set<string>();
    expenses.forEach((e) => {
      if (e.category) set.add(e.category);
    });
    return Array.from(set).sort();
  }, [expenses]);

  const totalAmount = useMemo(() => {
    return expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  }, [expenses]);

  return (
    <>
      <Card>
        <CardHeader className="gap-2">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Record Expense
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <div className="space-y-1">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Shop</Label>
              <Select value={shopId} onValueChange={setShopId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                  {shops.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Search</Label>
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Description or category" />
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : expenses.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">No expenses found</div>
          ) : (
            <>
              <div className="mb-4 flex items-center justify-between text-sm text-muted-foreground">
                <div>
                  Page {page + 1} • {expenses.length} items
                </div>
                <div className="font-medium">{formatCurrency(totalAmount, currency)}</div>
              </div>
              <div className="rounded-md border overflow-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-card z-10">
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Shop</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expenses.map((e) => (
                      <TableRow key={e.id}>
                        <TableCell className="whitespace-nowrap">{format(new Date(e.expense_date), 'MMM dd, yyyy')}</TableCell>
                        <TableCell className="max-w-[180px] truncate">{e.shop?.name || 'General'}</TableCell>
                        <TableCell className="max-w-[160px] truncate">{e.category}</TableCell>
                        <TableCell className="max-w-[420px] truncate" title={e.description}>
                          {e.description}
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(String(e.status))}>{String(e.status)}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(Number(e.amount), e.currency || currency)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedExpense(e);
                                setEditOpen(true);
                              }}
                              aria-label="Edit expense"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteExpense(e)}
                              aria-label="Delete expense"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <Button variant="outline" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>
                  Previous
                </Button>
                <Button variant="outline" onClick={() => setPage((p) => p + 1)} disabled={expenses.length < pageSize}>
                  Next
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <ExpenseFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Record New Expense"
        description="Add a new expense record for tracking"
      />

      <ExpenseFormDialog
        open={editOpen}
        onOpenChange={(o) => {
          setEditOpen(o);
          if (!o) setSelectedExpense(null);
        }}
        initialExpense={selectedExpense}
        title="Edit Expense"
        description="Update expense details"
      />

      <AlertDialog
        open={!!deleteExpense}
        onOpenChange={(open) => {
          if (!open) setDeleteExpense(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete expense</AlertDialogTitle>
            <AlertDialogDescription>This will remove the expense from lists. Financial summaries will be adjusted.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={() => {
                if (deleteExpense) softDeleteMutation.mutate(deleteExpense);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
