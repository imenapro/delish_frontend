import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/hooks/useAuth';
import { useStoreContext } from '@/contexts/StoreContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function TenantShiftSettings() {
  const { store, refreshStore } = useStoreContext();
  const { roles } = useAuth();
  const [disableOpeningCash, setDisableOpeningCash] = useState(false);
  const [enableMoneyCollection, setEnableMoneyCollection] = useState(false);
  const [saving, setSaving] = useState(false);

  const canManageShiftSettings = roles.some((role) =>
    ['super_admin', 'owner', 'manager', 'store_owner'].includes(role.role)
  );

  useEffect(() => {
    if (store) {
      setDisableOpeningCash(store.disableShiftOpeningCash ?? false);
      setEnableMoneyCollection(store.enableMoneyCollection ?? false);
    }
  }, [store]);

  if (!canManageShiftSettings || !store) {
    return null;
  }

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('businesses')
        .update({ 
          disable_shift_opening_cash: disableOpeningCash,
          enable_money_collection: enableMoneyCollection
        })
        .eq('id', store.id);

      if (error) throw error;
      toast.success('Settings updated successfully');
      refreshStore();
    } catch (error) {
      console.error('Failed to update settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Shift Opening Cash</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-medium">Disable opening cash entry</h3>
              <p className="text-sm text-muted-foreground">
                When enabled, the opening cash field is locked to 0 for all new shift opens.
              </p>
            </div>
            <Switch
              checked={disableOpeningCash}
              onCheckedChange={setDisableOpeningCash}
            />
          </div>
          <div className="rounded-lg border border-muted/50 bg-muted/5 p-4">
            <p className="text-sm">
              If this setting is turned on, shift open will always use an opening cash value of 0 and the field will be disabled. When off, users can enter an opening cash amount (default 0).
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Money Collection System</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-medium">Enable Daily Money Collection</h3>
              <p className="text-sm text-muted-foreground">
                Requires sellers to report collected funds at shift end and managers to acknowledge receipt.
              </p>
            </div>
            <Switch
              checked={enableMoneyCollection}
              onCheckedChange={setEnableMoneyCollection}
            />
          </div>
          <div className="rounded-lg border border-muted/50 bg-muted/5 p-4">
            <p className="text-sm">
              When enabled, a "Collections" menu will appear in the Finance section. Sellers will be prompted to report their physical cash/MOMO/Card counts during shift closure, and authorized collectors must verify and sign off on the receipt of funds.
            </p>
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving} className="w-full">
        {saving ? 'Saving...' : 'Save All Settings'}
      </Button>
    </div>
  );
}
