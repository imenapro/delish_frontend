import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SystemSettings } from '@/components/admin/SystemSettings';
import { CountryManagement } from '@/components/super-admin/CountryManagement';
import { BusinessTypeManagement } from '@/components/super-admin/BusinessTypeManagement';
import { CurrencyManagement } from '@/components/super-admin/CurrencyManagement';
import { Settings, MapPin, Building2, DollarSign } from 'lucide-react';

export function SuperAdminSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground">
          Manage system-wide settings, countries, and business types.
        </p>
      </div>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList>
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="countries" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Countries
          </TabsTrigger>
          <TabsTrigger value="business-types" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Business Types
          </TabsTrigger>
          <TabsTrigger value="currencies" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Currencies
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <SystemSettings />
        </TabsContent>

        <TabsContent value="countries" className="space-y-4">
          <CountryManagement />
        </TabsContent>

        <TabsContent value="business-types" className="space-y-4">
          <BusinessTypeManagement />
        </TabsContent>

        <TabsContent value="currencies" className="space-y-4">
          <CurrencyManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
}
