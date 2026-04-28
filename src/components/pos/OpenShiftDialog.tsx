import { useEffect, useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Clock, DollarSign, Store, AlertTriangle, CheckCircle2, Package, FileText, Info, Printer } from 'lucide-react';
import { DEFAULT_SYSTEM_CURRENCY } from '@/utils/currency';
import { useStoreContext } from '@/contexts/StoreContext';
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

interface Shop {
  id: string;
  name: string;
}

interface OpenShiftDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shops: Shop[];
  businessId: string;
  onShiftOpened: (session: { id: string }) => void;
  currency?: string;
}

export function OpenShiftDialog({ open, onOpenChange, shops, businessId, onShiftOpened, currency = DEFAULT_SYSTEM_CURRENCY }: OpenShiftDialogProps) {
  const queryClient = useQueryClient();
  const { store } = useStoreContext();
  const [selectedShop, setSelectedShop] = useState('');
  const [openingCash, setOpeningCash] = useState('0');
  const [stockMatches, setStockMatches] = useState(true);
  const [discrepancyReport, setDiscrepancyReport] = useState('');
  const isOpeningCashDisabled = store?.disableShiftOpeningCash ?? false;

  const exportToPDF = () => {
    if (!inventory || inventory.length === 0) return;

    const doc = new jsPDF();
    const timestamp = format(new Date(), 'dd/MM/yyyy HH:mm');
    const shopName = shops?.find(s => s.id === selectedShop)?.name || 'Unknown Shop';

    // Header
    doc.setFontSize(20);
    doc.text('Starting Stock Snapshot', 14, 22);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Shop: ${shopName}`, 14, 30);
    doc.text(`Generated: ${timestamp}`, 14, 35);

    // Table
    const tableData = inventory.map(item => [
      item.product_name,
      item.category || '-',
      item.stock.toString()
    ]);

    autoTable(doc, {
      startY: 45,
      head: [['Product', 'Category', 'System Stock']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillGray: true, textColor: 255 },
      styles: { fontSize: 9 },
      margin: { top: 45 }
    });

    doc.save(`starting-stock-${shopName.replace(/\s+/g, '-').toLowerCase()}-${format(new Date(), 'yyyyMMdd')}.pdf`);
    toast.success('Stock snapshot exported as PDF');
  };

  // Fetch Inventory for Snapshot
  const { data: inventory, isLoading: inventoryLoading } = useQuery({
    queryKey: ['shop-inventory-snapshot', selectedShop],
    queryFn: async () => {
      if (!selectedShop) return [];
      const { data, error } = await supabase
        .from('shop_inventory')
        .select(`
          product_id,
          stock,
          product:products(name, category)
        `)
        .eq('shop_id', selectedShop);

      if (error) throw error;
      return data?.map(item => ({
        product_id: item.product_id,
        product_name: item.product?.name || 'Unknown',
        category: item.product?.category,
        stock: item.stock
      })) || [];
    },
    enabled: !!selectedShop && open,
  });

  useEffect(() => {
    if (shops.length === 1 && !selectedShop) {
      setSelectedShop(shops[0].id);
    }
  }, [shops, selectedShop]);

  useEffect(() => {
    if (isOpeningCashDisabled) {
      setOpeningCash('0');
    }
  }, [isOpeningCashDisabled]);

  const openShiftMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      if (!selectedShop) throw new Error('Please select a shop');

      // 1. Create the session
      const { data: session, error: sessionError } = await supabase
        .from('pos_sessions')
        .insert({
          user_id: user.id,
          shop_id: selectedShop,
          business_id: businessId,
          opening_cash: isOpeningCashDisabled ? 0 : parseFloat(openingCash) || 0,
          status: 'open',
          notes: stockMatches ? null : `STOCK DISCREPANCY REPORT: ${discrepancyReport}`,
        })
        .select()
        .single();

      if (sessionError) throw sessionError;

      // 2. Save the inventory snapshot
      if (inventory && inventory.length > 0) {
        const snapshotData = inventory.map(item => ({
          session_id: session.id,
          product_id: item.product_id,
          product_name: item.product_name,
          quantity: item.stock
        }));

        const { error: snapshotError } = await supabase
          .from('pos_session_inventory_snapshots')
          .insert(snapshotData);

        if (snapshotError) {
          console.error("Failed to save inventory snapshot:", snapshotError);
          // We don't throw here to allow shift opening even if snapshot fails
          toast.warning("Shift opened, but failed to save inventory snapshot");
        }
      }

      return session;
    },
    onSuccess: (session) => {
      queryClient.invalidateQueries({ queryKey: ['active-pos-session'] });
      toast.success('Shift opened successfully!');
      onShiftOpened(session);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to open shift');
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-0">
        <div className="p-6 pb-2">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl">
              <Clock className="h-6 w-6 text-primary" />
              Open Your Shift
            </DialogTitle>
            <DialogDescription className="text-base">
              You need to open a shift before you can process sales. Review your stock and enter opening cash.
            </DialogDescription>
          </DialogHeader>
        </div>

        <ScrollArea className="flex-1 px-6">
          <div className="space-y-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="shop" className="flex items-center gap-2 font-semibold">
                    <Store className="h-4 w-4" />
                    Select Shop
                  </Label>
                  <Select value={selectedShop} onValueChange={setSelectedShop}>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Choose your shop" />
                    </SelectTrigger>
                    <SelectContent>
                      {shops.map((shop) => (
                        <SelectItem key={shop.id} value={shop.id}>
                          {shop.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="opening-cash" className="flex items-center gap-2 font-semibold">
                    <DollarSign className="h-4 w-4" />
                    Opening Cash ({currency})
                  </Label>
                  <Input
                    id="opening-cash"
                    type="number"
                    placeholder="0"
                    value={openingCash}
                    disabled={isOpeningCashDisabled}
                    onChange={(e) => !isOpeningCashDisabled && setOpeningCash(e.target.value)}
                    className="h-11 text-lg"
                  />
                  <p className="text-xs text-muted-foreground">
                    {isOpeningCashDisabled
                      ? 'Opening cash is disabled by admin and will be set to 0.'
                      : 'Enter the amount of cash in the drawer at the start of your shift.'}
                  </p>
                </div>
              </div>

              <div className="bg-muted/30 rounded-lg p-4 border border-dashed border-muted-foreground/30">
                <h3 className="text-sm font-bold flex items-center gap-2 mb-3">
                  <Info className="h-4 w-4 text-blue-500" />
                  Shift Instructions
                </h3>
                <ul className="text-xs space-y-2 text-muted-foreground list-disc pl-4">
                  <li>Verify that your physical stock matches the system snapshot.</li>
                  <li>If there's a discrepancy, uncheck the confirmation and provide details.</li>
                  <li>The administrator will review any reported discrepancies.</li>
                  <li>Ensure your opening cash is accurately counted.</li>
                </ul>
              </div>
            </div>

            {selectedShop && (
              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Package className="h-5 w-5 text-primary" />
                    Starting Stock Snapshot
                  </h3>
                  <div className="flex items-center gap-2">
                    {inventory && inventory.length > 0 && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={exportToPDF}
                        className="h-8 gap-2 text-xs"
                      >
                        <Printer className="h-3.5 w-3.5" />
                        Print PDF
                      </Button>
                    )}
                    {inventoryLoading && (
                      <span className="text-xs text-muted-foreground animate-pulse">Loading stock...</span>
                    )}
                  </div>
                </div>

                <div className="border rounded-md bg-background">
                  <ScrollArea className="h-[240px]">
                    <div className="min-w-[500px]">
                      <Table>
                        <TableHeader className="bg-muted/50 sticky top-0 z-10">
                          <TableRow>
                            <TableHead className="bg-muted/50 whitespace-nowrap">Product</TableHead>
                            <TableHead className="bg-muted/50 whitespace-nowrap">Category</TableHead>
                            <TableHead className="text-right bg-muted/50 whitespace-nowrap">System Stock</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {inventoryLoading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                              <TableRow key={i}>
                                <TableCell><div className="h-4 w-32 bg-muted animate-pulse rounded" /></TableCell>
                                <TableCell><div className="h-4 w-20 bg-muted animate-pulse rounded" /></TableCell>
                                <TableCell><div className="h-4 w-12 bg-muted animate-pulse rounded ml-auto" /></TableCell>
                              </TableRow>
                            ))
                          ) : inventory?.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                                No stock found for this shop.
                              </TableCell>
                            </TableRow>
                          ) : (
                            inventory?.map((item) => (
                              <TableRow key={item.product_id}>
                                <TableCell className="font-medium whitespace-nowrap">{item.product_name}</TableCell>
                                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{item.category}</TableCell>
                                <TableCell className="text-right font-mono whitespace-nowrap">{item.stock}</TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                    <ScrollBar orientation="horizontal" />
                  </ScrollArea>
                </div>

                <div className="space-y-4 pt-2">
                  <div className="flex items-start space-x-3 p-4 rounded-lg border bg-card shadow-sm">
                    <Checkbox 
                      id="stock-match" 
                      checked={stockMatches}
                      onCheckedChange={(checked) => setStockMatches(checked as boolean)}
                      className="mt-1"
                    />
                    <div className="grid gap-1.5 leading-none">
                      <label
                        htmlFor="stock-match"
                        className="text-sm font-bold leading-none cursor-pointer flex items-center gap-2"
                      >
                        Physical stock matches system stock
                        {stockMatches && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                      </label>
                      <p className="text-xs text-muted-foreground">
                        Uncheck this if you find any differences between physical count and system stock.
                      </p>
                    </div>
                  </div>

                  {!stockMatches && (
                    <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                      <Alert variant="destructive" className="bg-destructive/5 border-destructive/20">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle className="text-sm font-bold">Discrepancy Reporting</AlertTitle>
                        <AlertDescription className="text-xs">
                          Please describe the differences you found. This will be sent to the administrator for reconciliation.
                        </AlertDescription>
                      </Alert>
                      
                      <div className="space-y-2">
                        <Label htmlFor="discrepancy" className="text-sm font-semibold flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          Discrepancy Details
                        </Label>
                        <Textarea
                          id="discrepancy"
                          placeholder="Example: 'Blueberry Muffin shows 10 in system but only 8 are on shelf...'"
                          className="min-h-[100px] text-sm resize-none"
                          value={discrepancyReport}
                          onChange={(e) => setDiscrepancyReport(e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="p-6 pt-2 border-t bg-muted/20">
          <div className="flex w-full gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={() => openShiftMutation.mutate()}
              disabled={!selectedShop || openShiftMutation.isPending || (!stockMatches && discrepancyReport.length < 5)}
              className="flex-[2]"
            >
              {openShiftMutation.isPending ? (
                <>
                  <Clock className="mr-2 h-4 w-4 animate-spin" />
                  Opening Shift...
                </>
              ) : (
                'Open Shift'
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
