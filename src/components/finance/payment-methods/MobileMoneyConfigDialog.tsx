
import { useState } from 'react';
import { Smartphone, AlertCircle, Store, User } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { MobileMoneyConfig, PaymentMethodConfig } from './types';

interface MobileMoneyConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (config: MobileMoneyConfig) => void;
  existingMethods?: PaymentMethodConfig[];
}

export function MobileMoneyConfigDialog({ open, onOpenChange, onSave, existingMethods = [] }: MobileMoneyConfigDialogProps) {
  const [provider, setProvider] = useState('');
  const [accountType, setAccountType] = useState<'phone_number' | 'merchant_code'>('phone_number');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [merchantCode, setMerchantCode] = useState('');

  const checkForDuplicates = () => {
    if (accountType === 'phone_number') {
      // Standardize phone number for comparison (remove spaces, dashes, etc.)
      const normalizedInput = phoneNumber.replace(/\D/g, '');
      
      const duplicate = existingMethods.find(m => {
        if (m.type === 'mobile_money' && m.config.account_type === 'phone_number' && m.config.phone_number) {
          const normalizedExisting = m.config.phone_number.replace(/\D/g, '');
          return normalizedExisting === normalizedInput;
        }
        return false;
      });

      if (duplicate) {
        toast.error('This phone number is already registered.');
        return true;
      }
    } else {
      // Exact match for merchant code
      const duplicate = existingMethods.find(m => {
        if (m.type === 'mobile_money' && m.config.account_type === 'merchant_code' && m.config.merchant_code) {
          return m.config.merchant_code === merchantCode;
        }
        return false;
      });

      if (duplicate) {
        toast.error('This merchant code is already registered.');
        return true;
      }
    }
    return false;
  };

  const handleSave = () => {
    if (checkForDuplicates()) {
      return;
    }

    // Stub implementation
    const newConfig: MobileMoneyConfig = {
      id: crypto.randomUUID(),
      type: 'mobile_money',
      is_active: true,
      is_verified: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      config: {
        provider,
        account_type: accountType,
        ...(accountType === 'phone_number' ? { phone_number: phoneNumber } : { merchant_code: merchantCode }),
      }
    };
    onSave(newConfig);
    onOpenChange(false);
    
    // Reset form
    setProvider('');
    setAccountType('phone_number');
    setPhoneNumber('');
    setMerchantCode('');
  };

  const isFormValid = () => {
    if (!provider) return false;
    if (accountType === 'phone_number' && !phoneNumber) return false;
    if (accountType === 'merchant_code' && (!merchantCode || merchantCode.length > 10)) return false;
    return true;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-orange-600" />
            Add Mobile Money
          </DialogTitle>
          <DialogDescription>
            Configure your mobile money payment details.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Provider</Label>
            <Select value={provider} onValueChange={setProvider}>
              <SelectTrigger>
                <SelectValue placeholder="Select provider" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="M-Pesa">M-Pesa</SelectItem>
                <SelectItem value="Airtel Money">Airtel Money</SelectItem>
                <SelectItem value="MTN Mobile Money">MTN Mobile Money</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label>Account Type</Label>
            <RadioGroup 
              defaultValue="phone_number" 
              value={accountType} 
              onValueChange={(val) => setAccountType(val as 'phone_number' | 'merchant_code')}
              className="grid grid-cols-2 gap-4"
            >
              <div>
                <RadioGroupItem value="phone_number" id="phone_number" className="peer sr-only" />
                <Label
                  htmlFor="phone_number"
                  className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                >
                  <User className="mb-2 h-6 w-6" />
                  Personal Number
                </Label>
              </div>
              <div>
                <RadioGroupItem value="merchant_code" id="merchant_code" className="peer sr-only" />
                <Label
                  htmlFor="merchant_code"
                  className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                >
                  <Store className="mb-2 h-6 w-6" />
                  Merchant Code
                </Label>
              </div>
            </RadioGroup>
          </div>

          {accountType === 'phone_number' ? (
            <div className="space-y-2">
              <Label>Phone Number</Label>
              <Input 
                placeholder="+250 7..." 
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
              />
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Merchant Code (Max 6 digits)</Label>
              <Input 
                placeholder="123456" 
                maxLength={6}
                value={merchantCode}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '');
                  setMerchantCode(val);
                }}
              />
              <p className="text-xs text-muted-foreground">
                Enter your 5-6 digit merchant code.
              </p>
            </div>
          )}

          <div className="rounded-md bg-yellow-50 p-3 flex items-start gap-3 border border-yellow-200">
            <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div className="text-xs text-yellow-800">
              <p className="font-medium mb-1">Coming Soon</p>
              This is a placeholder interface. Mobile Money integration is currently under development.
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!isFormValid()}>
            Save Configuration
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
