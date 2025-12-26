import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useStoreContext } from '@/contexts/StoreContext';
import { UserRole } from '@/hooks/useAuth';
import { UserPlus, Mail, Phone, Shield } from 'lucide-react';

interface InviteStaffDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shops: { id: string; name: string }[];
  onSuccess: () => void;
}

const AVAILABLE_ROLES = [
  { value: 'seller', label: 'Seller', description: 'Can process sales and view orders' },
  { value: 'branch_manager', label: 'Branch Manager', description: 'Manages a specific shop location' },
  { value: 'store_keeper', label: 'Store Keeper', description: 'Manages inventory and stock' },
  { value: 'accountant', label: 'Accountant', description: 'Access to financial reports' },
  { value: 'delivery', label: 'Delivery', description: 'Handles order deliveries' },
];

export function InviteStaffDialog({ open, onOpenChange, shops, onSuccess }: InviteStaffDialogProps) {
  const { store } = useStoreContext();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: '',
    shopId: '',
  });

  const generateTempPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
    return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.email || !formData.role) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!store) {
      toast.error('Store context not available');
      return;
    }

    setIsLoading(true);
    try {
      const tempPassword = generateTempPassword();

      // Create a temporary client to avoid switching the current session
      // @ts-expect-error - Accessing internal properties
      const supabaseUrl = supabase.supabaseUrl;
      // @ts-expect-error - Accessing internal properties
      const supabaseKey = supabase.supabaseKey;
      
      const tempClient = createClient(supabaseUrl, supabaseKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        }
      });

      // Create user via Temp Client
      const { data: authData, error: authError } = await tempClient.auth.signUp({
        email: formData.email,
        password: tempPassword,
        options: {
          data: {
            name: formData.name,
            phone: formData.phone,
            shop_id: formData.shopId || null,
          },
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Failed to create user');

      // Update profile with must_change_password flag
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          must_change_password: true,
          phone: formData.phone,
        })
        .eq('id', authData.user.id);

      if (profileError) {
        console.error('Profile update error:', profileError);
      }

      // Assign role with business and shop context
      const { error: roleError } = await supabase.from('user_roles').insert({
        user_id: authData.user.id,
        role: formData.role as UserRole['role'],
        business_id: store.id,
        shop_id: formData.shopId || null,
      });

      if (roleError) throw roleError;

      // Add to user_businesses junction table
      const { error: businessError } = await supabase.from('user_businesses').insert({
        user_id: authData.user.id,
        business_id: store.id,
      });

      if (businessError) {
        console.error('User business link error:', businessError);
      }

      // Send credentials via Edge Function
      try {
        const { error: funcError } = await supabase.functions.invoke('send-invite-credentials', {
          body: {
            email: formData.email,
            password: tempPassword,
            name: formData.name,
            phone: formData.phone,
          },
        });
        
        if (funcError) {
          console.error('Edge function error:', funcError);
          // Fallback to toast if function fails
          toast.success(
            `Staff member invited! Temporary password: ${tempPassword}`,
            { duration: 10000 }
          );
        } else {
          toast.success('Staff member invited and credentials sent!');
        }
      } catch (err) {
        console.error('Failed to invoke edge function:', err);
        toast.success(
          `Staff member invited! Temporary password: ${tempPassword}`,
          { duration: 10000 }
        );
      }

      // Reset form
      setFormData({ name: '', email: '', phone: '', role: '', shopId: '' });
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error('Error inviting staff:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to invite staff member');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Invite Staff Member
          </DialogTitle>
          <DialogDescription>
            Add a new team member to your business. They'll receive login credentials.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name *</Label>
            <Input
              id="name"
              placeholder="John Doe"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email Address *
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="john@example.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone" className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Phone Number
            </Label>
            <Input
              id="phone"
              type="tel"
              placeholder="07X XXX XXXX"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Role *
            </Label>
            <Select
              value={formData.role}
              onValueChange={(value) => setFormData({ ...formData, role: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {AVAILABLE_ROLES.map((role) => (
                  <SelectItem key={role.value} value={role.value}>
                    <div>
                      <p className="font-medium">{role.label}</p>
                      <p className="text-xs text-muted-foreground">{role.description}</p>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {shops.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="shop">Assign to Shop (optional)</Label>
              <Select
                value={formData.shopId}
                onValueChange={(value) => setFormData({ ...formData, shopId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a shop (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Shops</SelectItem>
                  {shops.map((shop) => (
                    <SelectItem key={shop.id} value={shop.id}>
                      {shop.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? 'Inviting...' : 'Send Invite'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
