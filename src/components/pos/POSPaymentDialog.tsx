import { useState, useEffect } from 'react';
import { playSound } from '@/utils/sounds';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Banknote, CreditCard, Smartphone, Wallet } from 'lucide-react';
import { CartItem } from './POSCart';
import { POSPostSaleDialog, PostSaleData } from './POSPostSaleDialog';

interface POSPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cartItems: CartItem[];
  total: number;
  onComplete: (paymentMethod: string, customerPhone?: string, extras?: PostSaleData) => void;
  isProcessing: boolean;
}

export function POSPaymentDialog({ 
  open, 
  onOpenChange, 
  cartItems,
  total,
  onComplete,
  isProcessing 
}: POSPaymentDialogProps) {
  const [paymentMethod, setPaymentMethod] = useState<string>('cash');
  const [customerPhone, setCustomerPhone] = useState('');
  const [cashReceived, setCashReceived] = useState('');
  const [showPostSale, setShowPostSale] = useState(false);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setShowPostSale(false);
      setPaymentMethod('cash');
      setCashReceived('');
      setCustomerPhone('');
    }
  }, [open]);

  const change = paymentMethod === 'cash' && cashReceived 
    ? parseFloat(cashReceived) - total 
    : 0;

  const handleInitialComplete = () => {
    // Instead of completing immediately, show the post-sale options
    setShowPostSale(true);
  };

  const handleFinalComplete = (data: PostSaleData) => {
    // Play checkout success sound when completing the payment
    playSound('checkout-success');
    onComplete(paymentMethod, customerPhone || undefined, data);
  };

  const canComplete = () => {
    if (paymentMethod === 'cash') {
      return parseFloat(cashReceived) >= total;
    }
    if (paymentMethod === 'mobile_money') {
      return customerPhone.length >= 10;
    }
    return true;
  };

  if (showPostSale) {
    return (
      <POSPostSaleDialog
        open={true} // It's always open if showPostSale is true
        onOpenChange={(isOpen) => {
            if (!isOpen) setShowPostSale(false);
        }}
        baseTotal={total}
        customerPhone={customerPhone}
        onConfirm={handleFinalComplete}
        isProcessing={isProcessing}
      />
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Complete Payment</DialogTitle>
          <DialogDescription>
            Total: <span className="font-bold text-primary">{total.toLocaleString()} RWF</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Payment Method Selection */}
          <div className="space-y-3">
            <Label>Payment Method</Label>
            <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
              <div className="grid grid-cols-2 gap-3">
                <Label
                  htmlFor="cash"
                  className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                    paymentMethod === 'cash' ? 'border-primary bg-primary/5' : 'hover:bg-muted'
                  }`}
                >
                  <RadioGroupItem value="cash" id="cash" />
                  <Banknote className="h-5 w-5" />
                  <span>Cash</span>
                </Label>
                <Label
                  htmlFor="mobile_money"
                  className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                    paymentMethod === 'mobile_money' ? 'border-primary bg-primary/5' : 'hover:bg-muted'
                  }`}
                >
                  <RadioGroupItem value="mobile_money" id="mobile_money" />
                  <Smartphone className="h-5 w-5" />
                  <span>Mobile Money</span>
                </Label>
                <Label
                  htmlFor="card"
                  className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                    paymentMethod === 'card' ? 'border-primary bg-primary/5' : 'hover:bg-muted'
                  }`}
                >
                  <RadioGroupItem value="card" id="card" />
                  <CreditCard className="h-5 w-5" />
                  <span>Card</span>
                </Label>
                <Label
                  htmlFor="wallet"
                  className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                    paymentMethod === 'wallet' ? 'border-primary bg-primary/5' : 'hover:bg-muted'
                  }`}
                >
                  <RadioGroupItem value="wallet" id="wallet" />
                  <Wallet className="h-5 w-5" />
                  <span>Wallet</span>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Cash Payment Fields */}
          {paymentMethod === 'cash' && (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="cashReceived">Cash Received</Label>
                <Input
                  id="cashReceived"
                  type="number"
                  placeholder="Enter amount received"
                  value={cashReceived}
                  onChange={(e) => setCashReceived(e.target.value)}
                />
              </div>
              {change > 0 && (
                <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                  <p className="text-sm text-green-600 dark:text-green-400">
                    Change to give: <span className="font-bold">{change.toLocaleString()} RWF</span>
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Mobile Money Fields */}
          {paymentMethod === 'mobile_money' && (
            <div className="space-y-2">
              <Label htmlFor="phone">Customer Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="07X XXX XXXX"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
              />
            </div>
          )}

          {/* Customer Phone (optional for receipt) */}
          {paymentMethod !== 'mobile_money' && (
            <div className="space-y-2">
              <Label htmlFor="customerPhone">Customer Phone (optional)</Label>
              <Input
                id="customerPhone"
                type="tel"
                placeholder="For receipt (optional)"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleInitialComplete} 
            disabled={!canComplete() || isProcessing}
          >
            {isProcessing ? 'Processing...' : 'Complete Sale'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
