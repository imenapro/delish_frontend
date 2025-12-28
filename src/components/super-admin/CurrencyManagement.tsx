import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';

interface CountryCurrency {
  country_code: string;
  currency_code: string;
  currency_symbol: string;
  locale: string;
  is_active: boolean;
}

interface CurrencyRate {
  id: string;
  from_currency: string;
  to_currency: string;
  rate: number;
}

export function CurrencyManagement() {
  const [mappings, setMappings] = useState<CountryCurrency[]>([]);
  const [rates, setRates] = useState<CurrencyRate[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [loading, setLoading] = useState(true);
  
  // Dialog states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isRateOpen, setIsRateOpen] = useState(false);
  
  // Form states
  const [newMapping, setNewMapping] = useState<Partial<CountryCurrency>>({ is_active: true });
  const [newRate, setNewRate] = useState<Partial<CurrencyRate>>({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: mappingsData, error: mappingsError } = await supabase
        .from('country_currency_mapping')
        .select('*')
        .order('country_code');
      
      if (mappingsError) throw mappingsError;
      setMappings(mappingsData || []);

      const { data: ratesData, error: ratesError } = await supabase
        .from('currency_rates')
        .select('*');
        
      if (ratesError) throw ratesError;
      setRates(ratesData || []);
    } catch (error: any) {
      toast.error('Failed to load currency data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (countryCode: string, currentState: boolean) => {
    try {
      const { error } = await supabase
        .from('country_currency_mapping')
        .update({ is_active: !currentState })
        .eq('country_code', countryCode);
        
      if (error) throw error;
      
      setMappings(prev => prev.map(m => 
        m.country_code === countryCode ? { ...m, is_active: !currentState } : m
      ));
      toast.success('Status updated');
    } catch (error: any) {
      toast.error('Error updating status: ' + error.message);
    }
  };

  const handleAddMapping = async () => {
    try {
      if (!newMapping.country_code || !newMapping.currency_code) {
        toast.error('Please fill required fields');
        return;
      }
      
      const { error } = await supabase
        .from('country_currency_mapping')
        .upsert([newMapping]); // upsert to handle potential overwrite if user wants
        
      if (error) throw error;
      
      toast.success('Mapping saved');
      setIsAddOpen(false);
      setNewMapping({ is_active: true });
      fetchData();
    } catch (error: any) {
      toast.error('Error saving mapping: ' + error.message);
    }
  };

  const handleAddRate = async () => {
    try {
      if (!newRate.from_currency || !newRate.to_currency || !newRate.rate) {
        toast.error('Please fill required fields');
        return;
      }
      
      const { error } = await supabase
        .from('currency_rates')
        .insert([newRate]);
        
      if (error) throw error;
      
      toast.success('Rate added');
      setIsRateOpen(false);
      setNewRate({});
      fetchData();
    } catch (error: any) {
      toast.error('Error adding rate: ' + error.message);
    }
  };

  return (
    <div className="space-y-8">
      {/* Country Mappings Section */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Country Mappings</h2>
          <Button onClick={() => setIsAddOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add Mapping
          </Button>
        </div>

        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Country Code</TableHead>
                <TableHead>Currency Code</TableHead>
                <TableHead>Symbol</TableHead>
                <TableHead>Locale</TableHead>
                <TableHead>Active</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mappings.map((mapping) => (
                <TableRow key={mapping.country_code}>
                  <TableCell className="font-medium">{mapping.country_code}</TableCell>
                  <TableCell>{mapping.currency_code}</TableCell>
                  <TableCell>{mapping.currency_symbol}</TableCell>
                  <TableCell>{mapping.locale}</TableCell>
                  <TableCell>
                    <Switch 
                      checked={mapping.is_active}
                      onCheckedChange={() => handleToggleActive(mapping.country_code, mapping.is_active)}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Exchange Rates Section */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Exchange Rates</h2>
          <Button variant="outline" onClick={() => setIsRateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add Rate
          </Button>
        </div>

        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>From</TableHead>
                <TableHead>To</TableHead>
                <TableHead>Rate</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rates.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">No rates defined</TableCell>
                </TableRow>
              ) : (
                rates.map((rate) => (
                  <TableRow key={rate.id}>
                    <TableCell>{rate.from_currency}</TableCell>
                    <TableCell>{rate.to_currency}</TableCell>
                    <TableCell>{rate.rate}</TableCell>
                    <TableCell>
                       {/* Add edit/delete if needed */}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Add Mapping Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Country Mapping</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Country Code (ISO 2)</Label>
              <Input 
                placeholder="e.g. RW" 
                maxLength={2}
                value={newMapping.country_code || ''}
                onChange={e => setNewMapping({...newMapping, country_code: e.target.value.toUpperCase()})}
              />
            </div>
            <div className="space-y-2">
              <Label>Currency Code (ISO 3)</Label>
              <Input 
                placeholder="e.g. RWF" 
                maxLength={3}
                value={newMapping.currency_code || ''}
                onChange={e => setNewMapping({...newMapping, currency_code: e.target.value.toUpperCase()})}
              />
            </div>
            <div className="space-y-2">
              <Label>Symbol</Label>
              <Input 
                placeholder="e.g. FRW" 
                value={newMapping.currency_symbol || ''}
                onChange={e => setNewMapping({...newMapping, currency_symbol: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Locale</Label>
              <Input 
                placeholder="e.g. rw-RW" 
                value={newMapping.locale || ''}
                onChange={e => setNewMapping({...newMapping, locale: e.target.value})}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAddMapping}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Rate Dialog */}
      <Dialog open={isRateOpen} onOpenChange={setIsRateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Exchange Rate</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>From</Label>
                <Input 
                  placeholder="USD" 
                  value={newRate.from_currency || ''}
                  onChange={e => setNewRate({...newRate, from_currency: e.target.value.toUpperCase()})}
                />
              </div>
              <div className="space-y-2">
                <Label>To</Label>
                <Input 
                  placeholder="RWF" 
                  value={newRate.to_currency || ''}
                  onChange={e => setNewRate({...newRate, to_currency: e.target.value.toUpperCase()})}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Rate</Label>
              <Input 
                type="number" 
                step="0.0001"
                placeholder="1.0" 
                value={newRate.rate || ''}
                onChange={e => setNewRate({...newRate, rate: parseFloat(e.target.value)})}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRateOpen(false)}>Cancel</Button>
            <Button onClick={handleAddRate}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
