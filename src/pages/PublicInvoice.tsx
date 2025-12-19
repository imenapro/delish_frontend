import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, User, Store, CreditCard, Calendar, Info, Printer, Download } from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useReactToPrint } from 'react-to-print';
import { InvoiceA4 } from '@/components/invoices/InvoiceA4';

export default function PublicInvoice() {
  const { shortId } = useParams<{ shortId: string }>();
  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
  });

  useEffect(() => {
    const fetchInvoice = async () => {
      if (!shortId) return;

      try {
        setLoading(true);
        // Try to find the invoice by matching the start of the ID
        // Note: filtering by UUID prefix might require casting to text or specific DB support.
        // For now, we attempt to fetch using a like filter on the ID cast to text implicitly if supported,
        // or we might need a more robust solution if this fails (e.g., RPC or full ID).
        
        // Since we can't easily do 'like' on UUID in standard PostgREST without casting,
        // and we want to avoid schema changes if possible, we'll try a different approach if this fails.
        // However, let's try the most direct way first.
        
        const { data, error } = await supabase
          .from('invoices')
          .select(`
            *,
            shop:shops (
              name,
              address,
              phone,
              logo_url
            )
          `)
          // Cast UUID to text for partial matching
          .filter('id::text', 'like', `${shortId}%`)
          .maybeSingle();

        if (error) throw error;
        if (!data) {
          setError('Invoice not found');
        } else {
          setInvoice(data);
        }
      } catch (err: any) {
        console.error('Error fetching invoice:', err);
        // Fallback: If the shortId is actually a full UUID (e.g. from a different link), try exact match
        if (shortId.length > 20) {
             const { data, error } = await supabase
              .from('invoices')
              .select('*, shop:shops(*)')
              .eq('id', shortId)
              .maybeSingle();
             if (data) {
                 setInvoice(data);
                 setError(null);
             } else {
                 setError('Invoice not found or access denied');
             }
        } else {
             setError('Invoice not found or access denied');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchInvoice();
  }, [shortId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
        <div className="text-center space-y-4">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto" />
          <h1 className="text-xl font-semibold text-gray-900">Invoice Not Found</h1>
          <p className="text-gray-500 max-w-sm mx-auto">{error || "The invoice you are looking for does not exist or has been removed."}</p>
        </div>
      </div>
    );
  }

  const items = invoice.items_snapshot || [];
  const customer = invoice.customer_info;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Invoice Viewer</h1>
            <Button onClick={() => handlePrint()} variant="outline" className="gap-2">
                <Printer className="h-4 w-4" />
                Print / Download PDF
            </Button>
        </div>

        <Card className="overflow-hidden shadow-lg border-t-4 border-t-primary">
            <CardHeader className="bg-muted/10 border-b pb-6">
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="text-xl font-bold">Invoice #{invoice.invoice_number}</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">{invoice.shop?.name}</p>
                    </div>
                    <Badge variant={invoice.status === 'paid' ? 'default' : 'secondary'} className="text-sm px-3 py-1">
                        {invoice.status}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <div className="p-6 space-y-8">
                    {/* Details Grid */}
                    <div className="grid grid-cols-2 gap-6 text-sm">
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Calendar className="h-4 w-4" />
                                <span>Date Issued</span>
                            </div>
                            <p className="font-medium pl-6">{format(new Date(invoice.created_at), 'MMMM d, yyyy')}</p>
                            <p className="text-xs text-muted-foreground pl-6">{format(new Date(invoice.created_at), 'h:mm a')}</p>
                        </div>
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <User className="h-4 w-4" />
                                <span>Customer</span>
                            </div>
                            <p className="font-medium pl-6">{customer?.name || 'Guest'}</p>
                            {customer?.phone && <p className="text-xs text-muted-foreground pl-6">{customer.phone}</p>}
                        </div>
                    </div>

                    {/* Items Table */}
                    <div>
                        <h3 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wider">Items</h3>
                        <div className="border rounded-lg overflow-hidden">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                                        <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Qty</th>
                                        <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Price</th>
                                        <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {items.map((item: any, index: number) => (
                                        <tr key={index}>
                                            <td className="px-4 py-3 text-sm text-gray-900">{item.name || item.product?.name}</td>
                                            <td className="px-4 py-3 text-sm text-gray-500 text-right">{item.quantity}</td>
                                            <td className="px-4 py-3 text-sm text-gray-500 text-right">{Number(item.price || item.unit_price).toLocaleString()}</td>
                                            <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">
                                                {(item.subtotal || (item.unit_price * item.quantity)).toLocaleString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Totals */}
                    <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Subtotal</span>
                            <span className="font-medium">{Number(invoice.subtotal).toLocaleString()} RWF</span>
                        </div>
                        {invoice.tax_amount > 0 && (
                             <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Tax</span>
                                <span className="font-medium">{Number(invoice.tax_amount).toLocaleString()} RWF</span>
                            </div>
                        )}
                        <div className="border-t pt-2 mt-2 flex justify-between text-base font-bold">
                            <span>Total</span>
                            <span className="text-primary">{Number(invoice.total_amount).toLocaleString()} RWF</span>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>

        <div className="text-center text-xs text-muted-foreground mt-8">
            Powered by BakeSync
        </div>
      </div>
      
      {/* Hidden Print Component */}
      <div className="hidden">
        <InvoiceA4 ref={printRef} invoice={invoice} size="a4" />
      </div>
    </div>
  );
}
