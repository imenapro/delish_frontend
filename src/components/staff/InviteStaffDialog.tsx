import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useStoreContext } from '@/contexts/StoreContext';
import { UserRole } from '@/hooks/useAuth';
import { UserPlus, Mail, Phone, Shield, MessageSquare } from 'lucide-react';

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
  const [showSmsPreview, setShowSmsPreview] = useState(false);
  const [smsPreview, setSmsPreview] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: '',
    shopId: '',
  });

  const COST_PER_UNIT = 15;

  useEffect(() => {
    if (store && open) {
      const loginUrl = window.location.pathname.startsWith(`/${store.slug}`) 
        ? `${window.location.origin}/${store.slug}/login`
        : `${window.location.origin}/login`;
        
      const msg = `Welcome to ${store.name}!
Credentials:
Email: ${formData.email?.trim() || '[Email]'}
Pwd: ${'********'}
Login: ${loginUrl}`;
      setSmsPreview(msg);
    }
  }, [formData.email, store, open]);

  const calculateSmsCost = (text: string) => {
    const length = text.length;
    const units = Math.ceil(length / 160) || 1;
    const cost = units * COST_PER_UNIT;
    return { length, units, cost };
  };

  const { length: smsLength, units: smsUnits } = calculateSmsCost(smsPreview);

  const generateTempPassword = () => {
    // Removed special characters to avoid SMS delivery/encoding issues
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
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

      // Send credentials via Email Service
      try {
        const loginUrl = window.location.pathname.startsWith(`/${store.slug}`) 
          ? `${window.location.origin}/${store.slug}/login`
          : `${window.location.origin}/login`;

        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
            <h1 style="color: #2563eb;">Welcome to ${store.name}!</h1>
            <p>Hello ${formData.name},</p>
            <p>Your staff account has been successfully created. You can now access the ${store.name} platform.</p>
            
            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e5e7eb;">
              <h3 style="margin-top: 0; color: #1f2937;">Your Login Credentials</h3>
              <p style="margin: 5px 0;"><strong>Email:</strong> ${formData.email}</p>
              <p style="margin: 5px 0;"><strong>Temporary Password:</strong> <code style="background: #fff; padding: 2px 6px; border-radius: 4px; border: 1px solid #d1d5db;">${tempPassword}</code></p>
            </div>

            <p><strong>Next Steps:</strong></p>
            <ol style="line-height: 1.6;">
              <li>Go to <a href="${loginUrl}" style="color: #2563eb; text-decoration: none;">${loginUrl}</a></li>
              <li>Log in using the credentials above.</li>
              <li>You will be prompted to change your password immediately upon first login.</li>
            </ol>

            <p>For security reasons, please do not share your password with anyone. If you have any trouble logging in, please contact your store manager or system administrator.</p>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
            <p style="font-size: 12px; color: #6b7280; text-align: center;">
              This is an automated message from ${store.name}. Please do not reply directly to this email.
            </p>
          </div>
        `;

        const { error: funcError } = await supabase.functions.invoke('send-email', {
          body: {
            to: formData.email,
            subject: `Welcome to ${store.name} - Your Account Credentials`,
            html: emailHtml,
            businessId: store.id, // Use tenant-specific email settings if available
          },
        });
        
        if (funcError) {
          console.error('Email service error:', funcError);
          // Fallback to toast if function fails, ensuring the user still gets the password
          toast.success(
            `Staff member invited! Temporary password: ${tempPassword}`,
            { duration: 10000 }
          );
        } else {
          toast.success('Staff member invited and welcome email sent!');
        }
      } catch (err) {
        console.error('Failed to invoke email service:', err);
        toast.success(
          `Staff member invited! Temporary password: ${tempPassword}`,
          { duration: 10000 }
        );
      }

      // Always send SMS if phone number is present
      if (formData.phone) {
        try {
          let cleanPhone = formData.phone.replace(/\D/g, '');
          // Auto-format for Rwanda (if starts with 07 or 7, prepend 250)
          if (cleanPhone.startsWith('07') && cleanPhone.length === 10) {
            cleanPhone = '250' + cleanPhone.substring(1);
          } else if (cleanPhone.startsWith('7') && cleanPhone.length === 9) {
            cleanPhone = '250' + cleanPhone;
          }

          if (cleanPhone.length >= 10) {
             const loginUrl = window.location.pathname.startsWith(`/${store.slug}`) 
               ? `${window.location.origin}/${store.slug}/login`
               : `${window.location.origin}/login`;
               
             const smsMsg = `Welcome to ${store.name}!
Credentials:
Email: ${formData.email.trim()}
Pwd: ${tempPassword}
Login: ${loginUrl}`;

             // Validation: Check length before sending
             if (smsMsg.length > 160) {
               console.warn('SMS exceeds 160 chars, sending anyway as per user request (multi-part supported by provider usually)');
             }

             const { data: smsData, error: smsError } = await supabase.functions.invoke('send-sms', {
               body: {
                 phoneNumber: cleanPhone,
                 message: smsMsg,
               },
             });

             // Log SMS attempt
             const { units, cost } = calculateSmsCost(smsMsg);
             const logStatus = (!smsError && smsData?.success) ? 'sent' : 'failed';
             const logError = smsError?.message || smsData?.error || (smsData?.success ? null : 'Unknown error');

             await supabase.from('sms_logs').insert({
               business_id: store.id,
               phone_number: cleanPhone,
               message: smsMsg,
               status: logStatus,
               error_message: logError,
               cost: cost,
               units: units
             });

             if (logStatus === 'sent') {
               toast.success('SMS notification sent!');
             } else {
               console.error('SMS failed:', logError);
               toast.error('Failed to send SMS notification');
             }
          } else {
            // Only show error if phone number was entered but invalid
            // toast.error('Invalid phone number for SMS');
            console.warn('Skipping SMS: Invalid phone number format');
          }
        } catch (err) {
          console.error('Error sending SMS:', err);
          // Don't block the UI flow, but log the error
          toast.error('Error sending SMS notification');
        }
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
      <DialogContent className="w-[95vw] max-w-md max-h-[90vh] overflow-y-auto">
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
              placeholder="+250 788 123 456"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>

          <div className="space-y-2 pt-2 border-t">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="showSmsPreview" 
                checked={showSmsPreview} 
                onCheckedChange={(checked) => setShowSmsPreview(checked as boolean)} 
              />
              <Label htmlFor="showSmsPreview" className="flex items-center gap-2 cursor-pointer">
                <MessageSquare className="h-4 w-4" />
                Show SMS Preview
              </Label>
            </div>
            
            {showSmsPreview && (
              <div className="bg-muted p-3 rounded-md text-xs space-y-1">
                <div className="font-medium text-muted-foreground mb-1">SMS Preview:</div>
                <div className="font-mono whitespace-pre-wrap text-foreground bg-background p-2 rounded border border-input">{smsPreview}</div>
                <div className={`text-right ${smsLength > 160 ? 'text-red-500 font-bold' : 'text-muted-foreground'}`}>
                  {smsLength} chars ({smsUnits} SMS unit{smsUnits !== 1 ? 's' : ''})
                </div>
                {smsLength > 160 && (
                  <div className="text-red-500 font-medium">Warning: Message exceeds 160 characters.</div>
                )}
              </div>
            )}
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
