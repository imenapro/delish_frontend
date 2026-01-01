
import { useState } from 'react';
import { Plus, CreditCard, Smartphone, Building2, Wallet, CheckCircle2, AlertCircle, Trash2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { usePaymentMethods } from './usePaymentMethods';
import { CardConfigDialog } from './CardConfigDialog';
import { MobileMoneyConfigDialog } from './MobileMoneyConfigDialog';
import { BankConfigDialog } from './BankConfigDialog';
import { PaypalConfigDialog } from './PaypalConfigDialog';
import { PaymentMethodConfig, CardConfig, MobileMoneyConfig, BankConfig, PaypalConfig } from './types';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { toast } from 'sonner';

export function TenantPaymentMethods() {
  const { paymentMethods, isLoading, savePaymentMethods } = usePaymentMethods();
  const [showCardDialog, setShowCardDialog] = useState(false);
  const [showMobileMoneyDialog, setShowMobileMoneyDialog] = useState(false);
  const [showBankDialog, setShowBankDialog] = useState(false);
  const [showPaypalDialog, setShowPaypalDialog] = useState(false);

  const handleAddMethod = (config: PaymentMethodConfig) => {
    savePaymentMethods.mutate([...paymentMethods, config]);
  };

  const handleDelete = (id: string) => {
    savePaymentMethods.mutate(paymentMethods.filter(m => m.id !== id));
    toast.success('Payment method removed');
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'visa':
      case 'mastercard':
      case 'amex':
      case 'discover':
        return <CreditCard className="h-6 w-6" />;
      case 'mobile_money':
        return <Smartphone className="h-6 w-6" />;
      case 'bank_transfer':
        return <Building2 className="h-6 w-6" />;
      case 'paypal':
        return <Wallet className="h-6 w-6" />;
      default:
        return <CreditCard className="h-6 w-6" />;
    }
  };

  const getTitle = (method: PaymentMethodConfig) => {
    if (method.type === 'visa' || method.type === 'mastercard' || method.type === 'amex' || method.type === 'discover') {
        const typeLabel = method.type.charAt(0).toUpperCase() + method.type.slice(1);
        return `${typeLabel} ending in •••• ${method.config.last_four}`;
    }

    switch (method.type) {
      case 'mobile_money':
        return `${method.config.provider} - ${method.config.phone_number}`;
      case 'bank_transfer':
        return `${method.config.bank_name} - ${method.config.account_number}`;
      case 'paypal':
        return `PayPal - ${method.config.email}`;
      default:
        return 'Unknown Method';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-[120px] w-full" />
        <Skeleton className="h-[120px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Payment Methods</h3>
          <p className="text-sm text-muted-foreground">
            Manage your payment methods for billing and payouts.
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Method
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setShowCardDialog(true)}>
              <CreditCard className="h-4 w-4 mr-2" />
              Credit/Debit Card
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowMobileMoneyDialog(true)}>
              <Smartphone className="h-4 w-4 mr-2" />
              Mobile Money
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowBankDialog(true)}>
              <Building2 className="h-4 w-4 mr-2" />
              Bank Transfer
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowPaypalDialog(true)}>
              <Wallet className="h-4 w-4 mr-2" />
              PayPal
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {paymentMethods.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-10 text-center">
            <CreditCard className="h-10 w-10 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No payment methods configured</p>
            <p className="text-sm text-muted-foreground mb-4">
              Add a payment method to enable transactions.
            </p>
            <Button variant="outline" onClick={() => setShowCardDialog(true)}>
              Add Card
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {paymentMethods.map((method) => (
            <Card key={method.id} className="overflow-hidden">
              <div className="p-6 flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-muted rounded-full">
                    {getIcon(method.type)}
                  </div>
                  <div>
                    <h4 className="font-semibold flex items-center gap-2">
                      {getTitle(method)}
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            {method.is_verified ? (
                              <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-100 cursor-help">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Verified
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100 cursor-help">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                Pending
                              </Badge>
                            )}
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{method.is_verified 
                              ? "This payment method has been verified and is ready for use." 
                              : "This payment method is pending verification. Transactions may be limited."}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      Added on {new Date(method.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => handleDelete(method.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <CardConfigDialog
        open={showCardDialog}
        onOpenChange={setShowCardDialog}
        onSave={handleAddMethod}
        existingMethods={paymentMethods}
      />
      <MobileMoneyConfigDialog
        open={showMobileMoneyDialog}
        onOpenChange={setShowMobileMoneyDialog}
        onSave={handleAddMethod}
        existingMethods={paymentMethods}
      />
      <BankConfigDialog
        open={showBankDialog}
        onOpenChange={setShowBankDialog}
        onSave={handleAddMethod}
      />
      <PaypalConfigDialog
        open={showPaypalDialog}
        onOpenChange={setShowPaypalDialog}
        onSave={handleAddMethod}
        existingMethods={paymentMethods}
      />
    </div>
  );
}
