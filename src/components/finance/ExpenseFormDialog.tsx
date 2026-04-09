import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useStoreContext } from '@/contexts/StoreContext';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

export type ExpenseStatus = 'pending' | 'approved' | 'rejected';

export type ExpenseRow = {
  id: string;
  business_id?: string | null;
  shop_id?: string | null;
  category: string;
  amount: number;
  currency?: string | null;
  description: string;
  receipt_url?: string | null;
  expense_date: string;
  recorded_by?: string | null;
  approved_by?: string | null;
  status: ExpenseStatus | string;
  rejected_reason?: string | null;
  account_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  deleted_at?: string | null;
};

type FinancialAccountRow = {
  id: string;
  name: string;
  type: string;
  currency: string;
  is_active: boolean;
};

type ShopRow = {
  id: string;
  name: string;
};

type FormState = {
  shop_id: string;
  category: string;
  amount: string;
  description: string;
  expense_date: string;
  status: ExpenseStatus;
  rejected_reason: string;
  account_id: string;
  receipt_url: string;
};

const DEFAULT_CATEGORIES: Array<{ value: string; label: string }> = [
  { value: 'utilities', label: 'Utilities' },
  { value: 'supplies', label: 'Supplies' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'rent', label: 'Rent' },
  { value: 'transportation', label: 'Transportation' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'other', label: 'Other' },
];

const SHOP_GENERAL_VALUE = '__general__';
const ACCOUNT_NONE_VALUE = '__none__';

const todayDate = () => new Date().toISOString().split('T')[0];

const getErrorMessage = (err: unknown): string => {
  if (err instanceof Error) return err.message;
  if (err && typeof err === 'object' && 'message' in err) {
    const msg = (err as { message?: unknown }).message;
    if (typeof msg === 'string') return msg;
  }
  return 'Unknown error';
};

export function ExpenseFormDialog({
  open,
  onOpenChange,
  initialExpense,
  title,
  description,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialExpense?: ExpenseRow | null;
  title: string;
  description?: string;
}) {
  const { user } = useAuth();
  const { store } = useStoreContext();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const currency = useMemo(() => (store?.currency || 'RWF').trim().toUpperCase(), [store?.currency]);
  const isEdit = !!initialExpense?.id;

  const [formData, setFormData] = useState<FormState>({
    shop_id: SHOP_GENERAL_VALUE,
    category: '',
    amount: '',
    description: '',
    expense_date: todayDate(),
    status: 'pending',
    rejected_reason: '',
    account_id: ACCOUNT_NONE_VALUE,
    receipt_url: '',
  });

  useEffect(() => {
    if (!open) return;
    if (!initialExpense) {
      setFormData({
        shop_id: SHOP_GENERAL_VALUE,
        category: '',
        amount: '',
        description: '',
        expense_date: todayDate(),
        status: 'pending',
        rejected_reason: '',
        account_id: ACCOUNT_NONE_VALUE,
        receipt_url: '',
      });
      return;
    }
    setFormData({
      shop_id: initialExpense.shop_id || SHOP_GENERAL_VALUE,
      category: initialExpense.category || '',
      amount: String(initialExpense.amount ?? ''),
      description: initialExpense.description || '',
      expense_date: initialExpense.expense_date || todayDate(),
      status: (initialExpense.status as ExpenseStatus) || 'pending',
      rejected_reason: initialExpense.rejected_reason || '',
      account_id: initialExpense.account_id || ACCOUNT_NONE_VALUE,
      receipt_url: initialExpense.receipt_url || '',
    });
  }, [open, initialExpense]);

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

  const { data: accounts = [] } = useQuery({
    queryKey: ['financial-accounts', store?.id],
    queryFn: async () => {
      if (!store?.id) return [] as FinancialAccountRow[];
      const { data, error } = await supabase
        .from('financial_accounts')
        .select('id, name, type, currency, is_active')
        .eq('business_id', store.id)
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return (data ?? []) as FinancialAccountRow[];
    },
    enabled: !!store?.id,
  });

  const upsertExpenseMutation = useMutation({
    mutationFn: async () => {
      if (!store?.id) throw new Error('No active business selected');
      if (!user?.id) throw new Error('Not authenticated');

      const amount = Number(formData.amount);
      if (!Number.isFinite(amount) || amount <= 0) throw new Error('Amount must be greater than 0');
      if (!formData.category) throw new Error('Category is required');
      if (!formData.description.trim()) throw new Error('Description is required');
      if (!formData.expense_date) throw new Error('Expense date is required');
      if (formData.status === 'rejected' && !formData.rejected_reason.trim()) {
        throw new Error('Rejection reason is required when status is rejected');
      }

      const shopId = formData.shop_id === SHOP_GENERAL_VALUE ? null : formData.shop_id;
      const accountId = formData.account_id === ACCOUNT_NONE_VALUE ? null : formData.account_id;

      const payload: Record<string, unknown> = {
        business_id: store.id,
        shop_id: shopId,
        category: formData.category,
        amount,
        currency,
        description: formData.description.trim(),
        expense_date: formData.expense_date,
        status: formData.status,
        rejected_reason: formData.status === 'rejected' ? formData.rejected_reason.trim() : null,
        receipt_url: formData.receipt_url.trim() ? formData.receipt_url.trim() : null,
      };
      if (accountId) payload.account_id = accountId;

      if (!isEdit) {
        const baseRow: Record<string, unknown> = { ...payload, recorded_by: user.id };
        const attemptRow = { ...baseRow };
        const removed = new Set<string>();

        for (let i = 0; i < 10; i++) {
          const res = await supabase.from('expenses').insert([attemptRow]);
          if (!res.error) return;

          const err = res.error as unknown as { code?: string; message?: string };
          if (err?.code !== 'PGRST204' || typeof err.message !== 'string') throw res.error;

          const match = err.message.match(/Could not find the '([^']+)' column/i);
          const col = match?.[1];
          if (!col || removed.has(col) || !(col in attemptRow)) throw res.error;

          removed.add(col);
          // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
          delete (attemptRow as Record<string, unknown>)[col];
        }
        throw new Error('Failed to record expense (schema mismatch)');
        return;
      }

      const updatePayload: Record<string, unknown> = {
        ...payload,
        approved_by: formData.status === 'approved' ? user.id : null,
      };

      const attemptUpdate = { ...updatePayload };
      const removed = new Set<string>();

      for (let i = 0; i < 10; i++) {
        const res = await supabase.from('expenses').update(attemptUpdate).eq('id', initialExpense!.id).eq('business_id', store.id);
        if (!res.error) return;

        const err = res.error as unknown as { code?: string; message?: string };
        if (err?.code !== 'PGRST204' || typeof err.message !== 'string') throw res.error;

        const match = err.message.match(/Could not find the '([^']+)' column/i);
        const col = match?.[1];
        if (!col || removed.has(col) || !(col in attemptUpdate)) throw res.error;

        removed.add(col);
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete (attemptUpdate as Record<string, unknown>)[col];
      }
      throw new Error('Failed to update expense (schema mismatch)');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['tenant-finance-expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expense-list'] });
      toast({ title: isEdit ? 'Expense updated' : 'Expense recorded' });
      onOpenChange(false);
    },
    onError: (err) => {
      toast({ title: 'Error', description: getErrorMessage(err), variant: 'destructive' });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={formData.category} onValueChange={(value) => setFormData((p) => ({ ...p, category: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {DEFAULT_CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Shop (Optional)</Label>
              <Select value={formData.shop_id} onValueChange={(value) => setFormData((p) => ({ ...p, shop_id: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="General expense" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SHOP_GENERAL_VALUE}>General</SelectItem>
                  {shops.map((shop) => (
                    <SelectItem key={shop.id} value={shop.id}>
                      {shop.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Amount ({currency})</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.amount}
                onChange={(e) => setFormData((p) => ({ ...p, amount: e.target.value }))}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label>Expense Date</Label>
              <Input
                type="date"
                value={formData.expense_date}
                onChange={(e) => setFormData((p) => ({ ...p, expense_date: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Account (Optional)</Label>
              <Select value={formData.account_id} onValueChange={(value) => setFormData((p) => ({ ...p, account_id: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ACCOUNT_NONE_VALUE}>No account</SelectItem>
                  {accounts
                    .filter((a) => a.currency?.toUpperCase?.() === currency)
                    .map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name} ({a.type})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData((p) => ({ ...p, status: value as ExpenseStatus }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {formData.status === 'rejected' ? (
            <div className="space-y-2">
              <Label>Rejection Reason</Label>
              <Textarea
                value={formData.rejected_reason}
                onChange={(e) => setFormData((p) => ({ ...p, rejected_reason: e.target.value }))}
                placeholder="Reason for rejection"
                rows={2}
              />
            </div>
          ) : null}

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
              placeholder="Describe the expense"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Receipt URL (Optional)</Label>
            <Input
              value={formData.receipt_url}
              onChange={(e) => setFormData((p) => ({ ...p, receipt_url: e.target.value }))}
              placeholder="https://..."
            />
          </div>
        </div>

        <Button
          onClick={() => upsertExpenseMutation.mutate()}
          disabled={upsertExpenseMutation.isPending || !formData.category || !formData.amount || !formData.description}
          className="w-full"
        >
          {upsertExpenseMutation.isPending ? 'Saving...' : isEdit ? 'Save Changes' : 'Record Expense'}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
