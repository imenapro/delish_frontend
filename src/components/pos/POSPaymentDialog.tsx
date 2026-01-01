import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { playSound } from '@/utils/sounds';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Banknote, CreditCard, Smartphone, Wallet, ShieldCheck, Lock, AlertCircle } from 'lucide-react';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { CartItem } from './POSCart';
import { POSPostSaleDialog, PostSaleData } from './POSPostSaleDialog';
import { formatCurrency, DEFAULT_SYSTEM_CURRENCY } from '@/utils/currency';
import { toast } from 'sonner';

// Regex patterns for card types
const CARD_PATTERNS = {
  visa: /^4/,
  mastercard: /^5[1-5]|^2(?:2(?:2[1-9]|[3-9]\d)|[3-6]\d\d|7(?:[01]\d|20))/,
  amex: /^3[47]/,
  discover: /^6(?:011|5)/,
};

type CardType = 'visa' | 'mastercard' | 'amex' | 'discover' | null;

const detectCardType = (number: string): CardType => {
  const clean = number.replace(/\D/g, '');
  if (CARD_PATTERNS.visa.test(clean)) return 'visa';
  if (CARD_PATTERNS.mastercard.test(clean)) return 'mastercard';
  if (CARD_PATTERNS.amex.test(clean)) return 'amex';
  if (CARD_PATTERNS.discover.test(clean)) return 'discover';
  return null;
};

const formatCardNumber = (value: string) => {
  const clean = value.replace(/\D/g, '');
  const groups = clean.match(/.{1,4}/g);
  return groups ? groups.join(' ') : clean;
};

const formatExpiry = (value: string) => {
  const clean = value.replace(/\D/g, '');
  if (clean.length >= 2) {
    return `${clean.slice(0, 2)}/${clean.slice(2, 4)}`;
  }
  return clean;
};

const cardSchema = z.object({
  cardholder_name: z.string().min(2, 'Name must be at least 2 characters'),
  card_number: z.string().superRefine((val, ctx) => {
    const clean = val.replace(/\D/g, '');
    const type = detectCardType(clean);
    
    if (!clean) {
       ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Card number is required" });
       return;
    }

    if (!type) {
       ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Invalid or unsupported card type" });
       return;
    }

    if (type === 'amex') {
      if (clean.length !== 15) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Amex card must be 15 digits" });
      }
    } else {
      if (clean.length !== 16) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Card number must be 16 digits" });
      }
    }
  }),
  expiry: z.string().regex(/^(0[1-9]|1[0-2])\/([0-9]{2})$/, 'Invalid date (MM/YY)').superRefine((val, ctx) => {
    const [monthStr, yearStr] = val.split('/');
    if (!monthStr || !yearStr) return;
    
    const month = parseInt(monthStr, 10);
    const year = parseInt(yearStr, 10);
    
    const now = new Date();
    const currentYear = now.getFullYear() % 100;
    const currentMonth = now.getMonth() + 1;
    
    if (year < currentYear || (year === currentYear && month < currentMonth)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Card has expired" });
    }
  }),
  cvv: z.string().min(3, 'Invalid CVV').max(4, 'Invalid CVV').regex(/^[0-9]+$/, 'Must be numeric'),
});

interface POSPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cartItems: CartItem[];
  total: number;
  onComplete: (paymentMethod: string, customerPhone?: string, extras?: PostSaleData) => void;
  isProcessing: boolean;
  currency?: string;
}

export function POSPaymentDialog({ 
  open, 
  onOpenChange, 
  cartItems,
  total,
  onComplete,
  isProcessing,
  currency = DEFAULT_SYSTEM_CURRENCY
}: POSPaymentDialogProps) {
  const [paymentMethod, setPaymentMethod] = useState<string>('cash');
  const [customerPhone, setCustomerPhone] = useState('');
  const [cashReceived, setCashReceived] = useState('');
  const [showPostSale, setShowPostSale] = useState(false);
  const [detectedType, setDetectedType] = useState<CardType>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const form = useForm<z.infer<typeof cardSchema>>({
    resolver: zodResolver(cardSchema),
    defaultValues: {
      cardholder_name: '',
      card_number: '',
      expiry: '',
      cvv: '',
    },
    mode: 'onChange',
  });

  const cardNumber = form.watch('card_number');

  useEffect(() => {
    const type = detectCardType(cardNumber || '');
    setDetectedType(type);
  }, [cardNumber]);

  // Reset state when dialog closes or payment method changes
  useEffect(() => {
    if (!open) {
      setShowPostSale(false);
      setPaymentMethod('cash');
      setCashReceived('');
      setCustomerPhone('');
      form.reset();
    }
  }, [open, form]);

  useEffect(() => {
    // When switching to card, reset form
    if (paymentMethod === 'card') {
      form.reset();
    }
  }, [paymentMethod, form]);

  const change = paymentMethod === 'cash' && cashReceived 
    ? parseFloat(cashReceived) - total 
    : 0;

  const handleCardSubmit = async (values: z.infer<typeof cardSchema>) => {
    setIsVerifying(true);
    
    // Simulate payment processing delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Simulate funds verification (fail if amount > 5000 for testing purposes, or just success)
    // For now, always success unless card number ends in 0000 (simulated decline)
    if (values.card_number.replace(/\D/g, '').endsWith('0000')) {
        toast.error('Transaction Declined', {
            description: 'Insufficient funds or card declined by issuer.'
        });
        setIsVerifying(false);
        return;
    }

    const transactionId = `TXN-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    
    toast.success('Payment Successful', {
        description: `Transaction ID: ${transactionId}`
    });

    setIsVerifying(false);
    setShowPostSale(true);
  };

  const handleInitialComplete = () => {
    if (paymentMethod === 'card') {
      form.handleSubmit(handleCardSubmit)();
      return;
    }
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
    if (paymentMethod === 'card') {
      // Form validation is handled by handleSubmit, but we can disable button if invalid
      return form.formState.isValid;
    }
    return true;
  };

  const getCardIcon = (type: CardType) => {
    if (!type) return <CreditCard className="h-5 w-5 text-muted-foreground" />;
    
    switch (type) {
      case 'visa':
        return <div className="font-bold text-blue-600 border border-blue-200 px-2 py-0.5 rounded text-xs bg-blue-50">VISA</div>;
      case 'mastercard':
        return <div className="font-bold text-orange-600 border border-orange-200 px-2 py-0.5 rounded text-xs bg-orange-50">Mastercard</div>;
      case 'amex':
        return <div className="font-bold text-blue-400 border border-blue-200 px-2 py-0.5 rounded text-xs bg-blue-50">AMEX</div>;
      case 'discover':
        return <div className="font-bold text-orange-400 border border-orange-200 px-2 py-0.5 rounded text-xs bg-orange-50">Discover</div>;
      default:
        return <CreditCard className="h-5 w-5" />;
    }
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
            Total: <span className="font-bold text-primary">{formatCurrency(total, currency)}</span>
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
                    Change to give: <span className="font-bold">{formatCurrency(change, currency)}</span>
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Card Payment Form */}
          {paymentMethod === 'card' && (
            <Form {...form}>
                <form className="space-y-4 border p-4 rounded-lg bg-slate-50 dark:bg-slate-900">
                    <FormField
                      control={form.control}
                      name="card_number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Card Number</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input 
                                placeholder="0000 0000 0000 0000" 
                                {...field}
                                maxLength={19}
                                onChange={(e) => {
                                  const formatted = formatCardNumber(e.target.value);
                                  field.onChange(formatted);
                                }}
                              />
                              <div className="absolute right-3 top-2.5">
                                {getCardIcon(detectedType)}
                              </div>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="expiry"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Expiry Date</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="MM/YY" 
                                {...field}
                                maxLength={5}
                                onChange={(e) => {
                                  const formatted = formatExpiry(e.target.value);
                                  field.onChange(formatted);
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="cvv"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>CVV</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input 
                                  placeholder="123" 
                                  {...field}
                                  maxLength={4}
                                  type="password"
                                />
                                <Lock className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="cardholder_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cardholder Name</FormLabel>
                          <FormControl>
                            <Input placeholder="John Doe" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="rounded-md bg-blue-50 p-3 flex items-start gap-3 border border-blue-200">
                      <ShieldCheck className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div className="text-xs text-blue-800">
                        <p className="font-medium mb-1">Secure Transaction</p>
                        Your payment is secured with 256-bit encryption.
                      </div>
                    </div>
                </form>
            </Form>
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
            disabled={!canComplete() || isProcessing || isVerifying}
          >
            {isProcessing || isVerifying ? 'Processing...' : (paymentMethod === 'card' ? `Pay ${formatCurrency(total, currency)}` : 'Complete Sale')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
