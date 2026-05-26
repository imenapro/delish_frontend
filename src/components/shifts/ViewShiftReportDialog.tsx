import { useState, useMemo } from 'react';
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
import { useStoreContext } from '@/contexts/StoreContext';
import { formatCurrency, DEFAULT_SYSTEM_CURRENCY } from '@/utils/currency';

interface OrderItem {
  id: string;
  quantity: number;
  unit_price?: number;
  product?: {
    name: string;
  };
  subtotal: number;
  name?: string;
  product_name?: string;
}

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
        address?: string;
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
  const { store } = useStoreContext();
  const currency = store?.currency || DEFAULT_SYSTEM_CURRENCY;
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Fetch Shift Sales (POS Invoices) with Details
  const { data: shiftOrders, isLoading: isLoadingOrders } = useQuery({
    queryKey: ['shift-orders', session?.id],
    queryFn: async () => {
      if (!session) return [];

      const endTime = (session.closed_at ? new Date(session.closed_at) : new Date()).toISOString();

      const { data: invoices, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('shop_id', session.shop_id)
        .eq('staff_id', session.user_id)
        .gte('created_at', session.opened_at)
        .lte('created_at', endTime)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!invoices || invoices.length === 0) return [];

      return invoices.map((invoice: any) => {
        const sourceItems = Array.isArray(invoice.items_snapshot) ? invoice.items_snapshot : [];
        const invoiceItems = sourceItems.map((item: any, idx: number) => ({
          id: item.id || `${invoice.id}-${idx}`,
          quantity: item.quantity,
          unit_price: item.unit_price ?? item.price ?? 0,
          subtotal: item.subtotal ?? ((item.quantity || 0) * (item.unit_price ?? item.price ?? 0)),
          product: item.product ? { name: item.product.name } : item.product_name ? { name: item.product_name } : item.name ? { name: item.name } : undefined,
          name: item.name,
          product_name: item.product_name,
        }));

        return {
          ...invoice,
          order_code: invoice.invoice_number,
          source: 'pos',
          order_items: invoiceItems,
        };
      });
    },
    enabled: !!session && open,
  });

  // Fetch Inventory Snapshot
  const { data: inventorySnapshot, isLoading: isLoadingSnapshot } = useQuery({
    queryKey: ['session-snapshot', session?.id],
    queryFn: async () => {
      if (!session) return [];
      const { data, error } = await supabase
        .from('pos_session_inventory_snapshots')
        .select('*')
        .eq('session_id', session.id);
      
      if (error) throw error;
      return data;
    },
    enabled: !!session && open,
  });

  const { data: inventoryTransactions = [], isLoading: isLoadingTransactions } = useQuery({
    queryKey: ['session-inventory-transactions', session?.id],
    queryFn: async () => {
      if (!session) return [];
      const endTime = (session.closed_at ? new Date(session.closed_at) : new Date()).toISOString();
      const { data, error } = await supabase
        .from('inventory_transactions')
        .select('product_id, quantity, created_at')
        .eq('shop_id', session.shop_id)
        .gte('created_at', session.opened_at)
        .lte('created_at', endTime)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!session && open,
  });

  const inventoryReconciliation = useMemo(() => {
    if (!session) return [];

    const snapshots = Array.isArray(inventorySnapshot) ? inventorySnapshot : [];

    let openingSnapshots: any[] = [];
    let closingSnapshots: any[] = [];

    if (snapshots.length > 0) {
      const sorted = [...snapshots].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      const firstTime = new Date(sorted[0].created_at).getTime();
      const lastTime = new Date(sorted[sorted.length - 1].created_at).getTime();

      openingSnapshots = sorted.filter(snap => Math.abs(new Date(snap.created_at).getTime() - firstTime) < 5000);
      closingSnapshots = sorted.filter(snap => Math.abs(new Date(snap.created_at).getTime() - lastTime) < 5000);
    }

    const openingMap = new Map<string, any>();
    openingSnapshots.forEach(s => openingMap.set(s.product_id, s));

    const closingMap = new Map<string, any>();
    closingSnapshots.forEach(s => closingMap.set(s.product_id, s));

    const addedMap = new Map<string, number>();
    (inventoryTransactions || []).forEach((tx: any) => {
      const current = addedMap.get(tx.product_id) || 0;
      addedMap.set(tx.product_id, current + (Number(tx.quantity) || 0));
    });

    const soldMap = new Map<string, { quantity: number; unit_price: number; name: string }>();
    (shiftOrders || []).forEach((invoice: any) => {
      const sourceItems = Array.isArray(invoice.items_snapshot) ? invoice.items_snapshot : (invoice.order_items || []);
      sourceItems.forEach((item: any) => {
        const productId = item.product_id || item.product?.id;
        if (!productId) return;
        const qty = Number(item.quantity) || 0;
        const unitPrice = Number(item.unit_price ?? item.price ?? 0) || 0;
        const name = item.product?.name || item.product_name || item.name || 'Unknown';
        const existing = soldMap.get(productId) || { quantity: 0, unit_price: unitPrice, name };
        existing.quantity += qty;
        existing.unit_price = unitPrice || existing.unit_price;
        existing.name = name || existing.name;
        soldMap.set(productId, existing);
      });
    });

    const productIds = new Set<string>();
    openingMap.forEach((_, k) => productIds.add(k));
    closingMap.forEach((_, k) => productIds.add(k));
    addedMap.forEach((_, k) => productIds.add(k));
    soldMap.forEach((_, k) => productIds.add(k));

    return Array.from(productIds).map((productId) => {
      const open = openingMap.get(productId);
      const close = closingMap.get(productId);
      const sold = soldMap.get(productId);

      const openingStock = Number(open?.quantity) || 0;
      const closingStock = Number(close?.quantity) || 0;
      const addedStock = addedMap.get(productId) || 0;
      const soldQty = sold?.quantity || 0;
      const unitPrice = sold?.unit_price || 0;
      const productName = open?.product_name || close?.product_name || sold?.name || 'Unknown';

      return {
        product_id: productId,
        product_name: productName,
        opening_stock: openingStock,
        added_stock: addedStock,
        sold_quantity: soldQty,
        closing_stock: closingStock,
        unit_price: unitPrice,
        current_stock_value: closingStock * unitPrice,
        expected_closing: openingStock + addedStock - soldQty,
      };
    }).sort((a, b) => a.product_name.localeCompare(b.product_name));
  }, [session, inventorySnapshot, inventoryTransactions, shiftOrders]);

  const reconciliationTotals = useMemo(() => {
    const totalValue = inventoryReconciliation.reduce((sum, item) => sum + (Number(item.current_stock_value) || 0), 0);
    const totalVariance = inventoryReconciliation.reduce((sum, item) => sum + ((Number(item.closing_stock) || 0) - (Number(item.expected_closing) || 0)), 0);
    return { totalValue, totalVariance };
  }, [inventoryReconciliation]);

  if (!session) return null;

  const totalCashSales = shiftOrders?.reduce((acc, order) => {
    if (order.payment_method === 'cash') return acc + Number(order.total_amount);
    return acc;
  }, 0) || 0;

  const totalMobileMoneySales = shiftOrders?.reduce((acc, order) => {
    if (order.payment_method === 'mobile_money') return acc + Number(order.total_amount);
    return acc;
  }, 0) || 0;

  const totalCardSales = shiftOrders?.reduce((acc, order) => {
    if (order.payment_method === 'card') return acc + Number(order.total_amount);
    return acc;
  }, 0) || 0;

  const totalWalletSales = shiftOrders?.reduce((acc, order) => {
    if (order.payment_method === 'wallet') return acc + Number(order.total_amount);
    return acc;
  }, 0) || 0;

  const totalCashAndMobileMoneySales = totalCashSales + totalMobileMoneySales;
  const expectedCash = session.expected_cash ?? (session.opening_cash + totalCashAndMobileMoneySales);
  const closingCashNum = session.closing_cash ?? 0;
  
  const handleGeneratePDF = async () => {
    setIsGeneratingPdf(true);
    await generateShiftReportPDF({
        session,
        shiftOrders: shiftOrders || [],
        closingCash: closingCashNum,
        expectedCash,
        description: session.notes || undefined,
        currency,
        inventorySnapshot: inventorySnapshot || undefined,
        inventoryReconciliation: inventoryReconciliation || undefined
    });
    setIsGeneratingPdf(false);
  };

  const handleExportReconciliationCSV = () => {
    if (!inventoryReconciliation || inventoryReconciliation.length === 0) return;

    const headers = [
      'Product',
      'Starting Stock',
      'Added Stock',
      'Sold',
      'Ending Stock',
      'Expected Ending',
      'Variance',
      'Unit Price',
      'Ending Value'
    ];

    const rows = inventoryReconciliation.map((item: any) => {
      const variance = (Number(item.closing_stock) || 0) - (Number(item.expected_closing) || 0);
      return [
        item.product_name || 'Unknown',
        Number(item.opening_stock) || 0,
        Number(item.added_stock) || 0,
        Number(item.sold_quantity) || 0,
        Number(item.closing_stock) || 0,
        Number(item.expected_closing) || 0,
        variance,
        Number(item.unit_price) || 0,
        Number(item.current_stock_value) || 0
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map((row: any[]) => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `shift_reconciliation_${format(new Date(session.opened_at), 'yyyyMMdd_HHmm')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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
                    <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleExportReconciliationCSV}
                          disabled={isLoadingOrders || isLoadingSnapshot || isLoadingTransactions || inventoryReconciliation.length === 0}
                          className="h-8 gap-2"
                        >
                          <Download className="h-3 w-3" />
                          Export CSV
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleGeneratePDF}
                          disabled={isGeneratingPdf || isLoadingOrders || isLoadingSnapshot || isLoadingTransactions}
                          className="h-8 gap-2"
                        >
                             {isGeneratingPdf ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
                             Export PDF
                        </Button>
                    </div>
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
                                <span>{formatCurrency(session.opening_cash, currency)}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                                <span>Cash Sales</span>
                                <span>{formatCurrency(totalCashSales, currency)}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                                <span>Mobile Money Sales</span>
                                <span>{formatCurrency(totalMobileMoneySales, currency)}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                                <span>Card Sales</span>
                                <span>{formatCurrency(totalCardSales, currency)}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                                <span>Wallet Sales</span>
                                <span>{formatCurrency(totalWalletSales, currency)}</span>
                            </div>
                            <div className="border-t my-1"></div>
                            <div className="flex justify-between text-xs font-medium">
                                <span>Total Sales</span>
                                <span className="text-blue-600">+{formatCurrency(session.total_sales, currency)}</span>
                            </div>
                             <div className="border-t my-1"></div>
                            <div className="flex justify-between text-xs">
                                <span>Expected Cash + Mobile</span>
                                <span>{formatCurrency(expectedCash, currency)}</span>
                            </div>
                            {session.closed_at && (
                                <>
                                    <div className="flex justify-between text-xs">
                                        <span>Actual Cash Count</span>
                                        <span>{formatCurrency(closingCashNum, currency)}</span>
                                    </div>
                                    <div className="flex justify-between font-bold text-sm pt-1">
                                        <span>Variance</span>
                                        <span className={(closingCashNum - expectedCash) >= 0 ? 'text-green-600' : 'text-red-600'}>
                                            {(closingCashNum - expectedCash) > 0 ? '+' : ''}{formatCurrency(closingCashNum - expectedCash, currency)}
                                        </span>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Invoice History */}
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <h4 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Detailed Invoice History</h4>
                                <span className="text-xs bg-secondary px-2 py-0.5 rounded-full">{session.total_orders} Invoices</span>
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
                                                        <div className="flex flex-col gap-1 w-full pr-2">
                                                            <div className="flex justify-between items-center gap-2">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-mono font-medium text-primary">{order.order_code}</span>
                                                                    <span className="text-muted-foreground font-normal hidden sm:inline">
                                                                        {format(new Date(order.created_at), 'HH:mm')}
                                                                    </span>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-medium">{formatCurrency(order.total_amount, currency)}</span>
                                                                    {order.source && (
                                                                        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase text-muted-foreground">
                                                                            {order.source}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className="text-[11px] text-muted-foreground">
                                                                {(order.order_items?.length ? order.order_items : order.items_snapshot || order.items || []).map((item: OrderItem) => `${item.quantity}x ${item.product?.name || item.product_name || item.name || 'Item'}`).join(', ') || 'No items recorded'}
                                                            </div>
                                                        </div>
                                                    </AccordionTrigger>
                                                    <AccordionContent className="px-2 pb-2 bg-muted/20 rounded-b-md">
                                                        <div className="space-y-2 pt-2">
                                                            <div className="flex justify-between text-[10px] text-muted-foreground border-b pb-1">
                                                                <span>Time: {format(new Date(order.created_at), 'PP p')}</span>
                                                                <span className="uppercase">{order.payment_method?.replace('_', ' ')}</span>
                                                            </div>
                                                            {order.source && (
                                                              <div className="text-[10px] text-muted-foreground">Source: {order.source}</div>
                                                            )}
                                                            <div className="text-xs space-y-1">
                                                                {((order.order_items?.length ? order.order_items : order.items_snapshot || order.items || []) as OrderItem[]).map((item: OrderItem) => (
                                                                    <div key={item.id} className="flex justify-between items-center">
                                                                        <span className="flex-1 truncate pr-2">
                                                                            <span className="font-medium">{item.quantity}x</span> {item.product?.name || item.product_name || item.name || 'Item'}{typeof item.unit_price === 'number' ? ` @ ${formatCurrency(item.unit_price, currency)}` : ''}
                                                                        </span>
                                                                        <span className="text-muted-foreground">{formatCurrency(item.subtotal, currency)}</span>
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

                        {/* Inventory Snapshot */}
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <h4 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Inventory Snapshot</h4>
                                <span className="text-xs bg-secondary px-2 py-0.5 rounded-full">{inventorySnapshot?.length || 0} Items</span>
                            </div>

                            {isLoadingSnapshot ? (
                                <div className="flex justify-center py-4">
                                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                </div>
                            ) : (
                                <div className="border rounded-lg bg-card overflow-hidden">
                                    <div className="max-h-[200px] overflow-y-auto">
                                        <table className="w-full text-xs">
                                            <thead className="bg-muted/50 sticky top-0">
                                                <tr className="border-b">
                                                    <th className="text-left px-3 py-2 font-medium">Product</th>
                                                    <th className="text-right px-3 py-2 font-medium">Qty</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {inventorySnapshot?.map((item) => (
                                                    <tr key={item.id} className="border-b last:border-0 hover:bg-muted/20">
                                                        <td className="px-3 py-2 truncate max-w-[200px]">{item.product_name}</td>
                                                        <td className="px-3 py-2 text-right font-mono">{Number(item.quantity)}</td>
                                                    </tr>
                                                ))}
                                                {(!inventorySnapshot || inventorySnapshot.length === 0) && (
                                                    <tr>
                                                        <td colSpan={2} className="px-3 py-4 text-center text-muted-foreground italic">
                                                            No inventory snapshot available for this session.
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Inventory Reconciliation */}
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <h4 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Inventory Reconciliation</h4>
                                <span className="text-xs bg-secondary px-2 py-0.5 rounded-full">{inventoryReconciliation.length} Items</span>
                            </div>

                            {(isLoadingOrders || isLoadingSnapshot || isLoadingTransactions) ? (
                                <div className="flex justify-center py-4">
                                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                </div>
                            ) : (
                                <div className="border rounded-lg bg-card overflow-hidden">
                                    <div className="max-h-[260px] overflow-y-auto">
                                        <table className="w-full text-xs">
                                            <thead className="bg-muted/50 sticky top-0">
                                                <tr className="border-b">
                                                    <th className="text-left px-3 py-2 font-medium">Product</th>
                                                    <th className="text-right px-3 py-2 font-medium whitespace-nowrap">Start</th>
                                                    <th className="text-right px-3 py-2 font-medium whitespace-nowrap">Added</th>
                                                    <th className="text-right px-3 py-2 font-medium whitespace-nowrap">Sold</th>
                                                    <th className="text-right px-3 py-2 font-medium whitespace-nowrap">End</th>
                                                    <th className="text-right px-3 py-2 font-medium whitespace-nowrap">Variance</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {inventoryReconciliation.map((item) => {
                                                    const variance = (Number(item.closing_stock) || 0) - (Number(item.expected_closing) || 0);
                                                    return (
                                                        <tr key={item.product_id} className="border-b last:border-0 hover:bg-muted/20">
                                                            <td className="px-3 py-2 truncate max-w-[220px]">{item.product_name}</td>
                                                            <td className="px-3 py-2 text-right font-mono">{Number(item.opening_stock)}</td>
                                                            <td className="px-3 py-2 text-right font-mono">{Number(item.added_stock)}</td>
                                                            <td className="px-3 py-2 text-right font-mono text-red-600">-{Number(item.sold_quantity)}</td>
                                                            <td className="px-3 py-2 text-right font-mono font-bold">{Number(item.closing_stock)}</td>
                                                            <td className={`px-3 py-2 text-right font-mono ${variance === 0 ? 'text-muted-foreground' : variance > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                                {variance > 0 ? '+' : ''}{variance}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                                {inventoryReconciliation.length === 0 && (
                                                    <tr>
                                                        <td colSpan={6} className="px-3 py-4 text-center text-muted-foreground italic">
                                                            No reconciliation data available for this session.
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {inventoryReconciliation.length > 0 && (
                                <div className="mt-2 p-2 bg-muted/30 rounded flex justify-between items-center">
                                    <span className="text-[10px] font-semibold uppercase text-muted-foreground">Total Variance</span>
                                    <span className={`text-sm font-bold ${reconciliationTotals.totalVariance === 0 ? 'text-muted-foreground' : reconciliationTotals.totalVariance > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {reconciliationTotals.totalVariance > 0 ? '+' : ''}{reconciliationTotals.totalVariance}
                                    </span>
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
