import { useState } from 'react';
import { TenantPageWrapper } from '@/components/tenant/TenantPageWrapper';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield, Settings, Database, Key, Globe } from 'lucide-react';
import { useStoreContext } from '@/contexts/StoreContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function TenantAdmin() {
  const { store, refreshStore } = useStoreContext();
  const [customDomain, setCustomDomain] = useState(store?.customDomain || '');
  const [loading, setLoading] = useState(false);

  const handleUpdateDomain = async () => {
    if (!store) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('businesses')
        .update({ custom_domain: customDomain || null } as any)
        .eq('id', store.id);

      if (error) throw error;
      
      toast.success('Custom domain updated successfully');
      refreshStore();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update custom domain');
    } finally {
      setLoading(false);
    }
  };

  return (
    <TenantPageWrapper
      title="Administration"
      description="System settings and business configuration"
    >
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Status</CardTitle>
            <Shield className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Active</div>
            <p className="text-xs text-muted-foreground">All systems operational</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Configurations</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1</div>
            <p className="text-xs text-muted-foreground">Custom settings</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Backup Status</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">OK</div>
            <p className="text-xs text-muted-foreground">Last: Never</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">API Keys</CardTitle>
            <Key className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">Active keys</p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Domain Settings
            </CardTitle>
            <CardDescription>Configure your custom domain for white-labeling</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 items-end max-w-md">
              <div className="space-y-2 flex-1">
                <Label htmlFor="customDomain">Custom Domain</Label>
                <Input
                  id="customDomain"
                  placeholder="e.g. delish.rw"
                  value={customDomain}
                  onChange={(e) => setCustomDomain(e.target.value)}
                />
              </div>
              <Button onClick={handleUpdateDomain} disabled={loading}>
                {loading ? 'Saving...' : 'Save'}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Point your domain's A record to our server IP or CNAME to our app domain before saving.
            </p>
          </CardContent>
        </Card>
      </div>
    </TenantPageWrapper>
  );
}
