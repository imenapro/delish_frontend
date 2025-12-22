import { useState, useEffect, useRef, useCallback } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { ScanBarcode, Plus, Minus } from 'lucide-react';

interface InventoryBarcodeScannerProps {
  businessId: string;
}

export function InventoryBarcodeScanner({ businessId }: InventoryBarcodeScannerProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scannedBarcode, setScannedBarcode] = useState('');
  const [foundProduct, setFoundProduct] = useState<any>(null);
  const [transactionType, setTransactionType] = useState<'in' | 'out'>('in');
  const [selectedShopId, setSelectedShopId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  const { data: shops } = useQuery({
    queryKey: ['business-shops', businessId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shops')
        .select('*')
        .eq('business_id', businessId)
        .eq('is_active', true);
      if (error) throw error;
      return data;
    },
    enabled: !!businessId,
  });

  const findProductByBarcode = useCallback(async (barcode: string) => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('business_id', businessId)
      .eq('barcode', barcode)
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return null;
    }

    if (!data) {
      toast({ title: 'Product not found', description: `No product with barcode: ${barcode}`, variant: 'destructive' });
      return null;
    }

    return data;
  }, [businessId, toast]);

  const handleScanSuccess = useCallback(async (barcode: string) => {
    setScannedBarcode(barcode);
    setScanning(false);
    
    const product = await findProductByBarcode(barcode);
    if (product) {
      setFoundProduct(product);
      toast({ title: 'Product found', description: product.name });
    }
  }, [findProductByBarcode, toast]);

  useEffect(() => {
    if (scanning) {
      const timeoutId = setTimeout(() => {
        const element = document.getElementById("inventory-barcode-reader");
        if (!element) return;

        const scanner = new Html5QrcodeScanner(
          "inventory-barcode-reader",
          { 
            fps: 10, 
            qrbox: { width: 250, height: 250 },
            formatsToSupport: [0, 5, 6, 7, 8, 12, 13]
          },
          false
        );

        scanner.render(
          (decodedText) => {
            handleScanSuccess(decodedText);
            scanner.clear().catch(console.error);
          },
          (error) => console.log(error)
        );

        scannerRef.current = scanner;
      }, 100);

      return () => {
        clearTimeout(timeoutId);
        if (scannerRef.current) {
          scannerRef.current.clear().catch(console.error);
        }
      };
    }
  }, [scanning, handleScanSuccess]);

  const updateStockMutation = useMutation({
    mutationFn: async () => {
      if (!foundProduct || !selectedShopId || !quantity) throw new Error('Missing required fields');

      const qty = parseInt(quantity);
      const adjustedQty = transactionType === 'out' ? -Math.abs(qty) : Math.abs(qty);

      // Ensure inventory row exists BEFORE recording the transaction
      const { data: existingInventory, error: existError } = await supabase
        .from('shop_inventory')
        .select('id')
        .eq('shop_id', selectedShopId)
        .eq('product_id', foundProduct.id)
        .maybeSingle();
      
      if (existError) throw existError;
      
      if (!existingInventory) {
        const { error: insertInvError } = await supabase
          .from('shop_inventory')
          .insert({
            shop_id: selectedShopId,
            product_id: foundProduct.id,
            stock: 0,
            price: foundProduct.price,
          });
        if (insertInvError) throw insertInvError;
      }
      
      // Record transaction (stock change handled by DB trigger)
      const { error: txError } = await supabase
        .from('inventory_transactions')
        .insert([{
          shop_id: selectedShopId,
          product_id: foundProduct.id,
          quantity: adjustedQty,
          transaction_type: transactionType,
          notes: `Barcode scan: ${scannedBarcode}`,
          created_by: user?.id,
        }]);

      if (txError) throw txError;
    },
    onSuccess: () => {
      toast({
        title: transactionType === 'in' ? 'Stock added' : 'Stock removed',
        description: `${quantity} units ${transactionType === 'in' ? 'added to' : 'removed from'} ${foundProduct?.name}`,
      });
      queryClient.invalidateQueries({ queryKey: ['business-inventory', businessId] });
      queryClient.invalidateQueries({ queryKey: ['inventory-transactions', businessId] });
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const resetForm = () => {
    setScannedBarcode('');
    setFoundProduct(null);
    setQuantity('1');
    setSelectedShopId('');
    setScanning(false);
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) resetForm();
    setOpen(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <ScanBarcode className="mr-2 h-4 w-4" />
          Scan Barcode
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Barcode Stock Update</DialogTitle>
          <DialogDescription>Scan a product barcode to quickly update stock</DialogDescription>
        </DialogHeader>

        {!foundProduct ? (
          <div className="space-y-4">
            {scanning ? (
              <div id="inventory-barcode-reader" className="w-full" />
            ) : (
              <div className="space-y-4">
                <Button onClick={() => setScanning(true)} className="w-full">
                  <ScanBarcode className="mr-2 h-4 w-4" />
                  Start Scanning
                </Button>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">Or enter manually</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter barcode"
                    value={scannedBarcode}
                    onChange={(e) => setScannedBarcode(e.target.value)}
                  />
                  <Button onClick={() => handleScanSuccess(scannedBarcode)} disabled={!scannedBarcode}>
                    Find
                  </Button>
                </div>
              </div>
            )}
            {scanning && (
              <Button variant="outline" onClick={() => setScanning(false)} className="w-full">
                Cancel Scan
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <p className="font-medium">{foundProduct.name}</p>
              <p className="text-sm text-muted-foreground">Barcode: {scannedBarcode}</p>
              <p className="text-sm text-muted-foreground">Category: {foundProduct.category}</p>
            </div>

            <div className="space-y-2">
              <Label>Transaction Type</Label>
              <RadioGroup
                value={transactionType}
                onValueChange={(v) => setTransactionType(v as 'in' | 'out')}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="in" id="in" />
                  <Label htmlFor="in" className="flex items-center gap-1 cursor-pointer">
                    <Plus className="h-4 w-4 text-green-500" /> Stock In
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="out" id="out" />
                  <Label htmlFor="out" className="flex items-center gap-1 cursor-pointer">
                    <Minus className="h-4 w-4 text-red-500" /> Stock Out
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label>Shop</Label>
              <Select value={selectedShopId} onValueChange={setSelectedShopId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select shop" />
                </SelectTrigger>
                <SelectContent>
                  {shops?.map((shop) => (
                    <SelectItem key={shop.id} value={shop.id}>{shop.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Quantity</Label>
              <Input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={resetForm} className="flex-1">
                Scan Another
              </Button>
              <Button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (updateStockMutation.isPending) return;
                  updateStockMutation.mutate();
                }}
                disabled={!selectedShopId || !quantity || updateStockMutation.isPending}
                className="flex-1"
              >
                {updateStockMutation.isPending ? 'Updating...' : 'Update Stock'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
