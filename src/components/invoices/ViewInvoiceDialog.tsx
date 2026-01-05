import React, { useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { FileText, Printer, Share2, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useReactToPrint } from 'react-to-print';
import { Receipt } from '@/components/pos/Receipt';
import { InvoiceTemplateRenderer } from '@/components/invoices/InvoiceTemplateRenderer';
import { InvoiceData } from '@/components/invoices/types';
import { ShareInvoiceDialog } from '@/components/invoices/ShareInvoiceDialog';
import { useStoreContext } from '@/contexts/StoreContext';
import { DEFAULT_SYSTEM_CURRENCY } from '@/utils/currency';

interface ViewInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: any;
}

export function ViewInvoiceDialog({ open, onOpenChange, invoice }: ViewInvoiceDialogProps) {
  const { store } = useStoreContext();
  const currency = store?.currency || DEFAULT_SYSTEM_CURRENCY;
  const [shareOpen, setShareOpen] = useState(false);
  const a4PrintRef = useRef<HTMLDivElement>(null);
  const a5PrintRef = useRef<HTMLDivElement>(null);
  const thermalPrintRef = useRef<HTMLDivElement>(null);
  const thermal58PrintRef = useRef<HTMLDivElement>(null);

  const handlePrintA4 = useReactToPrint({
    contentRef: a4PrintRef,
  });

  const handlePrintA5 = useReactToPrint({
    contentRef: a5PrintRef,
  });

  const handlePrintThermal = useReactToPrint({
    contentRef: thermalPrintRef,
  });

  const handlePrintThermal58 = useReactToPrint({
    contentRef: thermal58PrintRef,
  });

  if (!invoice) return null;

  const items = invoice.items_snapshot || [];
  const customer = invoice.customer_info;

  // Prepare data for Receipt component
  const receiptOrder = {
    invoice_number: invoice.invoice_number,
    created_at: invoice.created_at,
    customer_phone: invoice.customer_info?.phone,
    payment_method: invoice.payment_method,
    total_amount: invoice.total_amount,
    order_code: invoice.invoice_number,
  };

  const receiptShop = invoice.shop || { name: 'Shop' };
  
  const receiptBusiness = {
    logo_url: receiptShop.logo_url,
    metadata: {
        registration_number: 'N/A'
    }
  };

  // Prepare invoice data for the renderer
  const invoiceData: InvoiceData = {
      invoiceNumber: invoice.invoice_number,
      date: invoice.created_at,
      status: invoice.status,
      businessName: invoice.shop?.name || store?.name || 'Business Name',
      businessAddress: invoice.shop?.address,
      businessPhone: invoice.shop?.phone,
      businessEmail: invoice.shop?.email,
      businessLogo: invoice.shop?.logo_url || store?.logoUrl,
      customerName: customer?.name || 'Guest',
      customerAddress: customer?.address,
      customerPhone: customer?.phone,
      customerEmail: customer?.email,
      items: items.map((item: any) => ({
          name: item.name || item.product?.name,
          quantity: item.quantity,
          price: item.unit_price,
          subtotal: item.subtotal || (item.unit_price * item.quantity),
      })),
      subtotal: Number(invoice.subtotal),
      tax: Number(invoice.tax_amount),
      total: Number(invoice.total_amount),
      notes: invoice.notes,
      currency: currency,
      paymentMethod: invoice.payment_method,
  };

  const invoiceSettings = store?.invoiceSettings || {
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
  };

  // Safe fallback for settings properties if they are missing
  const safeSettings = {
      ...invoiceSettings,
      secondaryColor: invoiceSettings.secondaryColor || '#666666',
      logoPosition: invoiceSettings.logoPosition || 'left',
      itemFormat: invoiceSettings.itemFormat || 'detailed',
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-full sm:max-w-lg md:max-w-2xl h-[90vh] flex flex-col p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Invoice Details
            </DialogTitle>
            <DialogDescription>
              View detailed information about this invoice.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 bg-muted/20 border-dashed flex flex-col overflow-hidden min-h-0 mt-2 rounded-lg border">
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                <div className="origin-top scale-[0.6] sm:scale-[0.7] md:scale-[0.8] w-fit mx-auto shadow-lg">
                     <InvoiceTemplateRenderer 
                        templateId={store?.invoiceTemplateId || 'classic'} 
                        data={invoiceData} 
                        settings={safeSettings} 
                    />
                </div>
            </div>
          </div>

          <DialogFooter className="mt-4 gap-2 sm:gap-0">
             <div className="flex w-full gap-2">
               <Button variant="outline" className="flex-1 sm:flex-none" onClick={() => setShareOpen(true)}>
                 <Share2 className="h-4 w-4 mr-2" />
                 Share
               </Button>
               
               <DropdownMenu>
                 <DropdownMenuTrigger asChild>
                   <Button className="flex-1 sm:flex-none">
                     <Printer className="h-4 w-4 mr-2" />
                     Print
                     <ChevronDown className="h-4 w-4 ml-1 opacity-50" />
                   </Button>
                 </DropdownMenuTrigger>
                 <DropdownMenuContent align="end">
                   <DropdownMenuItem onClick={() => handlePrintA4()}>
                     Print A4 Invoice
                   </DropdownMenuItem>
                   <DropdownMenuItem onClick={() => handlePrintA5()}>
                     Print A5 Invoice
                   </DropdownMenuItem>
                   <DropdownMenuItem onClick={() => handlePrintThermal()}>
                     Print Thermal Receipt (80mm)
                   </DropdownMenuItem>
                   <DropdownMenuItem onClick={() => handlePrintThermal58()}>
                     Print Thermal Receipt (58mm)
                   </DropdownMenuItem>
                 </DropdownMenuContent>
               </DropdownMenu>
             </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ShareInvoiceDialog 
        open={shareOpen} 
        onOpenChange={setShareOpen} 
        invoice={invoice} 
      />

      {/* Hidden Print Templates */}
      <div className="hidden">
        <div ref={a4PrintRef}>
            <InvoiceTemplateRenderer 
                templateId={store?.invoiceTemplateId || 'classic'} 
                data={invoiceData} 
                settings={safeSettings} 
            />
        </div>
        <div ref={a5PrintRef}>
             <InvoiceTemplateRenderer 
                templateId={store?.invoiceTemplateId || 'classic'} 
                data={invoiceData} 
                settings={safeSettings} 
            />
        </div>
        <Receipt 
            ref={thermalPrintRef}  
            order={receiptOrder} 
            items={items} 
            shop={receiptShop} 
            business={receiptBusiness}
            payment={{
                amountPaid: Number(invoice.total_amount),
                change: 0
            }}
            width="80mm"
            currency={currency}
            invoiceSettings={safeSettings}
            templateId={store?.invoiceTemplateId}
        />
        <Receipt 
            ref={thermal58PrintRef} 
            order={receiptOrder} 
            items={items} 
            shop={receiptShop} 
            business={receiptBusiness}
            payment={{
                amountPaid: Number(invoice.total_amount),
                change: 0
            }}
            width="58mm"
            currency={currency}
            invoiceSettings={safeSettings}
            templateId={store?.invoiceTemplateId}
        />
      </div>
    </>
  );
}

