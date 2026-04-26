import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Banknote, CreditCard, Smartphone, Wallet, Clock, X } from 'lucide-react';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { CartItem } from './POSCart';
import { formatCurrency, DEFAULT_SYSTEM_CURRENCY } from '@/utils/currency';
import { toast } from 'sonner';

const commandSchema = z.object({
  customer_name: z.string().min(2, 'Customer name is required'),
  customer_phone: z.string().min(9, 'Valid phone number required'),
  advance_amount: z.coerce.number().min(0, 'Advance must be 0 or more'),
  payment_method: z.enum(['cash', 'mobile_money', 'card', 'wallet']),
  notes: z.string().optional(),
});

interface POSCommandDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cartItems: CartItem[];
  total: number;
  onCreate: (data: {
    customer_name: string;
    customer_phone: string;
    advance_amount: number;
    payment_method: string;
    notes?: string;
  }) => Promise<void>;
  isProcessing: boolean;
  currency?: string;
}

export function POSCommandDialog({
  open,
  onOpenChange,
  cartItems,
  total,
  onCreate,
  isProcessing,
  currency = DEFAULT_SYSTEM_CURRENCY,
}: POSCommandDialogProps) {
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const form = useForm<z.infer<typeof commandSchema>>({
    resolver: zodResolver(commandSchema),
    defaultValues: {
      customer_name: '',
      customer_phone: '',
      advance_amount: 0,
      payment_method: 'cash',
      notes: '',
    },
    mode: 'onChange',
  });

  const advance_amount = form.watch('advance_amount') || 0;
  const remaining = total - advance_amount;

  const isValid = advance_amount >= 0 && advance_amount <= total && form.formState.isValid;

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (!open) {
      form.reset();
    }
  }, [open, form]);

  const handleCreate = async (values: z.infer<typeof commandSchema>) => {
    try {
      await onCreate({
        customer_name: values.customer_name,
        customer_phone: values.customer_phone,
        advance_amount: values.advance_amount,
        payment_method: values.payment_method,
        notes: values.notes,
      });
    } catch (error) {
      console.error('Failed to create command:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-2xl max-h-[95vh] p-0 flex flex-col gap-0">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0">
          <div>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-500" />
              Create Special Command
            </DialogTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Record customer details, product order, and collect advance payment
            </p>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
            disabled={isProcessing}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          <Form {...form}>
            <form id="command-form" className="space-y-6 px-6 py-6">
              {/* Customer Information */}
              <div className="space-y-4 border p-4 rounded-lg bg-slate-50 dark:bg-slate-900">
                <h3 className="font-semibold text-sm">Customer Information</h3>
                
                <FormField
                  control={form.control}
                  name="customer_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Customer Name *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter customer name" 
                          className="text-sm"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="customer_phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Customer Phone *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="07X XXX XXXX" 
                          type="tel"
                          className="text-sm"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Order Summary */}
              <div className="space-y-3 border p-4 rounded-lg bg-blue-50/50 dark:bg-blue-950/20">
                <h3 className="font-semibold text-sm">Order Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Items:</span>
                    <span className="font-medium">{cartItems.length} product(s)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Amount:</span>
                    <span className="font-semibold">{formatCurrency(total, currency)}</span>
                  </div>
                </div>
              </div>

              {/* Payment Information */}
              <div className="space-y-4 border p-4 rounded-lg bg-slate-50 dark:bg-slate-900">
                <h3 className="font-semibold text-sm">Payment Details</h3>

                {/* Advance Payment Amount */}
                <FormField
                  control={form.control}
                  name="advance_amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Advance Amount to Collect *</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="0"
                          min="0"
                          max={total}
                          step="1"
                          className="text-sm"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                      <div className="text-xs text-muted-foreground mt-2">
                        {advance_amount > 0 && (
                          <div>
                            Remaining due: <span className="font-semibold">{formatCurrency(remaining, currency)}</span>
                          </div>
                        )}
                      </div>
                    </FormItem>
                  )}
                />

                {/* Payment Method */}
                <FormField
                  control={form.control}
                  name="payment_method"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Payment Method *</FormLabel>
                      <FormControl>
                        <RadioGroup value={field.value} onValueChange={field.onChange}>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <Label
                              htmlFor="cash-cmd"
                              className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                                field.value === 'cash' ? 'border-primary bg-primary/5' : 'hover:bg-muted'
                              }`}
                            >
                              <RadioGroupItem value="cash" id="cash-cmd" />
                              <Banknote className="h-4 w-4" />
                              <span className="text-sm">Cash</span>
                            </Label>
                            <Label
                              htmlFor="mobile-cmd"
                              className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                                field.value === 'mobile_money' ? 'border-primary bg-primary/5' : 'hover:bg-muted'
                              }`}
                            >
                              <RadioGroupItem value="mobile_money" id="mobile-cmd" />
                              <Smartphone className="h-4 w-4" />
                              <span className="text-sm">Mobile</span>
                            </Label>
                            <Label
                              htmlFor="card-cmd"
                              className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                                field.value === 'card' ? 'border-primary bg-primary/5' : 'hover:bg-muted'
                              }`}
                            >
                              <RadioGroupItem value="card" id="card-cmd" />
                              <CreditCard className="h-4 w-4" />
                              <span className="text-sm">Card</span>
                            </Label>
                            <Label
                              htmlFor="wallet-cmd"
                              className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                                field.value === 'wallet' ? 'border-primary bg-primary/5' : 'hover:bg-muted'
                              }`}
                            >
                              <RadioGroupItem value="wallet" id="wallet-cmd" />
                              <Wallet className="h-4 w-4" />
                              <span className="text-sm">Wallet</span>
                            </Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Notes */}
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Special Notes (optional)</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g., Custom size, delivery instructions..." 
                        className="text-sm"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Total Summary */}
              <div className="rounded-lg bg-muted p-4 space-y-2 border">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Amount:</span>
                  <span className="font-semibold">{formatCurrency(total, currency)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Advance (Now):</span>
                  <span className="text-green-600 dark:text-green-400 font-semibold">
                    {formatCurrency(Math.max(0, advance_amount), currency)}
                  </span>
                </div>
                <div className="flex justify-between text-sm border-t pt-2 mt-2">
                  <span className="text-muted-foreground">Due on Pickup:</span>
                  <span className="text-orange-600 dark:text-orange-400 font-semibold">
                    {formatCurrency(Math.max(0, remaining), currency)}
                  </span>
                </div>
              </div>
            </form>
          </Form>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex-shrink-0 flex gap-3 justify-end bg-background">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={isProcessing}
          >
            Cancel
          </Button>
          <Button 
            form="command-form"
            onClick={form.handleSubmit(handleCreate)}
            disabled={!isValid || isProcessing}
          >
            {isProcessing ? 'Creating...' : 'Create Command'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
