import { TenantPageWrapper } from '@/components/tenant/TenantPageWrapper';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Shield, Settings, Database, Key, Globe, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useState } from 'react';
import { useStoreContext } from '@/contexts/StoreContext';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

export default function TenantAdmin() {
  const { store } = useStoreContext();
  const { toast } = useToast();
  const [customDomain, setCustomDomain] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnectDomain = async () => {
    if (!customDomain) return;
    
    // Basic validation
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/;
    if (!domainRegex.test(customDomain)) {
      toast({
        title: "Invalid Domain",
        description: "Please enter a valid domain name (e.g., myshop.com)",
        variant: "destructive"
      });
      return;
    }

    setIsConnecting(true);
    try {
      const { data, error } = await supabase.functions.invoke('add-domain', {
        body: { domain: customDomain, storeId: store?.id }
      });

      if (error) throw error;

      toast({
        title: "Domain Connected!",
        description: "We have updated our servers. Please ensure your DNS records are pointed correctly.",
      });
      setCustomDomain('');
    } catch (error: any) {
      console.error('Error connecting domain:', error);
      toast({
        title: "Connection Failed",
        description: error.message || "Could not connect domain. Please try again or contact support.",
        variant: "destructive"
      });
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <TenantPageWrapper
      title="Administration"
      description="System settings and business configuration"
    >
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* ... existing stats cards ... */}
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
            <CardTitle className="text-sm font-medium">Domain</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{window.location.hostname}</div>
            <p className="text-xs text-muted-foreground">Current Access Point</p>
          </CardContent>
        </Card>
        
        {/* ... other stats ... */}
      </div>

      <div className="grid gap-6 mt-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Custom Domain</CardTitle>
            <CardDescription>Connect your own domain (e.g., www.mybakery.com)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  To use your own domain, enter it below. Our system will automatically configure the necessary SSL certificates.
                </p>
                <div className="flex gap-2">
                  <Input 
                    placeholder="example.com" 
                    value={customDomain}
                    onChange={(e) => setCustomDomain(e.target.value)}
                  />
                  <Button onClick={handleConnectDomain} disabled={isConnecting || !customDomain}>
                    {isConnecting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Connect"}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  <AlertCircle className="h-3 w-3 inline mr-1" />
                  Make sure you have added a CNAME record pointing to <strong>{window.location.hostname}</strong> in your DNS provider first.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Administration</CardTitle>
            <CardDescription>Configure business settings and system preferences</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-center min-h-[200px]">
             {/* ... existing content ... */}
            <div className="text-center space-y-4">
              <Shield className="h-16 w-16 mx-auto text-muted-foreground" />
              <div>
                <h3 className="font-semibold text-lg">Admin Panel</h3>
                <p className="text-muted-foreground">Manage system settings and configurations</p>
              </div>
              <Button variant="outline">Open Settings</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </TenantPageWrapper>
  );
}
