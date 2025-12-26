import { TenantPageWrapper } from '@/components/tenant/TenantPageWrapper';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Shield, Settings, Database, Key, Globe, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useState } from 'react';
import { useStoreContext } from '@/contexts/StoreContext';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { isCustomDomain } from '@/utils/domainMapping';
import { TenantEmailSettings } from '@/components/tenant/TenantEmailSettings';

export default function TenantAdmin() {
  const { store, refreshStore } = useStoreContext();
  const { toast } = useToast();
  const [customDomain, setCustomDomain] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const handleConnectDomain = async () => {
    setLastError(null);
    if (!customDomain) return;
    
    // Basic validation
    const domainRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
    if (!domainRegex.test(customDomain)) {
      toast({
        title: "Invalid Domain",
        description: "Please enter a valid domain name (e.g., myshop.com)",
        variant: "destructive"
      });
      return;
    }

    if (!store?.id) {
      toast({
        title: "System Error",
        description: "Store ID is missing. Please refresh the page.",
        variant: "destructive"
      });
      return;
    }

    setIsConnecting(true);
    try {
      console.log('Sending request for:', { domain: customDomain, storeId: store.id });
      
      const env = import.meta.env as unknown as Record<string, string>;
      const { data, error } = await supabase.functions.invoke('add-domain', {
        body: { 
          domain: customDomain, 
          storeId: store.id,
          // Pass environment info to help server decide which DO App to update
          appEnv: env.VITE_APP_ENV || env.MODE
        }
      });

      if (error) {
        console.error('Supabase Function Error:', error);
        // Try to parse the error message from the response if possible
        // The error object from invoke often has a 'message' or is the response text
        let errorMessage = "Failed to connect domain";
        try {
           if (typeof error === 'object' && error !== null) {
              // @ts-expect-error - error object structure is unknown
              errorMessage = error.message || JSON.stringify(error);
           } else {
              errorMessage = String(error);
           }
        } catch (e) {
           errorMessage = "Unknown error occurred";
        }
        throw new Error(errorMessage);
      }

      console.log('Domain connected successfully:', data);

      toast({
        title: "Domain Connected!",
        description: "We have updated our servers. Please ensure your DNS records are pointed correctly.",
      });
      setCustomDomain('');
      refreshStore();
    } catch (error: unknown) {
      console.error('Error connecting domain:', error);
      const msg = error instanceof Error ? error.message : "Could not connect domain. Please try again or contact support.";
      setLastError(msg);
      toast({
        title: "Connection Failed",
        description: msg,
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
      {lastError && (
        <div className="mb-6 p-4 bg-destructive/15 text-destructive rounded-md flex items-center gap-2 border border-destructive/20">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <p className="text-sm font-medium">{lastError}</p>
        </div>
      )}

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
            <div className="text-xl font-bold truncate" title={store?.customDomain || (isCustomDomain(window.location.hostname) ? window.location.hostname : `${window.location.hostname}/${store?.slug}`)}>
              {store?.customDomain || (isCustomDomain(window.location.hostname) 
                ? window.location.hostname 
                : `${window.location.hostname}/${store?.slug}`)}
            </div>
            <p className="text-xs text-muted-foreground">
              {store?.customDomain ? 'Primary Domain' : 'Current Access Point'}
            </p>
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
              {store?.customDomain ? (
                <div className="p-4 bg-green-50/50 border border-green-200 rounded-md dark:bg-green-900/20 dark:border-green-800">
                  <div className="flex items-center gap-2 text-green-700 dark:text-green-400 font-medium mb-1">
                    <CheckCircle className="h-5 w-5" />
                    Domain Connected
                  </div>
                  <p className="text-sm text-green-600 dark:text-green-500">
                    Your store is accessible at <a href={`https://${store.customDomain}`} target="_blank" rel="noopener noreferrer" className="underline font-bold">{store.customDomain}</a>
                  </p>
                  <div className="mt-4 pt-4 border-t border-green-200 dark:border-green-800">
                     <p className="text-xs text-muted-foreground mb-2">Want to change it?</p>
                     <div className="flex gap-2">
                      <Input 
                        placeholder="New domain..." 
                        value={customDomain}
                        onChange={(e) => setCustomDomain(e.target.value)}
                      />
                      <Button onClick={handleConnectDomain} disabled={isConnecting || !customDomain} variant="outline">
                        {isConnecting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update"}
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
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
              )}
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

      <div className="mt-6">
        <TenantEmailSettings />
      </div>
    </TenantPageWrapper>
  );
}
