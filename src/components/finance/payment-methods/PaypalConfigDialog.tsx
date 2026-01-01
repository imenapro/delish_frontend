
import { useState } from 'react';
import { Wallet, AlertCircle } from 'lucide-react';
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
import { PaypalConfig, PaymentMethodConfig } from './types';

interface PaypalConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (config: PaypalConfig) => void;
  existingMethods?: PaymentMethodConfig[];
}

export function PaypalConfigDialog({ open, onOpenChange, onSave, existingMethods = [] }: PaypalConfigDialogProps) {
  const [email, setEmail] = useState('');

  const checkForDuplicates = () => {
    const duplicate = existingMethods.find(m => {
      if (m.type === 'paypal' && m.config.email) {
        return m.config.email.toLowerCase() === email.toLowerCase();
      }
      return false;
    });

    if (duplicate) {
      toast.error('This PayPal email is already registered.');
      return true;
    }
    return false;
  };

  const handleSave = () => {
    if (checkForDuplicates()) {
      return;
    }

    const newConfig: PaypalConfig = {
      id: crypto.randomUUID(),
      type: 'paypal',
      is_active: true,
      is_verified: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      config: {
        email
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
            <Wallet className="h-5 w-5 text-blue-500" />
            Add PayPal
          </DialogTitle>
          <DialogDescription>
            Connect your PayPal business account.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>PayPal Email</Label>
            <Input 
              type="email"
              placeholder="payments@business.com" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="rounded-md bg-yellow-50 p-3 flex items-start gap-3 border border-yellow-200">
            <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div className="text-xs text-yellow-800">
              <p className="font-medium mb-1">Coming Soon</p>
              This is a placeholder interface. PayPal integration is currently under development.
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!email}>
            Save Configuration
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
