import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { useStoreContext } from '@/contexts/StoreContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Save, Coins } from 'lucide-react';
import { DEFAULT_LOCALES } from '@/utils/currency';

export function TenantCurrencySettings() {
  const { store, refreshStore } = useStoreContext();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  const [currency, setCurrency] = useState(store?.currency || 'USD');
  const [locale, setLocale] = useState(store?.locale || 'en');

  // Fetch available currencies from system_settings
  const { data: systemCurrencies } = useQuery({
    queryKey: ['system-settings-currencies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'currency_config')
        .single();
      
      if (error) {
        console.error('Error fetching currency config:', error);
        return null;
      }
      return data?.setting_value;
    },
  });

  const handleSave = async () => {
    if (!store?.id) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('businesses')
        .update({ 
          currency,
          locale: locale as 'en' | 'pt' | 'fr'
        })
        .eq('id', store.id);

      if (error) throw error;

      toast({
        title: "Settings Saved",
        description: "Your currency and language settings have been updated.",
      });
      
      refreshStore();
    } catch (error: any) {
      console.error('Error updating settings:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update settings.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const currencies = systemCurrencies && systemCurrencies.length > 0 
    ? systemCurrencies 
    : Object.keys(DEFAULT_LOCALES)
        .filter(c => c !== 'MTN' && c !== 'MT')
        .map(code => ({ code, name: code }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Coins className="h-5 w-5" />
          Regional Settings
        </CardTitle>
        <CardDescription>Configure your business currency and language</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="currency">Currency</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger id="currency">
                <SelectValue placeholder="Select currency" />
              </SelectTrigger>
              <SelectContent>
                {currencies.map((curr: any) => (
                  <SelectItem key={curr.code} value={curr.code}>
                    {curr.name} ({curr.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              This will update the currency symbol displayed across your store.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="locale">Language</Label>
            <Select value={locale} onValueChange={setLocale}>
              <SelectTrigger id="locale">
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="pt">Portuguese</SelectItem>
                <SelectItem value="fr">French</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              This affects the application interface language.
            </p>
          </div>
        </div>

        <Button onClick={handleSave} disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          <Save className="mr-2 h-4 w-4" />
          Save Changes
        </Button>
      </CardContent>
    </Card>
  );
}
