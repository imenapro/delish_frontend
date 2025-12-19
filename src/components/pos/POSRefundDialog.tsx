import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Search, Loader2, RotateCcw, AlertTriangle, Upload, FileText, Camera } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { format } from 'date-fns';

interface POSRefundDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUserId?: string;
}

interface OrderItem {
  id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  product: {
    name: string;
  };
}

interface RefundItem {
  id: string; // Order Item ID
  quantity: number;
  price: number;
}

export function POSRefundDialog({ open, onOpenChange, currentUserId }: POSRefundDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchedOrder, setSearchedOrder] = useState<any>(null);
  const [selectedItems, setSelectedItems] = useState<Record<string, number>>({}); // itemId -> quantity
  const [reason, setReason] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const [step, setStep] = useState<'search' | 'details'>('search');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query to find order
  const searchOrder = async () => {
    if (!searchQuery.trim()) return;

    try {
      // First find the order
      const { data: orders, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            id,
            quantity,
            unit_price,
            subtotal,
            product:products (name)
          ),
          refunds (
            items
          )
        `)
        .or(`order_code.eq.${searchQuery},id.eq.${searchQuery},customer_phone.eq.${searchQuery}`)
        .limit(1);

      if (error) throw error;

      if (!orders || orders.length === 0) {
        toast({
          title: "Order not found",
          description: "Could not find an order with those details.",
          variant: "destructive"
        });
        return;
      }

      const order = orders[0];
      
      // Calculate remaining quantities
      const processedOrder = {
        ...order,
        order_items: order.order_items.map((item: any) => {
          const refundedQty = order.refunds?.reduce((acc: number, refund: any) => {
            const refundItems = refund.items as Record<string, any>[];
            const itemRefund = refundItems.find((ri: any) => ri.id === item.id); // Matches by Order Item ID (or Product ID if we structured it that way, but let's use Order Item ID)
             // Wait, the JSON structure in database will be array of objects. 
             // In the implementation below, I'll store it as array of { id: string, quantity: number, ... } where id is order_item_id
            return acc + (itemRefund?.quantity || 0);
          }, 0) || 0;

          return {
            ...item,
            remaining_quantity: item.quantity - refundedQty
          };
        })
      };

      setSearchedOrder(processedOrder);
      setStep('details');
      setSelectedItems({});
      setReason('');
      setPhoto(null);
      setPhotoPreview('');
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Error searching",
        description: err.message,
        variant: "destructive"
      });
    }
  };

  // Mutation to create refund
  const refundMutation = useMutation({
    mutationFn: async () => {
      if (!searchedOrder || !currentUserId) throw new Error("Missing order or user");

      let photoUrl = null;

      // Upload photo if exists
      if (photo) {
        const filePath = `refunds/${searchedOrder.id}/${Date.now()}-${photo.name}`;
        // Try upload to 'refund-images' bucket, fallback to 'product-images' if needed or fail
        // Assuming 'product-images' exists based on previous search, but ideally we want a separate bucket.
        // Let's try 'refund-images' first.
        
        // Note: If bucket doesn't exist, this will fail. 
        // For this environment, I'll try to use 'product-images' as a safe fallback or just 'refund-images' and hope.
        // Given user asked for photo, I'll try a generic path in an existing bucket if I can't create one.
        // But 'product-images' is public. Refund images might need privacy? 
        // The user said "accessible for audit", so maybe public is fine for internal use.
        // I'll use 'product-images' with a 'refunds/' prefix for safety if 'refund-images' fails? 
        // No, I'll try 'refund-images' and if it fails, I'll handle it. 
        // Actually, to ensure it works now without admin intervention, I'll use 'product-images' with a folder.
        // User didn't specify bucket name.
        
        const { data, error: uploadError } = await supabase.storage
          .from('product-images') // Using existing bucket to ensure it works
          .upload(filePath, photo);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('product-images')
          .getPublicUrl(filePath);
        
        photoUrl = publicUrl;
      }

      // Prepare items JSON
      const itemsToRefund = Object.entries(selectedItems).map(([itemId, qty]) => {
        const originalItem = searchedOrder.order_items.find((i: any) => i.id === itemId);
        return {
          id: itemId, // order_item_id
          product_id: originalItem.product_id,
          quantity: qty,
          price: originalItem.unit_price,
          subtotal: qty * originalItem.unit_price,
          product_name: originalItem.product.name
        };
      });

      const totalRefundAmount = itemsToRefund.reduce((acc, item) => acc + item.subtotal, 0);

      const { error } = await supabase
        .from('refunds')
        .insert({
          order_id: searchedOrder.id,
          staff_id: currentUserId,
          reason,
          total_amount: totalRefundAmount,
          items: itemsToRefund,
          photo_url: photoUrl
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Refund Processed",
        description: "The refund has been recorded successfully."
      });
      onOpenChange(false);
      setStep('search');
      setSearchQuery('');
      setSearchedOrder(null);
    },
    onError: (err: any) => {
      toast({
        title: "Refund Failed",
        description: err.message,
        variant: "destructive"
      });
    }
  });

  const handleQuantityChange = (itemId: string, qty: number, max: number) => {
    if (qty < 0) return;
    if (qty > max) {
      toast({
        title: "Invalid Quantity",
        description: `Cannot refund more than ${max} items.`,
        variant: "destructive"
      });
      return;
    }
    
    setSelectedItems(prev => {
      const next = { ...prev };
      if (qty === 0) {
        delete next[itemId];
      } else {
        next[itemId] = qty;
      }
      return next;
    });
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhoto(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const calculateTotalRefund = () => {
    if (!searchedOrder) return 0;
    return Object.entries(selectedItems).reduce((acc, [itemId, qty]) => {
      const item = searchedOrder.order_items.find((i: any) => i.id === itemId);
      return acc + (item ? item.unit_price * qty : 0);
    }, 0);
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset state after a delay to allow animation
    setTimeout(() => {
        setStep('search');
        setSearchQuery('');
        setSearchedOrder(null);
    }, 300);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5 text-red-500" />
            Process Refund
          </DialogTitle>
          <DialogDescription>
            Search for an order to process a refund.
          </DialogDescription>
        </DialogHeader>

        {step === 'search' ? (
          <div className="flex gap-2 py-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by Order Code, Invoice ID or Phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
                onKeyDown={(e) => e.key === 'Enter' && searchOrder()}
              />
            </div>
            <Button onClick={searchOrder}>Search</Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Order Info */}
            <div className="bg-muted/50 p-4 rounded-md text-sm grid grid-cols-2 gap-4">
              <div>
                <span className="font-semibold block">Order Code:</span>
                {searchedOrder.order_code}
              </div>
              <div>
                <span className="font-semibold block">Date:</span>
                {format(new Date(searchedOrder.created_at), 'PPP p')}
              </div>
              <div>
                <span className="font-semibold block">Customer:</span>
                {searchedOrder.customer_phone || 'N/A'}
              </div>
              <div>
                <span className="font-semibold block">Total:</span>
                {searchedOrder.total_amount.toLocaleString()}
              </div>
            </div>

            {/* Items Table */}
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Purchased</TableHead>
                    <TableHead>Remaining</TableHead>
                    <TableHead className="w-[100px]">Refund Qty</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {searchedOrder.order_items.map((item: any) => (
                    <TableRow key={item.id} className={item.remaining_quantity === 0 ? "opacity-50" : ""}>
                      <TableCell>{item.product.name}</TableCell>
                      <TableCell>{item.unit_price.toLocaleString()}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>{item.remaining_quantity}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          max={item.remaining_quantity}
                          value={selectedItems[item.id] || ''}
                          onChange={(e) => handleQuantityChange(item.id, parseInt(e.target.value) || 0, item.remaining_quantity)}
                          disabled={item.remaining_quantity === 0}
                          className="w-20"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Refund Details */}
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="reason">Reason for Refund <span className="text-red-500">*</span></Label>
                <Textarea
                  id="reason"
                  placeholder="Explain why this refund is being processed..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className={!reason && Object.keys(selectedItems).length > 0 ? "border-red-300" : ""}
                />
              </div>

              <div className="space-y-2">
                <Label>Returned Product Photo <span className="text-red-500">*</span></Label>
                <div className="flex items-center gap-4">
                    <Button
                        variant="outline"
                        onClick={() => document.getElementById('photo-upload')?.click()}
                        className="w-full"
                    >
                        <Camera className="mr-2 h-4 w-4" />
                        {photo ? 'Change Photo' : 'Upload Photo'}
                    </Button>
                    <Input
                        id="photo-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handlePhotoChange}
                    />
                </div>
                {photoPreview && (
                    <div className="mt-2 relative w-full h-32 bg-muted rounded-md overflow-hidden">
                        <img src={photoPreview} alt="Preview" className="w-full h-full object-contain" />
                    </div>
                )}
              </div>
            </div>

            {/* Total & Actions */}
            <div className="flex items-center justify-between border-t pt-4">
              <div className="text-lg font-bold">
                Refund Total: <span className="text-red-600">{calculateTotalRefund().toLocaleString()}</span>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setStep('search')}>Back</Button>
                <Button 
                    onClick={() => refundMutation.mutate()}
                    disabled={
                        Object.keys(selectedItems).length === 0 || 
                        !reason || 
                        !photo || 
                        refundMutation.isPending
                    }
                    className="bg-red-600 hover:bg-red-700"
                >
                    {refundMutation.isPending ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Processing...
                        </>
                    ) : (
                        'Confirm Refund'
                    )}
                </Button>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="sm:justify-start">
            {step === 'search' && (
                <div className="text-xs text-muted-foreground flex items-center gap-2">
                    <AlertTriangle className="h-3 w-3" />
                    Ensure you have the customer's invoice or order code.
                </div>
            )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
