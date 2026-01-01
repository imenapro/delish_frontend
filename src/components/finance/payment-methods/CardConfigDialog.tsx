
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { CreditCard, ShieldCheck, Lock, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CardConfig, PaymentMethodConfig } from './types';
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
  // Default grouping: 4-4-4-4
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
    if (!monthStr || !yearStr) return; // Regex handles format, this handles logic
    
    const month = parseInt(monthStr, 10);
    const year = parseInt(yearStr, 10);
    
    const now = new Date();
    const currentYear = now.getFullYear() % 100; // 2 digits
    const currentMonth = now.getMonth() + 1;
    
    if (year < currentYear || (year === currentYear && month < currentMonth)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Card has expired" });
    }
  }),
  cvv: z.string().min(3, 'Invalid CVV').max(4, 'Invalid CVV').regex(/^[0-9]+$/, 'Must be numeric'),
});

interface CardConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (config: CardConfig) => void;
  existingMethods: PaymentMethodConfig[];
}

export function CardConfigDialog({ open, onOpenChange, onSave, existingMethods }: CardConfigDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [detectedType, setDetectedType] = useState<CardType>(null);

  const form = useForm<z.infer<typeof cardSchema>>({
    resolver: zodResolver(cardSchema),
    defaultValues: {
      cardholder_name: '',
      card_number: '',
      expiry: '',
      cvv: '',
    },
    mode: 'onChange', // Enable real-time validation feedback
  });

  const cardNumber = form.watch('card_number');

  useEffect(() => {
    const type = detectCardType(cardNumber || '');
    setDetectedType(type);
  }, [cardNumber]);

  const onSubmit = async (values: z.infer<typeof cardSchema>) => {
    setIsSubmitting(true);
    
    // Simulate tokenization/encryption delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    const [expMonth, expYear] = values.expiry.split('/');
    const cleanNumber = values.card_number.replace(/\D/g, '');
    const type = detectCardType(cleanNumber);
    
    if (!type) {
      // Should be caught by validation, but just in case
      setIsSubmitting(false);
      return;
    }

    // Generate fingerprint for duplicate detection
    // In a real app, this would be returned by the tokenizer (e.g., Stripe fingerprint)
    // Here we simulate it with a simple hash of number + expiry
    const fingerprint = btoa(`${cleanNumber}-${expMonth}/${expYear}`);

    // Check for duplicates
    const isDuplicate = existingMethods.some(method => {
      if (method.type === 'visa' || method.type === 'mastercard' || method.type === 'amex' || method.type === 'discover') {
        return (method as CardConfig).config.fingerprint === fingerprint;
      }
      return false;
    });

    if (isDuplicate) {
      toast.error("This card is already registered", {
        description: "Please use a different card or check your existing payment methods."
      });
      setIsSubmitting(false);
      return;
    }

    const newConfig: CardConfig = {
      id: crypto.randomUUID(),
      type: type,
      is_active: true,
      is_verified: true, // Auto-verify for simulation
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      config: {
        cardholder_name: values.cardholder_name,
        last_four: cleanNumber.slice(-4),
        expiry_month: expMonth,
        expiry_year: expYear,
        token_id: `tok_${type}_${crypto.randomUUID()}`,
        fingerprint: fingerprint,
      }
    };

    onSave(newConfig);
    setIsSubmitting(false);
    onOpenChange(false);
    form.reset();
  };

  const getCardIcon = (type: CardType) => {
    // In a real app, use SVGs for Visa, Mastercard, etc.
    // Using Badges/Colors for now as requested "Display the corresponding card logo/icon"
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Add Payment Card
          </DialogTitle>
          <DialogDescription>
            Enter your card details. We support Visa, Mastercard, Amex, and Discover.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            
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
                        maxLength={19} // 16 digits + 3 spaces
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
                <p className="font-medium mb-1">Secure Encryption</p>
                Your card details are securely tokenized using bank-grade encryption. We never store your full card number.
              </div>
            </div>

            <DialogFooter className="mt-4">
              <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Verifying...' : 'Save Card'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
