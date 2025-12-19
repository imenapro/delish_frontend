import React, { useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, User, Store, CreditCard, Calendar, Info, Printer, Share2, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useReactToPrint } from 'react-to-print';
import { Receipt } from '@/components/pos/Receipt';
import { InvoiceA4 } from '@/components/invoices/InvoiceA4';
import { ShareInvoiceDialog } from '@/components/invoices/ShareInvoiceDialog';

interface ViewInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: any;
}

export function ViewInvoiceDialog({ open, onOpenChange, invoice }: ViewInvoiceDialogProps) {
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
    // Add other fields as needed by Receipt
    order_code: invoice.invoice_number, // Fallback
  };

  const receiptShop = invoice.shop || { name: 'Shop' };
  
  // Mock business data if not available in invoice
  const receiptBusiness = {
    // This would ideally come from the parent or context, but for now we use defaults or empty
    // If shop has logo_url, we use it.
    logo_url: receiptShop.logo_url,
    metadata: {
        registration_number: 'N/A' // Or fetch if available
    }
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
              View detailed information about this invoice, including items, customer details, and payment status.
            </DialogDescription>
          </DialogHeader>

          <Card className="flex-1 bg-muted/20 border-dashed flex flex-col overflow-hidden min-h-0 mt-2">
            <CardHeader className="py-3 px-4 bg-muted/30 shrink-0 border-b">
                <div className="flex justify-between items-center">
                    <CardTitle className="text-sm font-medium">Invoice #{invoice.invoice_number}</CardTitle>
                    <Badge variant={invoice.status === 'paid' ? 'default' : 'secondary'}>
                        {invoice.status}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-hidden flex flex-col min-h-0">
                <ScrollArea className="h-full w-full">
                    <div className="p-4 sm:p-6 space-y-6 text-sm pb-20">
                        {/* Metadata Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 text-xs border-b pb-6">
                            <span className="text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" /> Date:</span> 
                            <span className="font-medium text-right">{format(new Date(invoice.created_at), 'MMM d, yyyy HH:mm')}</span>
                            
                            <span className="text-muted-foreground flex items-center gap-1"><Store className="h-3 w-3" /> Shop:</span> 
                            <span className="font-medium text-right">{invoice.shop?.name || '-'}</span>
                            
                            <span className="text-muted-foreground flex items-center gap-1"><User className="h-3 w-3" /> Customer:</span> 
                            <span className="font-medium text-right">{customer?.name || 'Guest'}</span>
                            
                            <span className="text-muted-foreground flex items-center gap-1"><FileText className="h-3 w-3" /> Ref:</span> 
                            <span className="font-mono text-xs text-right">{invoice.invoice_number}</span>

                            <span className="text-muted-foreground flex items-center gap-1"><Info className="h-3 w-3" /> Source:</span> 
                            <span className="font-medium text-right uppercase">POS</span>
                            
                            <span className="text-muted-foreground flex items-center gap-1"><CreditCard className="h-3 w-3" /> Payment:</span> 
                            <span className="font-medium text-right capitalize">{invoice.payment_method?.replace('_', ' ') || '-'}</span>
                        </div>
                        
                        {/* Items */}
                        <div>
                            <h4 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground mb-2">Items</h4>
                            <div className="border rounded-lg bg-card overflow-hidden">
                                <div className="divide-y">
                                    {items.map((item: any, index: number) => (
                                        <div key={index} className="p-3 flex justify-between items-center text-sm">
                                            <div>
                                                <span className="font-medium">{item.quantity}x</span> {item.name || item.product?.name}
                                            </div>
                                            <div className="font-medium">
                                                {(item.subtotal || (item.unit_price * item.quantity)).toLocaleString()} RWF
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Financials */}
                        <div className="bg-card rounded-lg p-3 border space-y-2 shadow-sm">
                            <div className="flex justify-between text-xs">
                                <span>Subtotal</span>
                                <span>{Number(invoice.subtotal).toLocaleString()} RWF</span>
                            </div>
                            <div className="flex justify-between text-xs">
                                <span>Tax</span>
                                <span>{Number(invoice.tax_amount).toLocaleString()} RWF</span>
                            </div>
                            <div className="border-t my-1"></div>
                            <div className="flex justify-between font-bold text-sm">
                                <span>Total Amount</span>
                                <span className="text-primary">{Number(invoice.total_amount).toLocaleString()} RWF</span>
                            </div>
                        </div>

                        {/* Notes */}
                        {invoice.notes && (
                            <div className="bg-muted rounded-lg p-3 overflow-hidden">
                                <h4 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground mb-1">Notes</h4>
                                <p className="text-xs italic">{invoice.notes}</p>
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </CardContent>
          </Card>

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
        <InvoiceA4 ref={a4PrintRef} invoice={invoice} size="a4" />
        <InvoiceA4 ref={a5PrintRef} invoice={invoice} size="a5" />
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
        />
      </div>
    </>
  );
}
