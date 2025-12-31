import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useStoreContext } from '@/contexts/StoreContext';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import { Coins, Percent, Globe2, CalendarDays, Plus, Save, Trash2, Pencil, Info } from 'lucide-react';

interface TenantTax {
  id: string;
  business_id: string;
  shop_id?: string | null;
  name: string;
  description?: string | null;
  rate: number;
  country?: string | null;
  region?: string | null;
  effective_from?: string | null;
  effective_to?: string | null;
  type?: string | null;
  category?: string | null;
  is_active: boolean;
  is_compound?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
}

interface FormState {
  id?: string;
  name: string;
  description: string;
  rate: string;
  country: string;
  region: string;
  effective_from: string;
  effective_to: string;
  type: string;
  category: string;
  is_active: boolean;
  is_compound: boolean;
  shop_id: string;
}

export function TenantTaxManagement() {
  const { store } = useStoreContext();
  const { user, roles } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [taxes, setTaxes] = useState<TenantTax[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [compoundFilter, setCompoundFilter] = useState<'all' | 'compound' | 'single'>('all');
  const [editing, setEditing] = useState<FormState | null>(null);
  const [shops, setShops] = useState<{ id: string; name: string }[]>([]);

  const canManage = useMemo(() => {
    const allowed = ['admin', 'store_owner'];
    return roles.some(r => allowed.includes(r.role));
  }, [roles]);

  useEffect(() => {
    if (!store?.id) return;
    loadTaxes();
    loadShops();
  }, [store?.id]);

  const loadShops = async () => {
    const { data } = await supabase.from('shops').select('id,name').eq('business_id', store?.id as string);
    setShops(data || []);
  };

  const loadTaxes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('tenant_taxes' as any)
        .select('*')
        .eq('business_id', store?.id as string)
        .order('created_at', { ascending: false });
      if (error) {
        console.warn('tenant_taxes not available or error:', error.message || error);
        setTaxes([]);
      } else {
        setTaxes((data || []) as TenantTax[]);
      }
    } catch (e) {
      console.error('Error loading taxes', e);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEditing({
      name: '',
      description: '',
      rate: '',
      country: '',
      region: '',
      effective_from: '',
      effective_to: '',
      type: '',
      category: '',
      is_active: true,
      is_compound: false,
      shop_id: 'all',
    });
  };

  const startEdit = (tax: TenantTax) => {
    setEditing({
      id: tax.id,
      name: tax.name,
      description: tax.description || '',
      rate: String(tax.rate),
      country: tax.country || '',
      region: tax.region || '',
      effective_from: tax.effective_from || '',
      effective_to: tax.effective_to || '',
      type: tax.type || '',
      category: tax.category || '',
      is_active: !!tax.is_active,
      is_compound: !!tax.is_compound,
      shop_id: tax.shop_id || 'all',
    });
  };

  const validateForm = (f: FormState) => {
    const rateNum = Number(f.rate);
    if (!f.name.trim()) return 'Tax name is required';
    if (isNaN(rateNum) || rateNum < 0 || rateNum > 100) return 'Tax rate must be a positive percentage';
    if (f.effective_from && f.effective_to) {
      const from = new Date(f.effective_from).getTime();
      const to = new Date(f.effective_to).getTime();
      if (to < from) return 'Effective end date must be after start date';
    }
    return null;
  };

  const audit = async (action: string, details: string) => {
    try {
      await supabase.from('audit_logs' as any).insert({
        action,
        details,
        performed_by: user?.id || 'system',
        created_at: new Date().toISOString(),
      });
    } catch (e) {
      console.warn('Audit log failed', e);
    }
  };

  const saveTax = async () => {
    if (!editing || !store?.id) return;
    const err = validateForm(editing);
    if (err) {
      toast({ title: 'Validation Error', description: err, variant: 'destructive' });
      return;
    }
    try {
      setLoading(true);
      const payload = {
        business_id: store.id,
        shop_id: editing.shop_id === 'all' ? null : editing.shop_id,
        name: editing.name,
        description: editing.description || null,
        rate: Number(editing.rate),
        country: editing.country || null,
        region: editing.region || null,
        effective_from: editing.effective_from || null,
        effective_to: editing.effective_to || null,
        type: editing.type || null,
        category: editing.category || null,
        is_active: editing.is_active,
        is_compound: editing.is_compound,
      };
      if (editing.id) {
        const { error } = await supabase.from('tenant_taxes' as any).update(payload).eq('id', editing.id);
        if (error) throw error;
        await audit('tax_update', `Updated tax ${editing.name} (${editing.id})`);
        toast({ title: 'Tax Updated', description: 'Your changes have been saved.' });
      } else {
        const { error } = await supabase.from('tenant_taxes' as any).insert(payload);
        if (error) throw error;
        await audit('tax_create', `Created tax ${editing.name}`);
        toast({ title: 'Tax Created', description: 'New tax has been added.' });
      }
      setEditing(null);
      loadTaxes();
    } catch (e: any) {
      toast({ title: 'Save Failed', description: e.message || 'Could not save tax', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const deleteTax = async (id: string, name: string) => {
    try {
      setLoading(true);
      const { error } = await supabase.from('tenant_taxes' as any).delete().eq('id', id);
      if (error) throw error;
      await audit('tax_delete', `Deleted tax ${name} (${id})`);
      toast({ title: 'Tax Deleted', description: `${name} has been removed.` });
      loadTaxes();
    } catch (e: any) {
      toast({ title: 'Delete Failed', description: e.message || 'Could not delete tax', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const filtered = taxes.filter(t => {
    const matchesSearch =
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      (t.description || '').toLowerCase().includes(search.toLowerCase()) ||
      (t.country || '').toLowerCase().includes(search.toLowerCase()) ||
      (t.region || '').toLowerCase().includes(search.toLowerCase());
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && t.is_active) ||
      (statusFilter === 'inactive' && !t.is_active);
    const matchesCompound =
      compoundFilter === 'all' ||
      (compoundFilter === 'compound' && t.is_compound) ||
      (compoundFilter === 'single' && !t.is_compound);
    return matchesSearch && matchesStatus && matchesCompound;
  });

  if (!canManage) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Coins className="h-5 w-5" />
          Tax Management
        </CardTitle>
        <CardDescription>Configure and manage taxes for your tenant</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <Label>Search</Label>
            <Input placeholder="Search by name, country, region..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div>
            <Label>Status</Label>
            <Select value={statusFilter} onValueChange={(v: 'all' | 'active' | 'inactive') => setStatusFilter(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Type</Label>
            <Select value={compoundFilter} onValueChange={(v: 'all' | 'compound' | 'single') => setCompoundFilter(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="compound">Compound</SelectItem>
                <SelectItem value="single">Single</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-between items-center">
          <div className="text-sm text-muted-foreground flex items-center gap-2">
            <Info className="h-4 w-4" />
            Taxes apply per tenant. You can scope to specific shops or regions.
          </div>
          <Button onClick={resetForm} variant="default" type="button">
            <Plus className="mr-2 h-4 w-4" />
            New Tax
          </Button>
        </div>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.id ? 'Edit Tax' : 'New Tax'}</DialogTitle>
            <DialogDescription>
              {editing?.id ? 'Update the tax details below.' : 'Create a new tax configuration for your store.'}
            </DialogDescription>
          </DialogHeader>
          
          {editing && (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} placeholder="e.g., VAT" />
                </div>
                <div className="space-y-2">
                  <Label>Rate (%)</Label>
                  <Input type="number" min="0" step="0.01" value={editing.rate} onChange={e => setEditing({ ...editing, rate: e.target.value })} placeholder="e.g., 18" />
                </div>
                
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input value={editing.description} onChange={e => setEditing({ ...editing, description: e.target.value })} placeholder="e.g., Value Added Tax" />
                </div>
                <div className="space-y-2">
                  <Label>Shop (optional)</Label>
                  <Select value={editing.shop_id} onValueChange={(v) => setEditing({ ...editing, shop_id: v })}>
                    <SelectTrigger type="button"><SelectValue placeholder="All shops" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All shops</SelectItem>
                      {shops?.map(s => <SelectItem key={s.id} value={s.id}>{s.name || 'Unnamed Shop'}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Country</Label>
                  <Input value={editing.country} onChange={e => setEditing({ ...editing, country: e.target.value })} placeholder="e.g., Rwanda" />
                </div>
                <div className="space-y-2">
                  <Label>Region</Label>
                  <Input value={editing.region} onChange={e => setEditing({ ...editing, region: e.target.value })} placeholder="e.g., Kigali" />
                </div>

                <div className="space-y-2">
                  <Label>Category</Label>
                  <Input value={editing.category} onChange={e => setEditing({ ...editing, category: e.target.value })} placeholder="e.g., sales" />
                </div>
                <div className="space-y-2">
                  <Label>Tax Type</Label>
                  <Input value={editing.type} onChange={e => setEditing({ ...editing, type: e.target.value })} placeholder="e.g., VAT" />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2"><CalendarDays className="h-4 w-4" /> Effective From</Label>
                  <Input type="date" value={editing.effective_from} onChange={e => setEditing({ ...editing, effective_from: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2"><CalendarDays className="h-4 w-4" /> Effective To</Label>
                  <Input type="date" value={editing.effective_to} onChange={e => setEditing({ ...editing, effective_to: e.target.value })} />
                </div>

                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={editing.is_active ? 'active' : 'inactive'} onValueChange={(v) => setEditing({ ...editing, is_active: v === 'active' })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Compound</Label>
                  <Select value={editing.is_compound ? 'yes' : 'no'} onValueChange={(v) => setEditing({ ...editing, is_compound: v === 'yes' })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="no">No</SelectItem>
                      <SelectItem value="yes">Yes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="md:col-span-2 flex justify-end gap-2 mt-4">
                   <Button variant="outline" onClick={() => setEditing(null)} type="button">Cancel</Button>
                   <Button onClick={saveTax} disabled={loading} type="button">
                      {loading ? <Save className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                      Save Tax
                   </Button>
                </div>
             </div>
          )}
        </DialogContent>
      </Dialog>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Rate</TableHead>
              <TableHead>Scope</TableHead>
              <TableHead>Effective</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={7} className="text-center">Loading...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No taxes found</TableCell></TableRow>
            ) : (
              filtered.map(tax => (
                <TableRow key={tax.id}>
                  <TableCell className="font-medium">
                    <div>{tax.name}</div>
                    {tax.description && <div className="text-xs text-muted-foreground">{tax.description}</div>}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Percent className="h-3 w-3" />
                      {Number(tax.rate).toFixed(2)}%
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {tax.shop_id ? (
                      <Badge variant="outline">Shop-specific</Badge>
                    ) : (
                      <Badge variant="secondary">All shops</Badge>
                    )}
                    {(tax.country || tax.region) && (
                      <div className="flex items-center gap-1 text-xs mt-1 text-muted-foreground">
                        <Globe2 className="h-3 w-3" />
                        {[tax.country, tax.region].filter(Boolean).join(' / ')}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-xs">
                    {tax.effective_from ? format(new Date(tax.effective_from), 'dd/MM/yyyy') : '-'} → {tax.effective_to ? format(new Date(tax.effective_to), 'dd/MM/yyyy') : '-'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={tax.is_active ? 'default' : 'destructive'}>
                      {tax.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                    {tax.is_compound && <Badge variant="outline" className="ml-2">Compound</Badge>}
                  </TableCell>
                  <TableCell className="text-xs">{tax.type || '-'}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" className="mr-2" onClick={() => startEdit(tax)} type="button">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-destructive" type="button">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Tax</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action will permanently remove {tax.name}. Are you sure?
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteTax(tax.id, tax.name)}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

