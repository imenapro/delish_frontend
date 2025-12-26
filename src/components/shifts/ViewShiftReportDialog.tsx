import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { Clock, Download, Loader2, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { generateShiftReportPDF } from '@/utils/pdfGenerator';

interface ViewShiftReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: {
    id: string;
    opened_at: string;
    closed_at?: string | null;
    opening_cash: number;
    closing_cash?: number | null;
    expected_cash?: number | null;
    total_sales: number;
    total_orders: number;
    notes?: string | null;
    shop_id: string;
    user_id: string;
    shop?: {
        name: string;
        logo_url?: string | null;
        address: string;
        phone?: string | null;
        owner_email?: string | null;
    };
    user?: {
        email?: string;
        name: string;
    };
  } | null;
}

export function ViewShiftReportDialog({ open, onOpenChange, session }: ViewShiftReportDialogProps) {
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Fetch Shift Orders with Details
  const { data: shiftOrders, isLoading: isLoadingOrders } = useQuery({
    queryKey: ['shift-orders', session?.id],
    queryFn: async () => {
      if (!session) return [];
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            id,
            quantity,
            unit_price,
            subtotal,
            product:products (name)
          )
        `)
        .eq('shop_id_origin', session.shop_id)
        .eq('seller_id', session.user_id)
        .gte('created_at', session.opened_at)
        .lte('created_at', session.closed_at || new Date().toISOString())
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!session && open,
  });

  if (!session) return null;

  const expectedCash = session.expected_cash ?? (session.opening_cash + session.total_sales);
  const closingCashNum = session.closing_cash ?? 0;
  
  const handleGeneratePDF = async () => {
    setIsGeneratingPdf(true);
    await generateShiftReportPDF({
        session,
        shiftOrders: shiftOrders || [],
        closingCash: closingCashNum,
        expectedCash,
        description: session.notes || undefined
    });
    setIsGeneratingPdf(false);
  };

  const getShiftDuration = () => {
    const start = new Date(session.opened_at);
    const end = session.closed_at ? new Date(session.closed_at) : new Date();
    const diffMs = end.getTime() - start.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full sm:max-w-lg md:max-w-2xl h-[90vh] flex flex-col p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Shift Report Details
          </DialogTitle>
        </DialogHeader>

        <Card className="flex-1 bg-muted/20 border-dashed flex flex-col overflow-hidden min-h-0 mt-2">
            <CardHeader className="py-3 px-4 bg-muted/30 shrink-0 border-b">
                <div className="flex justify-between items-center">
                    <CardTitle className="text-sm font-medium">Shift Summary</CardTitle>
                    <Button variant="outline" size="sm" onClick={handleGeneratePDF} disabled={isGeneratingPdf || isLoadingOrders} className="h-8 gap-2">
                         {isGeneratingPdf ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
                         Export PDF
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-hidden flex flex-col min-h-0">
                <ScrollArea className="h-full w-full">
                    <div className="p-4 sm:p-6 space-y-6 text-sm pb-20">
                        {/* Metadata Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 text-xs border-b pb-6">
                            <span className="text-muted-foreground">Report ID:</span> <span className="font-mono text-right">{session.id.slice(0,8).toUpperCase()}</span>
                            <span className="text-muted-foreground">Staff Member:</span> <span className="font-medium text-right">{session.user?.name}</span>
                            <span className="text-muted-foreground">Shop Location:</span> <span className="font-medium text-right">{session.shop?.name}</span>
                            <span className="text-muted-foreground">Shift Status:</span> 
                            <span className={`font-medium text-right ${session.closed_at ? 'text-green-600' : 'text-blue-600'}`}>
                                {session.closed_at ? 'Closed' : 'Active'}
                            </span>
                            <span className="text-muted-foreground">Opened:</span> <span className="font-medium text-right">{format(new Date(session.opened_at), 'MMM d, HH:mm')}</span>
                            {session.closed_at && (
                                <>
                                    <span className="text-muted-foreground">Closed:</span> <span className="font-medium text-right">{format(new Date(session.closed_at), 'MMM d, HH:mm')}</span>
                                </>
                            )}
                            <span className="text-muted-foreground">Duration:</span> <span className="font-medium text-right">{getShiftDuration()}</span>
                        </div>
                        
                        {/* Financials */}
                        <div className="bg-card rounded-lg p-3 border space-y-2 shadow-sm">
                            <h4 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground mb-2">Financial Overview</h4>
                            <div className="flex justify-between text-xs">
                                <span>Opening Cash</span>
                                <span>{session.opening_cash.toLocaleString()} RWF</span>
                            </div>
                            <div className="flex justify-between text-xs font-medium">
                                <span>Total Sales</span>
                                <span className="text-blue-600">+{session.total_sales.toLocaleString()} RWF</span>
                            </div>
                             <div className="border-t my-1"></div>
                            <div className="flex justify-between text-xs">
                                <span>Expected Cash</span>
                                <span>{expectedCash.toLocaleString()} RWF</span>
                            </div>
                            {session.closed_at && (
                                <>
                                    <div className="flex justify-between text-xs">
                                        <span>Actual Cash Count</span>
                                        <span>{closingCashNum.toLocaleString()} RWF</span>
                                    </div>
                                    <div className="flex justify-between font-bold text-sm pt-1">
                                        <span>Variance</span>
                                        <span className={(closingCashNum - expectedCash) >= 0 ? 'text-green-600' : 'text-red-600'}>
                                            {(closingCashNum - expectedCash) > 0 ? '+' : ''}{(closingCashNum - expectedCash).toLocaleString()} RWF
                                        </span>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Order History */}
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <h4 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Detailed Order History</h4>
                                <span className="text-xs bg-secondary px-2 py-0.5 rounded-full">{session.total_orders} Orders</span>
                            </div>
                            
                            {isLoadingOrders ? (
                                <div className="flex justify-center py-4">
                                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                </div>
                            ) : (
                                <div className="border rounded-lg bg-card overflow-hidden">
                                    <div className="max-h-[300px] overflow-y-auto">
                                        <Accordion type="single" collapsible className="w-full">
                                            {shiftOrders?.map((order) => (
                                                <AccordionItem key={order.id} value={order.id} className="border-b last:border-0 px-2">
                                                    <AccordionTrigger className="py-2 hover:no-underline hover:bg-muted/50 rounded px-2 text-xs">
                                                        <div className="flex justify-between w-full pr-2 items-center">
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-mono font-medium text-primary">{order.order_code}</span>
                                                                <span className="text-muted-foreground font-normal hidden sm:inline">
                                                                    {format(new Date(order.created_at), 'HH:mm')}
                                                                </span>
                                                            </div>
                                                            <span className="font-medium">{order.total_amount.toLocaleString()} RWF</span>
                                                        </div>
                                                    </AccordionTrigger>
                                                    <AccordionContent className="px-2 pb-2 bg-muted/20 rounded-b-md">
                                                        <div className="space-y-2 pt-2">
                                                            <div className="flex justify-between text-[10px] text-muted-foreground border-b pb-1">
                                                                <span>Time: {format(new Date(order.created_at), 'PP p')}</span>
                                                                <span className="uppercase">{order.payment_method?.replace('_', ' ')}</span>
                                                            </div>
                                                            <div className="text-xs space-y-1">
                                                                {order.order_items?.map((item: OrderItem) => (
                                                                    <div key={item.id} className="flex justify-between items-center">
                                                                        <span className="flex-1 truncate pr-2">
                                                                            <span className="font-medium">{item.quantity}x</span> {item.product?.name}
                                                                        </span>
                                                                        <span className="text-muted-foreground">{item.subtotal.toLocaleString()}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </AccordionContent>
                                                </AccordionItem>
                                            ))}
                                            {(!shiftOrders || shiftOrders.length === 0) && (
                                                <p className="text-xs text-muted-foreground italic text-center py-4">No orders recorded in this session.</p>
                                            )}
                                        </Accordion>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Notes */}
                        {session.notes && (
                            <div className="bg-amber-50/50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-lg p-3 overflow-hidden">
                                <h4 className="font-semibold text-xs uppercase tracking-wider text-amber-700 dark:text-amber-500 mb-1">Shift Notes</h4>
                                <ScrollArea className="h-full max-h-[100px] w-full">
                                    <p className="text-xs text-amber-900 dark:text-amber-200 italic leading-relaxed pr-2">"{session.notes}"</p>
                                </ScrollArea>
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
}
