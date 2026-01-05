import { useState, useEffect } from 'react';
import { useStoreContext, InvoiceSettings as IInvoiceSettings } from '@/contexts/StoreContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Loader2, Save, Printer } from 'lucide-react';
import { InvoiceTemplateRenderer, AVAILABLE_TEMPLATES } from '@/components/invoices/InvoiceTemplateRenderer';
import { InvoiceData } from '@/components/invoices/types';
import { TenantPageWrapper } from '@/components/tenant/TenantPageWrapper';

// Dummy data for preview
const DUMMY_DATA: InvoiceData = {
  invoiceNumber: 'INV-2024-001',
  date: new Date().toISOString(),
  dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  status: 'pending',
  businessName: 'Delish Bakery',
  businessAddress: '123 Baker Street\nKigali, Rwanda',
  businessPhone: '+250 788 123 456',
  businessEmail: 'info@delish.rw',
  businessLogo: '', // Will be injected from store
  customerName: 'John Doe',
  customerAddress: '456 Customer Lane\nKigali, Rwanda',
  customerPhone: '+250 788 987 654',
  customerEmail: 'john@example.com',
  items: [
    { name: 'Chocolate Cake', quantity: 1, price: 25000, subtotal: 25000 },
    { name: 'Croissant', quantity: 5, price: 2000, subtotal: 10000 },
    { name: 'Cappuccino', quantity: 2, price: 3500, subtotal: 7000 },
  ],
  subtotal: 42000,
  tax: 7560,
  total: 49560,
  currency: 'RWF',
  notes: 'Thank you for dining with us!',
};

export default function InvoiceSettings() {
  const { store, setStore } = useStoreContext();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('templates');
  
  // Local state for editing
  const [selectedTemplate, setSelectedTemplate] = useState<string>('classic');
  const [settings, setSettings] = useState<IInvoiceSettings>({
    showLogo: true,
    logoPosition: 'right',
    primaryColor: '#000000',
    secondaryColor: '#ffffff',
    showBusinessDetails: true,
    showCustomerDetails: true,
    showPaymentTerms: true,
    itemFormat: 'detailed',
    footerText: 'Thank you for your business!',
    fontFamily: 'Inter',
  });

  // Initialize from store
  useEffect(() => {
    if (store) {
      setSelectedTemplate(store.invoiceTemplateId || 'classic');
      if (store.invoiceSettings) {
        setSettings(store.invoiceSettings);
      }
      // Inject store logo into dummy data
      if (store.logoUrl) {
        DUMMY_DATA.businessLogo = store.logoUrl;
        DUMMY_DATA.businessName = store.name;
        DUMMY_DATA.currency = store.currency;
      }
    }
  }, [store]);

  const handleSave = async () => {
    if (!store) return;
    setLoading(true);

    try {
      const { error } = await supabase
        .from('businesses')
        .update({
          invoice_template_id: selectedTemplate,
          invoice_settings: settings as any, // Cast to any for now if types aren't updated
        })
        .eq('id', store.id);

      if (error) throw error;

      // Update local store context
      setStore({
        ...store,
        invoiceTemplateId: selectedTemplate,
        invoiceSettings: settings,
      });

      toast.success('Invoice settings saved successfully');
    } catch (error) {
      console.error('Error saving invoice settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = <K extends keyof IInvoiceSettings>(key: K, value: IInvoiceSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  // Preview data with live settings
  const previewData = {
    ...DUMMY_DATA,
    businessLogo: store?.logoUrl || '',
    businessName: store?.name || DUMMY_DATA.businessName,
    currency: store?.currency || DUMMY_DATA.currency,
  };

  return (
    <TenantPageWrapper title="Invoice Settings" description="Customize your invoice layout and design">
      <div className="flex flex-col lg:flex-row gap-8 h-[calc(100vh-12rem)]">
        
        {/* Left Panel: Controls */}
        <div className="w-full lg:w-1/3 flex flex-col gap-6 overflow-y-auto pr-2 pb-10">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="templates">Templates</TabsTrigger>
              <TabsTrigger value="customization">Customization</TabsTrigger>
            </TabsList>

            <TabsContent value="templates" className="mt-4 space-y-4">
              <div className="grid grid-cols-1 gap-4">
                {AVAILABLE_TEMPLATES.map((template) => (
                  <Card 
                    key={template.id} 
                    className={`cursor-pointer transition-all hover:border-primary ${selectedTemplate === template.id ? 'border-primary ring-2 ring-primary/20' : ''}`}
                    onClick={() => setSelectedTemplate(template.id)}
                  >
                    <CardHeader className="p-4">
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                      <CardDescription>{template.description}</CardDescription>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="customization" className="mt-4 space-y-6">
              
              {/* Branding Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Branding</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="show-logo">Show Logo</Label>
                    <Switch 
                      id="show-logo" 
                      checked={settings.showLogo}
                      onCheckedChange={(checked) => updateSetting('showLogo', checked)}
                    />
                  </div>
                  
                  {settings.showLogo && (
                    <div className="space-y-2">
                      <Label>Logo Position</Label>
                      <Select 
                        value={settings.logoPosition} 
                        onValueChange={(val: any) => updateSetting('logoPosition', val)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="left">Left</SelectItem>
                          <SelectItem value="center">Center</SelectItem>
                          <SelectItem value="right">Right</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Primary Color</Label>
                      <div className="flex gap-2">
                        <Input 
                          type="color" 
                          value={settings.primaryColor} 
                          onChange={(e) => updateSetting('primaryColor', e.target.value)}
                          className="w-10 p-1 h-9"
                        />
                        <Input 
                          value={settings.primaryColor} 
                          onChange={(e) => updateSetting('primaryColor', e.target.value)}
                          className="flex-1 font-mono uppercase"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Secondary Color</Label>
                      <div className="flex gap-2">
                         <Input 
                          type="color" 
                          value={settings.secondaryColor} 
                          onChange={(e) => updateSetting('secondaryColor', e.target.value)}
                          className="w-10 p-1 h-9"
                        />
                        <Input 
                          value={settings.secondaryColor} 
                          onChange={(e) => updateSetting('secondaryColor', e.target.value)}
                          className="flex-1 font-mono uppercase"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Font Family</Label>
                    <Select 
                      value={settings.fontFamily} 
                      onValueChange={(val) => updateSetting('fontFamily', val)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Inter">Inter (Sans-serif)</SelectItem>
                        <SelectItem value="Times New Roman">Times New Roman (Serif)</SelectItem>
                        <SelectItem value="Courier New">Courier New (Monospace)</SelectItem>
                        <SelectItem value="Arial">Arial</SelectItem>
                        <SelectItem value="Georgia">Georgia</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Content Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Content</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="show-business">Business Details</Label>
                    <Switch 
                      id="show-business" 
                      checked={settings.showBusinessDetails}
                      onCheckedChange={(checked) => updateSetting('showBusinessDetails', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="show-customer">Customer Details</Label>
                    <Switch 
                      id="show-customer" 
                      checked={settings.showCustomerDetails}
                      onCheckedChange={(checked) => updateSetting('showCustomerDetails', checked)}
                    />
                  </div>
                   <div className="flex items-center justify-between">
                    <Label htmlFor="show-terms">Payment Terms / Footer</Label>
                    <Switch 
                      id="show-terms" 
                      checked={settings.showPaymentTerms}
                      onCheckedChange={(checked) => updateSetting('showPaymentTerms', checked)}
                    />
                  </div>
                  
                  {settings.showPaymentTerms && (
                    <div className="space-y-2">
                      <Label>Footer Text</Label>
                      <Input 
                        value={settings.footerText} 
                        onChange={(e) => updateSetting('footerText', e.target.value)}
                        placeholder="e.g. Thank you for your business!"
                      />
                    </div>
                  )}
                </CardContent>
              </Card>

            </TabsContent>
          </Tabs>

          <Button onClick={handleSave} disabled={loading} className="w-full mt-auto">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Save className="mr-2 h-4 w-4" />
            Save Changes
          </Button>
        </div>

        {/* Right Panel: Preview */}
        <div className="flex-1 bg-gray-100 rounded-lg p-8 overflow-y-auto border relative shadow-inner">
          <div className="absolute top-4 right-4 z-10 print:hidden">
             <Button variant="secondary" size="sm" onClick={() => window.print()}>
               <Printer className="mr-2 h-4 w-4" />
               Test Print
             </Button>
          </div>
          <div className="origin-top transform scale-[0.6] lg:scale-[0.75] xl:scale-[0.85] 2xl:scale-100 transition-transform shadow-2xl mx-auto bg-white min-h-[297mm] w-[210mm] print:scale-100 print:shadow-none">
            <InvoiceTemplateRenderer 
              templateId={selectedTemplate} 
              data={previewData} 
              settings={settings} 
            />
          </div>
        </div>
      </div>
    </TenantPageWrapper>
  );
}
