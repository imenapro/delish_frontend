
import { useState } from 'react';
import { Building2, AlertCircle } from 'lucide-react';
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
import { BankConfig } from './types';

interface BankConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (config: BankConfig) => void;
}

export function BankConfigDialog({ open, onOpenChange, onSave }: BankConfigDialogProps) {
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [swiftCode, setSwiftCode] = useState('');

  const handleSave = () => {
    const newConfig: BankConfig = {
      id: crypto.randomUUID(),
      type: 'bank_transfer',
      is_active: true,
      is_verified: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      config: {
        bank_name: bankName,
        account_number: accountNumber,
        account_name: accountName,
        swift_code: swiftCode
      }
    };
    onSave(newConfig);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-gray-600" />
            Add Bank Account
          </DialogTitle>
          <DialogDescription>
            Enter your bank account details for transfers.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Bank Name</Label>
            <Input 
              placeholder="e.g. Chase Bank" 
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Account Name</Label>
            <Input 
              placeholder="Business Name Ltd" 
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Account Number</Label>
              <Input 
                placeholder="0000000000" 
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>SWIFT/BIC</Label>
              <Input 
                placeholder="CHASUS33" 
                value={swiftCode}
                onChange={(e) => setSwiftCode(e.target.value)}
              />
            </div>
          </div>

          <div className="rounded-md bg-yellow-50 p-3 flex items-start gap-3 border border-yellow-200">
            <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div className="text-xs text-yellow-800">
              <p className="font-medium mb-1">Coming Soon</p>
              This is a placeholder interface. Bank Transfer integration is currently under development.
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!bankName || !accountNumber}>
            Save Configuration
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
