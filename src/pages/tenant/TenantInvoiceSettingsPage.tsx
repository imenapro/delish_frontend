import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useStoreContext, InvoiceSettings } from '@/contexts/StoreContext';
import { InvoiceTemplateRenderer, AVAILABLE_TEMPLATES } from '@/components/invoices/InvoiceTemplateRenderer';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Printer } from 'lucide-react';
import { InvoiceData } from '@/components/invoices/types';
import { useReactToPrint } from 'react-to-print';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Link } from 'react-router-dom';

export default function TenantInvoiceSettingsPage() {
  const { store, refreshStore, getTenantRoute } = useStoreContext();
  const [loading, setLoading] = useState(false);
  const [templateId, setTemplateId] = useState('classic');
  const [settings, setSettings] = useState<InvoiceSettings>({
    fontFamily: 'Inter',
    primaryColor: '#000000',
    secondaryColor: '#666666',
    showLogo: true,
    logoPosition: 'left',
    showBusinessDetails: true,
    showCustomerDetails: true,
    showPaymentTerms: true,
    itemFormat: 'detailed',
    footerText: '',
  });

  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: 'Invoice Preview',
  });

  useEffect(() => {
    if (store) {
      if (store.invoiceTemplateId) {
        setTemplateId(store.invoiceTemplateId);
      }
      if (store.invoiceSettings) {
        setSettings(prev => ({
            ...prev,
            ...store.invoiceSettings
        }));
      } else {
         // Default settings if none exist, but use store colors if available
         setSettings(prev => ({
             ...prev,
             primaryColor: store.primaryColor || prev.primaryColor,
             secondaryColor: store.secondaryColor || prev.secondaryColor
         }));
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
          invoice_template_id: templateId,
          invoice_settings: settings
        })
        .eq('id', store.id);

      if (error) throw error;
      
      toast.success('Invoice settings updated successfully');
      refreshStore();
    } catch (error) {
      console.error('Error updating invoice settings:', error);
      toast.error('Failed to update invoice settings');
    } finally {
      setLoading(false);
    }
  };

  // Mock data for preview
  const previewData: InvoiceData = {
    invoiceNumber: 'INV-2024-001',
    date: new Date().toISOString(),
    status: 'PENDING',
    businessName: store?.name || 'Frank Gift Store',
    businessAddress: '123 Baker Street Kigali, Rwanda',
    businessPhone: '+250 788 123 456',
    businessEmail: store?.ownerEmail || 'info@delish.rw',
    businessLogo: store?.logoUrl,
    customerName: 'John Doe',
    customerAddress: '456 Customer Lane Kigali, Rwanda',
    customerPhone: '+250 788 987 654',
    customerEmail: 'john@example.com',
    items: [
      { name: 'Product A', quantity: 2, price: 50, subtotal: 100 },
      { name: 'Service B', quantity: 1, price: 150, subtotal: 150 },
    ],
    subtotal: 250,
    tax: 25,
    total: 275,
    currency: store?.currency || 'RWF',
    paymentMethod: 'Credit Card',
    notes: 'Thank you for your business!'
  };

  return (
    <div className="space-y-6 p-6">
      {/* Breadcrumb */}
      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
         <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to={getTenantRoute('/dashboard')}>Home</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to={getTenantRoute('/invoices')}>Invoices</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Settings</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Invoice Settings</h1>
        <p className="text-muted-foreground">Customize your invoice layout and design</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <Card>
            <CardContent className="p-6">
               <Tabs defaultValue="templates" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 mb-6">
                    <TabsTrigger value="templates">Templates</TabsTrigger>
                    <TabsTrigger value="customization">Customization</TabsTrigger>
                  </TabsList>

                  <TabsContent value="templates" className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        {AVAILABLE_TEMPLATES.map((template) => (
                            <div 
                                key={template.id}
                                className={`cursor-pointer border rounded-lg p-4 hover:border-primary transition-all ${templateId === template.id ? 'border-primary bg-primary/5 ring-1 ring-primary' : ''}`}
                                onClick={() => setTemplateId(template.id)}
                            >
                                <div className="font-medium">{template.name}</div>
                                <div className="text-xs text-muted-foreground">{template.description}</div>
                            </div>
                        ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="customization" className="space-y-6">
                    {/* Branding Section */}
                    <div className="space-y-4">
                        <h3 className="font-medium">Branding</h3>
                        
                        <div className="flex items-center justify-between">
                        <Label htmlFor="show-logo">Show Logo</Label>
                        <Switch 
                            id="show-logo" 
                            checked={settings.showLogo}
                            onCheckedChange={(checked) => setSettings({ ...settings, showLogo: checked })}
                        />
                        </div>
                        
                        <div className="space-y-2">
                            <Label>Logo Position</Label>
                            <Select 
                                value={settings.logoPosition} 
                                onValueChange={(val) => setSettings({ ...settings, logoPosition: val as any })}
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

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Primary Color</Label>
                                <div className="flex gap-2">
                                    <div className="w-8 h-8 rounded border" style={{ backgroundColor: settings.primaryColor }}></div>
                                    <Input 
                                        type="text" 
                                        value={settings.primaryColor}
                                        onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })}
                                        className="font-mono uppercase"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Secondary Color</Label>
                                <div className="flex gap-2">
                                    <div className="w-8 h-8 rounded border" style={{ backgroundColor: settings.secondaryColor }}></div>
                                    <Input 
                                        type="text" 
                                        value={settings.secondaryColor}
                                        onChange={(e) => setSettings({ ...settings, secondaryColor: e.target.value })}
                                        className="font-mono uppercase"
                                    />
                                </div>
                            </div>
                        </div>

                         <div className="space-y-2">
                            <Label>Font Family</Label>
                            <Select 
                                value={settings.fontFamily} 
                                onValueChange={(val) => setSettings({ ...settings, fontFamily: val })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Inter">Inter (Sans-serif)</SelectItem>
                                    <SelectItem value="Times New Roman">Times New Roman (Serif)</SelectItem>
                                    <SelectItem value="Courier New">Courier New (Monospace)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t">
                        <h3 className="font-medium">Content</h3>
                         <div className="flex items-center justify-between">
                            <Label htmlFor="show-business">Show Business Details</Label>
                            <Switch 
                                id="show-business" 
                                checked={settings.showBusinessDetails}
                                onCheckedChange={(checked) => setSettings({ ...settings, showBusinessDetails: checked })}
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <Label htmlFor="show-customer">Show Customer Details</Label>
                            <Switch 
                                id="show-customer" 
                                checked={settings.showCustomerDetails}
                                onCheckedChange={(checked) => setSettings({ ...settings, showCustomerDetails: checked })}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="footer-text">Footer Text</Label>
                            <Textarea 
                                id="footer-text" 
                                placeholder="Thank you for your business!"
                                value={settings.footerText}
                                onChange={(e) => setSettings({ ...settings, footerText: e.target.value })}
                            />
                        </div>
                    </div>
                  </TabsContent>
               </Tabs>

               <div className="mt-6 pt-6 border-t">
                 <Button onClick={handleSave} disabled={loading} className="w-full">
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Changes
                 </Button>
               </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
           <Card className="h-full flex flex-col bg-slate-50">
              <CardHeader className="flex flex-row items-center justify-end pb-2">
                  <Button variant="outline" size="sm" onClick={handlePrint}>
                      <Printer className="w-4 h-4 mr-2" />
                      Test Print
                  </Button>
              </CardHeader>
              <CardContent className="flex-1 p-4 flex items-start justify-center overflow-hidden">
                   {/* Visual Preview (Scaled) */}
                   <div className="origin-top scale-[0.65] shadow-xl bg-white min-h-[800px] w-[210mm]">
                      <InvoiceTemplateRenderer 
                          templateId={templateId} 
                          data={previewData} 
                          settings={settings} 
                      />
                   </div>

                   {/* Hidden Print Content (Full Size) */}
                   <div className="absolute left-[-10000px] top-0">
                       <div ref={printRef} className="bg-white p-8 w-[210mm] min-h-[297mm]">
                            <InvoiceTemplateRenderer 
                                templateId={templateId} 
                                data={previewData} 
                                settings={settings} 
                            />
                       </div>
                   </div>
              </CardContent>
           </Card>
        </div>
      </div>
    </div>
  );
}
