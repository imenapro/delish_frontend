import { TenantPageWrapper } from '@/components/tenant/TenantPageWrapper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Shield, Globe, Search } from 'lucide-react';
import { useState } from 'react';
import { useStoreContext } from '@/contexts/StoreContext';
import { isCustomDomain } from '@/utils/domainMapping';
import { TenantEmailSettings } from '@/components/tenant/TenantEmailSettings';
import { TenantCurrencySettings } from '@/components/tenant/TenantCurrencySettings';
import { TenantTaxManagement } from '@/components/tenant/TenantTaxManagement';
import { TenantDomainSettings } from '@/components/tenant/TenantDomainSettings';
import { TenantPaymentMethods } from '@/components/finance/payment-methods/TenantPaymentMethods';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UIPersistenceSettings } from '@/components/settings/ui-persistence-settings';

export default function TenantAdmin() {
  const { store } = useStoreContext();
  const [searchQuery, setSearchQuery] = useState('');

  const sections = [
    { id: 'domain', title: 'Custom Domain', component: <TenantDomainSettings />, category: 'general', keywords: ['domain', 'url', 'web', 'address'] },
    { id: 'ui-persistence', title: 'UI Persistence', component: <UIPersistenceSettings />, category: 'general', keywords: ['ui', 'persistence', 'window', 'blur', 'close'] },
    { id: 'currency', title: 'Currency Settings', component: <TenantCurrencySettings />, category: 'general', keywords: ['currency', 'money', 'format', 'symbol'] },
    { id: 'payment-methods', title: 'Payment Methods', component: <TenantPaymentMethods />, category: 'financial', keywords: ['payment', 'card', 'visa', 'money', 'bank'] },
    { id: 'tax', title: 'Tax Management', component: <TenantTaxManagement />, category: 'financial', keywords: ['tax', 'vat', 'gst', 'rate'] },
    { id: 'email', title: 'Email Settings', component: <TenantEmailSettings />, category: 'communication', keywords: ['email', 'smtp', 'mail', 'sender'] },
  ];

  const filteredSections = sections.filter(section => 
    section.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    section.keywords.some(k => k.includes(searchQuery.toLowerCase()))
  );

  return (
    <TenantPageWrapper
      title="Administration"
      description="System settings and business configuration"
    >
      <div className="flex flex-col space-y-6">
        {/* Search Bar */}
        <div className="relative max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search settings..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {searchQuery ? (
          <div className="space-y-6">
            <h3 className="text-lg font-medium">Search Results</h3>
            {filteredSections.length > 0 ? (
              filteredSections.map(section => (
                <div key={section.id}>{section.component}</div>
              ))
            ) : (
              <p className="text-muted-foreground">No settings found matching "{searchQuery}"</p>
            )}
          </div>
        ) : (
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="financial">Financial</TabsTrigger>
              <TabsTrigger value="communication">Communication</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
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
              </div>
            </TabsContent>

            <TabsContent value="general" className="space-y-6">
              <TenantDomainSettings />
              <UIPersistenceSettings />
              <TenantCurrencySettings />
            </TabsContent>

            <TabsContent value="financial" className="space-y-6">
              <div className="flex flex-col space-y-8">
                <section>
                  <TenantPaymentMethods />
                </section>
                <section className="pt-8 border-t">
                  <TenantTaxManagement />
                </section>
              </div>
            </TabsContent>

            <TabsContent value="communication" className="space-y-6">
              <TenantEmailSettings />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </TenantPageWrapper>
  );
}
