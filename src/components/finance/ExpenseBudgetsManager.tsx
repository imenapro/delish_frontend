import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStoreContext } from '@/contexts/StoreContext';
import { formatCurrency } from '@/utils/currency';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Pencil, Plus } from 'lucide-react';
import { format } from 'date-fns';

type BudgetRow = {
  id: string;
  business_id: string;
  shop_id: string | null;
  category: string;
  period_start: string;
  currency: string;
  limit_amount: number;
  spent_amount: number;
};

type ShopRow = { id: string; name: string };

const getErrorMessage = (err: unknown): string => {
  if (err instanceof Error) return err.message;
  if (err && typeof err === 'object' && 'message' in err) {
    const msg = (err as { message?: unknown }).message;
    if (typeof msg === 'string') return msg;
  }
  return 'Unknown error';
};

const toMonthStart = (dateStr: string) => {
  const d = new Date(dateStr);
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
};

const ALL_SHOPS_VALUE = '__all_shops__';

export function ExpenseBudgetsManager() {
  const { store } = useStoreContext();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const currency = useMemo(() => (store?.currency || 'RWF').trim().toUpperCase(), [store?.currency]);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<BudgetRow | null>(null);

  const [shopId, setShopId] = useState(ALL_SHOPS_VALUE);
  const [category, setCategory] = useState('');
  const [month, setMonth] = useState(toMonthStart(new Date().toISOString()));
  const [limitAmount, setLimitAmount] = useState('0');
  const [budgetCurrency, setBudgetCurrency] = useState(currency);

  const reset = () => {
    setShopId(ALL_SHOPS_VALUE);
    setCategory('');
    setMonth(toMonthStart(new Date().toISOString()));
    setLimitAmount('0');
    setBudgetCurrency(currency);
    setEditing(null);
  };

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

  const { data: budgets = [], isLoading } = useQuery({
    queryKey: ['expense-budgets', store?.id],
    queryFn: async () => {
      if (!store?.id) return [] as BudgetRow[];
      const { data, error } = await supabase
        .from('expense_budgets')
        .select('id, business_id, shop_id, category, period_start, currency, limit_amount, spent_amount')
        .eq('business_id', store.id)
        .order('period_start', { ascending: false });
      if (error) throw error;
      return (data ?? []) as BudgetRow[];
    },
    enabled: !!store?.id,
  });

  const shopNameById = useMemo(() => new Map(shops.map((s) => [s.id, s.name])), [shops]);

  const upsertMutation = useMutation({
    mutationFn: async () => {
      if (!store?.id) throw new Error('No active business selected');
      if (!category.trim()) throw new Error('Category is required');

      const limit = Number(limitAmount);
      if (!Number.isFinite(limit) || limit < 0) throw new Error('Limit must be 0 or greater');

      const payload: Record<string, unknown> = {
        business_id: store.id,
        shop_id: shopId === ALL_SHOPS_VALUE ? null : shopId,
        category: category.trim(),
        period_start: toMonthStart(month),
        currency: budgetCurrency.trim().toUpperCase(),
        limit_amount: limit,
      };

      if (!editing) {
        const { error } = await supabase.from('expense_budgets').insert([payload]);
        if (error) throw error;
        return;
      }

      const { error } = await supabase.from('expense_budgets').update(payload).eq('id', editing.id).eq('business_id', store.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-budgets'] });
      toast({ title: editing ? 'Budget updated' : 'Budget created' });
      setOpen(false);
      reset();
    },
    onError: (err) => {
      toast({ title: 'Error', description: getErrorMessage(err), variant: 'destructive' });
    },
  });

  return (
    <>
      <Card>
        <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Budgets</CardTitle>
            <CardDescription>Track monthly spending limits by category</CardDescription>
          </div>
          <Button
            onClick={() => {
              reset();
              setOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            New Budget
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : budgets.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">No budgets configured</div>
          ) : (
            <div className="rounded-md border overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-card z-10">
                  <TableRow>
                    <TableHead>Period</TableHead>
                    <TableHead>Shop</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Limit</TableHead>
                    <TableHead className="text-right">Spent</TableHead>
                    <TableHead className="text-right">Remaining</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {budgets.map((b) => {
                    const remaining = Math.max(Number(b.limit_amount) - Number(b.spent_amount), 0);
                    return (
                      <TableRow key={b.id}>
                        <TableCell className="whitespace-nowrap">{format(new Date(b.period_start), 'MMM yyyy')}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{b.shop_id ? shopNameById.get(b.shop_id) || b.shop_id : 'All shops'}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{b.category}</TableCell>
                        <TableCell className="text-right font-semibold">{formatCurrency(Number(b.limit_amount), b.currency)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(Number(b.spent_amount), b.currency)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(remaining, b.currency)}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditing(b);
                              setShopId(b.shop_id || ALL_SHOPS_VALUE);
                              setCategory(b.category || '');
                              setMonth(toMonthStart(b.period_start));
                              setLimitAmount(String(b.limit_amount ?? 0));
                              setBudgetCurrency(b.currency || currency);
                              setOpen(true);
                            }}
                            aria-label="Edit budget"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) reset();
        }}
      >
        <DialogContent className="max-h-[85vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Budget' : 'Create Budget'}</DialogTitle>
            <DialogDescription>Budgets update automatically as approved expenses change</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Period (Month)</Label>
                <Input type="month" value={month.slice(0, 7)} onChange={(e) => setMonth(`${e.target.value}-01`)} />
              </div>
              <div className="space-y-2">
                <Label>Shop</Label>
                <Select value={shopId} onValueChange={setShopId}>
                  <SelectTrigger>
                    <SelectValue placeholder="All shops" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_SHOPS_VALUE}>All shops</SelectItem>
                    {shops.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Category</Label>
                <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. rent, utilities" />
              </div>
              <div className="space-y-2">
                <Label>Currency</Label>
                <Input value={budgetCurrency} onChange={(e) => setBudgetCurrency(e.target.value)} placeholder={currency} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Limit Amount</Label>
              <Input type="number" step="0.01" min="0" value={limitAmount} onChange={(e) => setLimitAmount(e.target.value)} />
            </div>

            <Button onClick={() => upsertMutation.mutate()} className="w-full" disabled={upsertMutation.isPending}>
              {upsertMutation.isPending ? 'Saving...' : editing ? 'Save Changes' : 'Create Budget'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
