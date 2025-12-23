import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { Settings, DollarSign } from 'lucide-react';

export function SystemSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [revenue, setRevenue] = useState('');
  const [iva, setIva] = useState('');

  const { data: settings } = useQuery({
    queryKey: ['system-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .in('setting_key', ['revenue_percentage', 'iva_percentage']);
      if (error) throw error;
      
      const settingsMap: Record<string, string | number | boolean> = {};
      data?.forEach(s => {
        settingsMap[s.setting_key] = s.setting_value;
      });
      return settingsMap;
    },
  });

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
        .upsert({ role: role as "manager" | "sales_person" | "baker", amount, currency: 'RWF' }, { onConflict: 'role' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salary-settings'] });
      toast({ title: 'Salary updated successfully' });
    },
  });

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

      <Card className="shadow-[var(--shadow-medium)]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Salary Settings
          </CardTitle>
          <CardDescription>Configure salary for each role (in RWF)</CardDescription>
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
                  <span className="text-sm text-muted-foreground">RWF</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}