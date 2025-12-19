import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Printer, Mail, MessageSquare, Package, Receipt } from 'lucide-react';

interface POSPostSaleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  baseTotal: number;
  customerPhone?: string;
  onConfirm: (data: PostSaleData) => void;
  isProcessing: boolean;
}

export interface PostSaleData {
  needReceipt: boolean;
  printReceipt: boolean;
  emailReceipt: boolean;
  email?: string;
  smsReceipt: boolean;
  smsPhone?: string;
  chargeSms: boolean;
  smsFee: number;
  packaging: boolean;
  packagingFee: number;
  finalTotal: number;
}

export function POSPostSaleDialog({
  open,
  onOpenChange,
  baseTotal,
  customerPhone = '',
  onConfirm,
  isProcessing
}: POSPostSaleDialogProps) {
  const [needReceipt, setNeedReceipt] = useState(true);
  const [printReceipt, setPrintReceipt] = useState(true);
  
  const [emailReceipt, setEmailReceipt] = useState(false);
  const [email, setEmail] = useState('');
  
  const [smsReceipt, setSmsReceipt] = useState(false);
  const [smsPhone, setSmsPhone] = useState(customerPhone);
  const [chargeSms, setChargeSms] = useState(false);
  const [smsFee, setSmsFee] = useState(50); // Default 50 RWF
  
  const [packaging, setPackaging] = useState(false);
  const [packagingFee, setPackagingFee] = useState(100); // Default 100 RWF

  useEffect(() => {
    if (open) {
        setSmsPhone(customerPhone);
    }
  }, [open, customerPhone]);

  const calculateTotal = () => {
    let total = baseTotal;
    if (chargeSms) total += smsFee;
    if (packaging) total += packagingFee;
    return total;
  };

  const handleConfirm = () => {
    onConfirm({
      needReceipt,
      printReceipt: needReceipt && printReceipt,
      emailReceipt: needReceipt && emailReceipt,
      email: (needReceipt && emailReceipt) ? email : undefined,
      smsReceipt: needReceipt && smsReceipt,
      smsPhone: (needReceipt && smsReceipt) ? smsPhone : undefined,
      chargeSms,
      smsFee,
      packaging,
      packagingFee,
      finalTotal: calculateTotal()
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Sale Options</DialogTitle>
          <DialogDescription>
            Configure receipt and additional charges
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-6">
          {/* Receipt Options */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="h-4 w-4" />
                <Label htmlFor="need-receipt" className="font-medium">Need Receipt?</Label>
              </div>
              <Switch
                id="need-receipt"
                checked={needReceipt}
                onCheckedChange={setNeedReceipt}
              />
            </div>

            {needReceipt && (
              <div className="pl-6 space-y-3 border-l-2 border-muted ml-2">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="print" 
                    checked={printReceipt}
                    onCheckedChange={(c) => setPrintReceipt(c === true)}
                  />
                  <Label htmlFor="print" className="cursor-pointer flex items-center gap-2">
                    <Printer className="h-4 w-4" /> Print Receipt
                  </Label>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="email-receipt" 
                      checked={emailReceipt}
                      onCheckedChange={(c) => setEmailReceipt(c === true)}
                    />
                    <Label htmlFor="email-receipt" className="cursor-pointer flex items-center gap-2">
                      <Mail className="h-4 w-4" /> Email Receipt
                    </Label>
                  </div>
                  {emailReceipt && (
                    <Input 
                      placeholder="Enter email address" 
                      type="email" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="ml-6 w-[calc(100%-1.5rem)]"
                    />
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="sms-receipt" 
                        checked={smsReceipt}
                        onCheckedChange={(c) => setSmsReceipt(c === true)}
                      />
                      <Label htmlFor="sms-receipt" className="cursor-pointer flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" /> SMS Receipt
                      </Label>
                    </div>
                    {smsReceipt && (
                        <div className="flex items-center space-x-2">
                            <Checkbox 
                                id="charge-sms"
                                checked={chargeSms}
                                onCheckedChange={(c) => setChargeSms(c === true)}
                            />
                            <Label htmlFor="charge-sms" className="text-xs">Charge Fee?</Label>
                        </div>
                    )}
                  </div>
                  {smsReceipt && (
                    <div className="ml-6 space-y-2">
                        <Input 
                          placeholder="Phone number" 
                          type="tel" 
                          value={smsPhone}
                          onChange={(e) => setSmsPhone(e.target.value)}
                          className="w-[calc(100%-0.5rem)]"
                        />
                        {chargeSms && (
                            <div className="flex items-center gap-2">
                                <Label className="text-xs whitespace-nowrap">Fee (RWF):</Label>
                                <Input 
                                    type="number" 
                                    value={smsFee} 
                                    onChange={(e) => setSmsFee(Number(e.target.value))}
                                    className="h-8 w-24"
                                />
                            </div>
                        )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Additional Charges */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground">Additional Charges</h4>
            
            <div className="flex items-start space-x-3">
              <Checkbox 
                id="packaging" 
                checked={packaging}
                onCheckedChange={(c) => setPackaging(c === true)}
                className="mt-1"
              />
              <div className="grid gap-1.5 leading-none w-full">
                <Label htmlFor="packaging" className="cursor-pointer flex items-center gap-2">
                  <Package className="h-4 w-4" /> Quick Packaging
                </Label>
                {packaging && (
                   <div className="flex items-center gap-2 mt-1">
                        <Label className="text-xs whitespace-nowrap">Fee (RWF):</Label>
                        <Input 
                            type="number" 
                            value={packagingFee} 
                            onChange={(e) => setPackagingFee(Number(e.target.value))}
                            className="h-8 w-24"
                        />
                    </div>
                )}
              </div>
            </div>
          </div>

          {/* Total Summary */}
          <div className="rounded-lg bg-muted p-4">
            <div className="flex justify-between text-sm mb-2">
              <span>Subtotal:</span>
              <span>{baseTotal.toLocaleString()} RWF</span>
            </div>
            {chargeSms && (
              <div className="flex justify-between text-sm text-muted-foreground mb-1">
                <span>SMS Fee:</span>
                <span>+{smsFee.toLocaleString()} RWF</span>
              </div>
            )}
            {packaging && (
              <div className="flex justify-between text-sm text-muted-foreground mb-1">
                <span>Packaging:</span>
                <span>+{packagingFee.toLocaleString()} RWF</span>
              </div>
            )}
            <Separator className="my-2" />
            <div className="flex justify-between font-bold text-lg">
              <span>Total:</span>
              <span>{calculateTotal().toLocaleString()} RWF</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Back
          </Button>
          <Button onClick={handleConfirm} disabled={isProcessing}>
            {isProcessing ? 'Processing...' : 'Confirm & Finalize'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
