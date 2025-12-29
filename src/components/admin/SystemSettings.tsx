import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { Settings, DollarSign, Mail, Loader2, Globe, Pencil } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';

const DEFAULT_CURRENCY_CONFIG = [
  { code: 'USD', locale: 'en-US', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', locale: 'en-IE', name: 'Euro', symbol: '€' },
  { code: 'MZN', locale: 'pt-MZ', name: 'Mozambican Metical', symbol: 'MT' },
  { code: 'RWF', locale: 'en-RW', name: 'Rwandan Franc', symbol: 'FRW' },
];

const DEFAULT_SYSTEM_CURRENCY = 'RWF';

export function SystemSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [revenue, setRevenue] = useState('');
  const [iva, setIva] = useState('');
  const [testEmail, setTestEmail] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);

  // New State for Currency Management
  const [isAddCurrencyOpen, setIsAddCurrencyOpen] = useState(false);
  const [isEditCurrencyOpen, setIsEditCurrencyOpen] = useState(false);
  const [newCurrency, setNewCurrency] = useState({ code: '', locale: '', name: '', symbol: '' });
  const [editingCurrency, setEditingCurrency] = useState<{ code: string; locale: string; name: string; symbol: string } | null>(null);

  const { data: settings } = useQuery({
    queryKey: ['system-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .in('setting_key', ['revenue_percentage', 'iva_percentage', 'currency_config']);
      if (error) throw error;
      
      const settingsMap: Record<string, any> = {};
      data?.forEach(s => {
        settingsMap[s.setting_key] = s.setting_value;
      });
      return settingsMap;
    },
  });

  const currencies = settings?.currency_config || DEFAULT_CURRENCY_CONFIG;

  const updateCurrencyConfigMutation = useMutation({
    mutationFn: async (newConfig: any[]) => {
      const { error } = await supabase
        .from('system_settings')
        .upsert({ 
          setting_key: 'currency_config', 
          setting_value: newConfig 
        }, { 
          onConflict: 'setting_key' 
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-settings'] });
      toast({ title: 'Currency settings updated successfully' });
      setIsAddCurrencyOpen(false);
      setNewCurrency({ code: '', locale: '', name: '', symbol: '' });
    },
  });

  const handleAddCurrency = () => {
    if (!newCurrency.code || !newCurrency.locale) {
      toast({ title: 'Please fill in required fields', variant: 'destructive' });
      return;
    }
    
    // Prevent adding "MTN" or "MT" - enforce MZN
    if (newCurrency.code.toUpperCase() === 'MTN' || newCurrency.code.toUpperCase() === 'MT') {
       toast({ title: 'Please use MZN for Mozambican Metical', variant: 'destructive' });
       setNewCurrency({ ...newCurrency, code: 'MZN' });
       return;
    }

    const updatedCurrencies = [...currencies, newCurrency];
    updateCurrencyConfigMutation.mutate(updatedCurrencies);
  };

  const handleDeleteCurrency = (code: string) => {
    const updatedCurrencies = currencies.filter((c: any) => c.code !== code);
    updateCurrencyConfigMutation.mutate(updatedCurrencies);
  };

  const handleEditClick = (currency: any) => {
    setEditingCurrency({ ...currency });
    setIsEditCurrencyOpen(true);
  };

  const handleSaveEdit = () => {
    if (!editingCurrency) return;
    
    // Prevent "MTN" or "MT" - enforce MZN if edited
    if (editingCurrency.code.toUpperCase() === 'MTN' || editingCurrency.code.toUpperCase() === 'MT') {
       toast({ title: 'Please use MZN for Mozambican Metical', variant: 'destructive' });
       return;
    }

    const updatedCurrencies = currencies.map((c: any) => 
      c.code === editingCurrency.code ? editingCurrency : c
    );
    
    updateCurrencyConfigMutation.mutate(updatedCurrencies);
    setIsEditCurrencyOpen(false);
    setEditingCurrency(null);
  };

  const { data: salaries } = useQuery({
    queryKey: ['salary-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('salary_settings')
        .select('*')
        .order('role');
      if (error) throw error;
      return data;
    },
  });

  const updateSettingMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string | number | boolean }) => {
      const { error } = await supabase
        .from('system_settings')
        .upsert({ 
          setting_key: key, 
          setting_value: value 
        }, { 
          onConflict: 'setting_key' 
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-settings'] });
      toast({ title: 'Setting updated successfully' });
    },
  });

  const updateSalaryMutation = useMutation({
    mutationFn: async ({ role, amount }: { role: string; amount: number }) => {
      // Cast role to string as it's an enum in DB but string in JS
      const { error } = await supabase
        .from('salary_settings')
        .upsert({ role: role as any, amount, currency: DEFAULT_SYSTEM_CURRENCY }, { onConflict: 'role' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salary-settings'] });
      toast({ title: 'Salary updated successfully' });
    },
  });

  const handleSendTestEmail = async () => {
    if (!testEmail) return;
    setSendingEmail(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          to: testEmail,
          subject: 'Test Email from BakeSync',
          html: '<h1>It Works!</h1><p>This is a test email from your BakeSync system to verify the email configuration.</p>',
          text: 'It Works! This is a test email from your BakeSync system.'
        }
      });

      if (error) throw error;
      
      toast({ 
        title: 'Email Sent', 
        description: `Test email sent to ${testEmail}` 
      });
    } catch (error) {
      console.error('Email error:', error);
      toast({ 
        title: 'Failed to send email', 
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: 'destructive'
      });
    } finally {
      setSendingEmail(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-[var(--shadow-medium)]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            System Configuration
          </CardTitle>
          <CardDescription>Configure revenue and tax settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="revenue">Revenue Percentage (%)</Label>
              <Input
                id="revenue"
                type="number"
                step="0.01"
                placeholder="15.00"
                value={revenue || settings?.revenue_percentage || ''}
                onChange={(e) => setRevenue(e.target.value)}
              />
              <Button 
                size="sm" 
                onClick={() => updateSettingMutation.mutate({ 
                  key: 'revenue_percentage', 
                  value: parseFloat(revenue) 
                })}
                disabled={!revenue}
              >
                Update Revenue %
              </Button>
            </div>
            <div className="space-y-2">
              <Label htmlFor="iva">IVA/Tax Percentage (%)</Label>
              <Input
                id="iva"
                type="number"
                step="0.01"
                placeholder="18.00"
                value={iva || settings?.iva_percentage || ''}
                onChange={(e) => setIva(e.target.value)}
              />
              <Button 
                size="sm" 
                onClick={() => updateSettingMutation.mutate({ 
                  key: 'iva_percentage', 
                  value: parseFloat(iva) 
                })}
                disabled={!iva}
              >
                Update IVA %
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Currency Management Card */}
      <Card className="shadow-[var(--shadow-medium)]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Currency & Localization
          </CardTitle>
          <CardDescription>Manage supported currencies and their locales</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-end">
              <Dialog open={isAddCurrencyOpen} onOpenChange={setIsAddCurrencyOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">Add Currency</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Currency</DialogTitle>
                    <DialogDescription>
                      Enter the details for the new currency below.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="code" className="text-right">Code</Label>
                      <Input 
                        id="code" 
                        value={newCurrency.code} 
                        onChange={(e) => setNewCurrency({ ...newCurrency, code: e.target.value.toUpperCase() })}
                        placeholder="e.g. MZN"
                        className="col-span-3" 
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="locale" className="text-right">Locale</Label>
                      <Input 
                        id="locale" 
                        value={newCurrency.locale} 
                        onChange={(e) => setNewCurrency({ ...newCurrency, locale: e.target.value })}
                        placeholder="e.g. pt-MZ"
                        className="col-span-3" 
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="name" className="text-right">Name</Label>
                      <Input 
                        id="name" 
                        value={newCurrency.name} 
                        onChange={(e) => setNewCurrency({ ...newCurrency, name: e.target.value })}
                        placeholder="e.g. Mozambican Metical"
                        className="col-span-3" 
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="symbol" className="text-right">Symbol</Label>
                      <Input 
                        id="symbol" 
                        value={newCurrency.symbol} 
                        onChange={(e) => setNewCurrency({ ...newCurrency, symbol: e.target.value })}
                        placeholder="e.g. MT"
                        className="col-span-3" 
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={handleAddCurrency}>Add Currency</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Dialog open={isEditCurrencyOpen} onOpenChange={setIsEditCurrencyOpen}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Edit Currency</DialogTitle>
                    <DialogDescription>
                      Modify the currency details below.
                    </DialogDescription>
                  </DialogHeader>
                  {editingCurrency && (
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="edit-code" className="text-right">Code</Label>
                        <Input 
                          id="edit-code" 
                          value={editingCurrency.code} 
                          disabled // Code is unique key, cannot edit
                          className="col-span-3 bg-muted" 
                        />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="edit-locale" className="text-right">Locale</Label>
                        <Input 
                          id="edit-locale" 
                          value={editingCurrency.locale} 
                          onChange={(e) => setEditingCurrency({ ...editingCurrency, locale: e.target.value })}
                          className="col-span-3" 
                        />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="edit-name" className="text-right">Name</Label>
                        <Input 
                          id="edit-name" 
                          value={editingCurrency.name} 
                          onChange={(e) => setEditingCurrency({ ...editingCurrency, name: e.target.value })}
                          className="col-span-3" 
                        />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="edit-symbol" className="text-right">Symbol</Label>
                        <Input 
                          id="edit-symbol" 
                          value={editingCurrency.symbol} 
                          onChange={(e) => setEditingCurrency({ ...editingCurrency, symbol: e.target.value })}
                          className="col-span-3" 
                        />
                      </div>
                    </div>
                  )}
                  <DialogFooter>
                    <Button onClick={handleSaveEdit}>Save Changes</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
            
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Locale</TableHead>
                    <TableHead>Symbol</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currencies.map((currency: any) => (
                    <TableRow key={currency.code}>
                      <TableCell className="font-medium">{currency.code}</TableCell>
                      <TableCell>{currency.name}</TableCell>
                      <TableCell>{currency.locale}</TableCell>
                      <TableCell>{currency.symbol}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleEditClick(currency)}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <Pencil className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleDeleteCurrency(currency.code)}
                          disabled={['USD', 'RWF', 'MZN'].includes(currency.code)} // Prevent deleting core currencies
                          className="text-destructive hover:text-destructive"
                        >
                          Delete
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-[var(--shadow-medium)]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Salary Settings
          </CardTitle>
          <CardDescription>Configure salary for each role</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {['admin', 'manager', 'seller', 'delivery', 'customer'].map((role) => {
              const salary = salaries?.find(s => s.role === role);
              return (
                <div key={role} className="flex items-center gap-4">
                  <Label className="w-32 capitalize">{role}</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    defaultValue={salary?.amount || ''}
                    onBlur={(e) => {
                      const amount = parseFloat(e.target.value);
                      if (amount && amount > 0) {
                        updateSalaryMutation.mutate({ role, amount });
                      }
                    }}
                    className="flex-1"
                  />
                  <span className="text-sm text-muted-foreground">{DEFAULT_SYSTEM_CURRENCY}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-[var(--shadow-medium)]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Configuration Test
          </CardTitle>
          <CardDescription>Verify your email service settings (Gmail / Fallback)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-4">
            <div className="space-y-2 flex-1">
              <Label htmlFor="test-email">Recipient Email</Label>
              <Input
                id="test-email"
                type="email"
                placeholder="you@example.com"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
              />
            </div>
            <Button 
              onClick={handleSendTestEmail} 
              disabled={!testEmail || sendingEmail}
            >
              {sendingEmail ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                'Send Test Email'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}