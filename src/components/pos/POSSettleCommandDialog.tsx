import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Banknote, CreditCard, Smartphone, Wallet, CheckCircle } from 'lucide-react';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { formatCurrency, DEFAULT_SYSTEM_CURRENCY } from '@/utils/currency';

const settleSchema = z.object({
  final_payment: z.coerce.number().min(0.01, 'Payment must be greater than 0'),
  payment_method: z.enum(['cash', 'mobile_money', 'card', 'wallet']),
  notes: z.string().optional(),
});

export interface CommandToSettle {
  id: string;
  order_code: string;
  customer_name: string;
  customer_phone: string;
  total_amount: number;
  advance_paid: number;
  remaining_due: number;
}

interface POSSettleCommandDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  command: CommandToSettle | null;
  onSettle: (data: {
    order_id: string;
    final_payment: number;
    payment_method: string;
    notes?: string;
  }) => Promise<void>;
  isProcessing: boolean;
  currency?: string;
}

export function POSSettleCommandDialog({
  open,
  onOpenChange,
  command,
  onSettle,
  isProcessing,
  currency = DEFAULT_SYSTEM_CURRENCY,
}: POSSettleCommandDialogProps) {
  const form = useForm<z.infer<typeof settleSchema>>({
    resolver: zodResolver(settleSchema),
    defaultValues: {
      final_payment: command?.remaining_due || 0,
      payment_method: 'cash',
      notes: '',
    },
    mode: 'onChange',
  });

  const final_payment = form.watch('final_payment') || 0;
  const isValid = 
    final_payment > 0 && 
    final_payment <= (command?.remaining_due || 0) && 
    form.formState.isValid;

  // Reset form when dialog opens/closes or command changes
  useEffect(() => {
    if (!open || !command) {
      form.reset();
    } else if (command) {
      form.reset({
        final_payment: command.remaining_due || 0,
        payment_method: 'cash',
        notes: '',
      });
    }
  }, [open, command, form]);

  const handleSettle = async (values: z.infer<typeof settleSchema>) => {
    if (!command) return;
    try {
      await onSettle({
        order_id: command.id,
        final_payment: values.final_payment,
        payment_method: values.payment_method,
        notes: values.notes,
      });
    } catch (error) {
      console.error('Failed to settle command:', error);
    }
  };

  if (!command) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-md sm:max-w-lg md:max-w-2xl max-h-[90vh] p-0 flex flex-col">
        <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-2 sm:pb-3 flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Settle Command Payment
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Record the final payment for customer pickup
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 overflow-hidden">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSettle)} className="space-y-4 sm:space-y-6 px-4 sm:px-6 pb-4 sm:pb-6">
              {/* Command Details */}
              <div className="space-y-2 sm:space-y-3 border p-3 sm:p-4 rounded-lg bg-slate-50 dark:bg-slate-900">
                <h3 className="font-semibold text-xs sm:text-sm">Command Details</h3>
                <div className="space-y-1 sm:space-y-2 text-xs sm:text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Order Code:</span>
                    <span className="font-mono font-semibold text-xs">{command.order_code}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Customer:</span>
                    <span className="text-right">{command.customer_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Phone:</span>
                    <span className="font-mono text-xs">{command.customer_phone}</span>
                  </div>
                </div>
              </div>

              {/* Payment Summary */}
              <div className="space-y-2 border p-3 sm:p-4 rounded-lg bg-blue-50/50 dark:bg-blue-950/20">
                <h3 className="font-semibold text-xs sm:text-sm mb-2">Payment Summary</h3>
                <div className="space-y-1 sm:space-y-2 text-xs sm:text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Amount:</span>
                    <span className="font-semibold">{formatCurrency(command.total_amount, currency)}</span>
                  </div>
                  <div className="flex justify-between text-green-600 dark:text-green-400">
                    <span className="text-muted-foreground">Advance Paid:</span>
                    <span className="font-semibold">{formatCurrency(command.advance_paid, currency)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-1 sm:pt-2 text-orange-600 dark:text-orange-400">
                    <span className="text-muted-foreground font-medium">Remaining Due:</span>
                    <span className="font-semibold text-sm sm:text-lg">{formatCurrency(command.remaining_due, currency)}</span>
                  </div>
                </div>
              </div>

              {/* Final Payment */}
              <FormField
                control={form.control}
                name="final_payment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs sm:text-sm">Final Payment Amount</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="0"
                        min="0.01"
                        max={command.remaining_due}
                        step="1"
                        className="text-sm"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                    {final_payment > 0 && final_payment < command.remaining_due && (
                      <div className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                        Customer will still owe: {formatCurrency(command.remaining_due - final_payment, currency)}
                      </div>
                    )}
                    {final_payment >= command.remaining_due && (
                      <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                        ✓ Full balance will be settled
                      </div>
                    )}
                  </FormItem>
                )}
              />

              {/* Payment Method */}
              <FormField
                control={form.control}
                name="payment_method"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs sm:text-sm">Payment Method</FormLabel>
                    <FormControl>
                      <RadioGroup value={field.value} onValueChange={field.onChange}>
                        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2">
                          <Label
                            htmlFor="cash-settle"
                            className={`flex items-center gap-2 p-2 sm:p-3 border rounded-lg cursor-pointer transition-colors ${
                              field.value === 'cash' ? 'border-primary bg-primary/5' : 'hover:bg-muted'
                            }`}
                          >
                            <RadioGroupItem value="cash" id="cash-settle" className="h-4 w-4" />
                            <Banknote className="h-4 w-4" />
                            <span className="text-xs sm:text-sm">Cash</span>
                          </Label>
                          <Label
                            htmlFor="mobile-settle"
                            className={`flex items-center gap-2 p-2 sm:p-3 border rounded-lg cursor-pointer transition-colors ${
                              field.value === 'mobile_money' ? 'border-primary bg-primary/5' : 'hover:bg-muted'
                            }`}
                          >
                            <RadioGroupItem value="mobile_money" id="mobile-settle" className="h-4 w-4" />
                            <Smartphone className="h-4 w-4" />
                            <span className="text-xs sm:text-sm">Mobile</span>
                          </Label>
                          <Label
                            htmlFor="card-settle"
                            className={`flex items-center gap-2 p-2 sm:p-3 border rounded-lg cursor-pointer transition-colors ${
                              field.value === 'card' ? 'border-primary bg-primary/5' : 'hover:bg-muted'
                            }`}
                          >
                            <RadioGroupItem value="card" id="card-settle" className="h-4 w-4" />
                            <CreditCard className="h-4 w-4" />
                            <span className="text-xs sm:text-sm">Card</span>
                          </Label>
                          <Label
                            htmlFor="wallet-settle"
                            className={`flex items-center gap-2 p-2 sm:p-3 border rounded-lg cursor-pointer transition-colors ${
                              field.value === 'wallet' ? 'border-primary bg-primary/5' : 'hover:bg-muted'
                            }`}
                          >
                            <RadioGroupItem value="wallet" id="wallet-settle" className="h-4 w-4" />
                            <Wallet className="h-4 w-4" />
                            <span className="text-xs sm:text-sm">Wallet</span>
                          </Label>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Notes */}
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs sm:text-sm">Notes (optional)</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g., partial payment, instructions..." 
                        className="text-sm"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </ScrollArea>

        <DialogFooter className="px-4 sm:px-6 pb-4 sm:pb-6 pt-2 sm:pt-3 border-t flex-shrink-0 gap-2 sm:gap-3">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={isProcessing}
            className="text-xs sm:text-sm"
          >
            Cancel
          </Button>
          <Button 
            onClick={form.handleSubmit(handleSettle)}
            disabled={!isValid || isProcessing}
            className="bg-green-600 hover:bg-green-700 text-xs sm:text-sm"
          >
            {isProcessing ? 'Processing...' : 'Record Payment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
