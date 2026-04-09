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

type FinancialAccountRow = {
  id: string;
  name: string;
  type: string;
  currency: string;
  balance: number;
  is_active: boolean;
  created_at?: string | null;
  updated_at?: string | null;
};

const getErrorMessage = (err: unknown): string => {
  if (err instanceof Error) return err.message;
  if (err && typeof err === 'object' && 'message' in err) {
    const msg = (err as { message?: unknown }).message;
    if (typeof msg === 'string') return msg;
  }
  return 'Unknown error';
};

const ACCOUNT_TYPES = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank', label: 'Bank' },
  { value: 'mobile_money', label: 'Mobile Money' },
  { value: 'card', label: 'Card' },
  { value: 'other', label: 'Other' },
] as const;

type AccountType = (typeof ACCOUNT_TYPES)[number]['value'];

export function FinancialAccountsManager() {
  const { store } = useStoreContext();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const currency = useMemo(() => (store?.currency || 'RWF').trim().toUpperCase(), [store?.currency]);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<FinancialAccountRow | null>(null);
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('cash');
  const [accountCurrency, setAccountCurrency] = useState(currency);
  const [openingBalance, setOpeningBalance] = useState('0');
  const [isActive, setIsActive] = useState(true);

  const reset = () => {
    setName('');
    setType('cash');
    setAccountCurrency(currency);
    setOpeningBalance('0');
    setIsActive(true);
    setEditing(null);
  };

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ['financial-accounts', store?.id],
    queryFn: async () => {
      if (!store?.id) return [] as FinancialAccountRow[];
      const { data, error } = await supabase
        .from('financial_accounts')
        .select('id, name, type, currency, balance, is_active, created_at, updated_at')
        .eq('business_id', store.id)
        .order('name');
      if (error) throw error;
      return (data ?? []) as FinancialAccountRow[];
    },
    enabled: !!store?.id,
  });

  const upsertMutation = useMutation({
    mutationFn: async () => {
      if (!store?.id) throw new Error('No active business selected');
      if (!name.trim()) throw new Error('Name is required');
      if (!accountCurrency.trim()) throw new Error('Currency is required');

      if (!editing) {
        const res = await supabase.from('financial_accounts').insert([
          {
            business_id: store.id,
            name: name.trim(),
            type,
            currency: accountCurrency.trim().toUpperCase(),
            balance: Number(openingBalance) || 0,
            is_active: isActive,
          },
        ]);
        if (res.error) throw res.error;
        return;
      }

      const res = await supabase
        .from('financial_accounts')
        .update({
          name: name.trim(),
          type,
          currency: accountCurrency.trim().toUpperCase(),
          is_active: isActive,
        })
        .eq('id', editing.id)
        .eq('business_id', store.id);
      if (res.error) throw res.error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['expense-list'] });
      toast({ title: editing ? 'Account updated' : 'Account created' });
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
            <CardTitle>Accounts</CardTitle>
            <CardDescription>Track balances that expenses are paid from</CardDescription>
          </div>
          <Button
            onClick={() => {
              reset();
              setOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            New Account
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : accounts.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">No accounts configured</div>
          ) : (
            <div className="rounded-md border overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-card z-10">
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Currency</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accounts.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">{a.name}</TableCell>
                      <TableCell>{a.type}</TableCell>
                      <TableCell>{a.currency}</TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(Number(a.balance), a.currency || currency)}</TableCell>
                      <TableCell>{a.is_active ? 'Active' : 'Inactive'}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            const allowed = new Set<AccountType>(ACCOUNT_TYPES.map((t) => t.value));
                            setEditing(a);
                            setName(a.name);
                            setType(allowed.has(a.type as AccountType) ? (a.type as AccountType) : 'other');
                            setAccountCurrency(a.currency || currency);
                            setOpeningBalance(String(a.balance ?? 0));
                            setIsActive(!!a.is_active);
                            setOpen(true);
                          }}
                          aria-label="Edit account"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
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
            <DialogTitle>{editing ? 'Edit Account' : 'Create Account'}</DialogTitle>
            <DialogDescription>Configure where expenses are paid from</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Cash, Bank" />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={type} onValueChange={(v) => setType(v as AccountType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACCOUNT_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Currency</Label>
                <Input value={accountCurrency} onChange={(e) => setAccountCurrency(e.target.value)} placeholder={currency} />
              </div>
            </div>

            {!editing ? (
              <div className="space-y-2">
                <Label>Opening Balance</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={openingBalance}
                  onChange={(e) => setOpeningBalance(e.target.value)}
                />
              </div>
            ) : null}

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={isActive ? 'active' : 'inactive'} onValueChange={(v) => setIsActive(v === 'active')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button onClick={() => upsertMutation.mutate()} className="w-full" disabled={upsertMutation.isPending}>
              {upsertMutation.isPending ? 'Saving...' : editing ? 'Save Changes' : 'Create Account'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
