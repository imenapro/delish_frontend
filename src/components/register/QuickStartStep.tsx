import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { RegistrationData } from '@/pages/Register';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';

interface QuickStartStepProps {
  data: Partial<RegistrationData>;
  onComplete: (data: Partial<RegistrationData>) => void;
  onBack: () => void;
}

export function QuickStartStep({ data, onComplete, onBack }: QuickStartStepProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [option, setOption] = useState<'skip' | 'import' | 'manual'>('skip');
  const [products, setProducts] = useState([
    { name: '', category: '', price: 0, stock: 0 },
  ]);

  const addProduct = () => {
    setProducts([...products, { name: '', category: '', price: 0, stock: 0 }]);
  };

  const removeProduct = (index: number) => {
    if (products.length > 1) {
      setProducts(products.filter((_, i) => i !== index));
    }
  };

  const updateProduct = (index: number, field: string, value: string | number) => {
    const updated = [...products];
    updated[index] = { ...updated[index], [field]: value };
    setProducts(updated);
  };

  const handleComplete = async () => {
    setLoading(true);
    try {
      // 1. Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email!,
        password: data.password!,
        options: {
          emailRedirectTo: `${window.location.origin}/${data.businessSlug}/dashboard`,
          data: {
            full_name: data.fullName,
            phone: data.phone,
          },
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Failed to create user');

      // 2. Create business record
      const trialEndDate = new Date();
      trialEndDate.setDate(trialEndDate.getDate() + 14);

      const { data: business, error: businessError } = await supabase
        .from('businesses')
        .insert({
          name: data.businessName!,
          slug: data.businessSlug!,
          business_type: data.businessType,
          logo_url: data.logoUrl,
          primary_color: data.primaryColor || '#3B82F6',
          secondary_color: data.secondaryColor || '#10B981',
          slogan: data.slogan,
          plan_type: 'trial',
          trial_start_date: new Date().toISOString(),
          trial_end_date: trialEndDate.toISOString(),
          status: 'trial',
          owner_id: authData.user.id,
          country: data.country,
          timezone: data.timezone || 'UTC',
        })
        .select()
        .single();

      if (businessError) throw businessError;

      // 3. Create user role (store_owner)
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: authData.user.id,
          business_id: business?.id,
          role: 'store_owner',
        });

      if (roleError) throw roleError;

      // 4. Create first shop/location
      if (data.shops && data.shops.length > 0) {
        const { data: shopsData, error: shopsError } = await supabase
          .from('shops')
          .insert(
            data.shops.map((shop) => ({
              name: shop.shopName,
              address: `${shop.address}, ${shop.city}, ${shop.state} ${shop.zipCode}`,
              phone: shop.phone,
              business_id: business?.id,
              slug: data.businessSlug,
              is_active: true,
              owner_id: authData.user.id,
              primary_color: data.primaryColor || '#3B82F6',
              secondary_color: data.secondaryColor || '#10B981',
            }))
          )
          .select();

        if (shopsError) throw shopsError;

        // 5. Create products if provided
        if (option === 'manual' && products[0].name) {
          const { error: productsError } = await supabase
            .from('products')
            .insert(
              products
                .filter((p) => p.name)
                .map((product) => ({
                  name: product.name,
                  category: product.category,
                  price: product.price,
                  business_id: business?.id,
                  is_active: true,
                }))
            );

          if (productsError) throw productsError;

          // Create inventory for products
          if (shopsData && shopsData.length > 0) {
            // Inventory creation logic would go here
          }
        }
      }

      // 6. Send Notifications (Email & SMS)
      try {
        const loginUrl = `${window.location.origin}/${data.businessSlug}/login`;

        // Send Email
        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
            <h1 style="color: #2563eb;">Welcome to Kazimas!</h1>
            <p>Hello ${data.fullName},</p>
            <p>Congratulations! Your business <strong>${data.businessName}</strong> has been successfully registered.</p>
            
            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e5e7eb;">
              <h3 style="margin-top: 0; color: #1f2937;">Your Account Details</h3>
              <p style="margin: 5px 0;"><strong>Business Name:</strong> ${data.businessName}</p>
              <p style="margin: 5px 0;"><strong>Email:</strong> ${data.email}</p>
              <p style="margin: 5px 0;"><strong>Password:</strong> <code style="background: #fff; padding: 2px 6px; border-radius: 4px; border: 1px solid #d1d5db;">${data.password}</code></p>
              <p style="margin: 5px 0;"><strong>Plan:</strong> 14-Day Free Trial</p>
            </div>

            <p><strong>Get Started:</strong></p>
            <ol style="line-height: 1.6;">
              <li>Go to your dashboard: <a href="${window.location.origin}/${data.businessSlug}/dashboard" style="color: #2563eb; text-decoration: none;">${window.location.origin}/${data.businessSlug}/dashboard</a></li>
              <li>Set up your products and inventory.</li>
              <li>Invite your team members.</li>
            </ol>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
            <p style="font-size: 12px; color: #6b7280; text-align: center;">
              This is an automated message from Kazimas.
            </p>
          </div>
        `;

        await supabase.functions.invoke('send-email', {
          body: {
            to: data.email,
            subject: `Welcome to Kazimas - Your Business is Ready!`,
            html: emailHtml,
          },
        });

        // Send SMS
        if (data.phone) {
          let cleanPhone = data.phone.replace(/\D/g, '');
          // Auto-format for Rwanda
          if (cleanPhone.startsWith('07') && cleanPhone.length === 10) {
            cleanPhone = '250' + cleanPhone.substring(1);
          } else if (cleanPhone.startsWith('7') && cleanPhone.length === 9) {
            cleanPhone = '250' + cleanPhone;
          }

          if (cleanPhone.length >= 10) {
            const smsMsg = `Welcome to ${data.businessName}!
Credentials:
Email: ${data.email}
Pwd: ${data.password}
Login: ${loginUrl}`;

            // Check length and warn if too long (but still send)
            if (smsMsg.length > 160) {
              console.warn('SMS exceeds 160 chars');
            }

            const { data: smsData, error: smsError } = await supabase.functions.invoke('send-sms', {
              body: {
                phoneNumber: cleanPhone,
                message: smsMsg,
              },
            });

            // Log SMS
            const COST_PER_UNIT = 15;
            const length = smsMsg.length;
            const units = Math.ceil(length / 160) || 1;
            const cost = units * COST_PER_UNIT;
            
            const logStatus = (!smsError && smsData?.success) ? 'sent' : 'failed';
            const logError = smsError?.message || smsData?.error || (smsData?.success ? null : 'Unknown error');

            await supabase.from('sms_logs').insert({
              business_id: business?.id,
              phone_number: cleanPhone,
              message: smsMsg,
              status: logStatus,
              error_message: logError,
              cost: cost,
              units: units
            });
          }
        }
      } catch (notifyError) {
        console.error('Notification error:', notifyError);
        // Don't block completion if notifications fail
      }

      toast({
        title: 'Success!',
        description: 'Your business has been created successfully',
      });

      onComplete({ products: option === 'manual' ? products : [] });
    } catch (error: unknown) {
      console.error('Registration error:', error);
      const message = error instanceof Error ? error.message : 'Failed to create business';
      toast({
        title: 'Registration Error',
        description: message,
        variant: 'destructive',
      });
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Quick Start Options</h2>
        <p className="text-muted-foreground">How would you like to add products?</p>
      </div>

      <RadioGroup value={option} onValueChange={(val) => setOption(val as 'skip' | 'import' | 'manual')}>
        <Card className="p-4">
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="skip" id="skip" />
            <Label htmlFor="skip" className="flex-1 cursor-pointer">
              <div className="font-medium">I'll add products later</div>
              <p className="text-sm text-muted-foreground">Skip to dashboard and set up products when ready</p>
            </Label>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="import" id="import" />
            <Label htmlFor="import" className="flex-1 cursor-pointer">
              <div className="font-medium">Import from CSV</div>
              <p className="text-sm text-muted-foreground">Upload a CSV file with your products (coming soon)</p>
            </Label>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="manual" id="manual" />
            <Label htmlFor="manual" className="flex-1 cursor-pointer">
              <div className="font-medium">Add products manually</div>
              <p className="text-sm text-muted-foreground">Enter products one by one</p>
            </Label>
          </div>
        </Card>
      </RadioGroup>

      {option === 'manual' && (
        <div className="space-y-4">
          {products.map((product, index) => (
            <Card key={index} className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-medium">Product {index + 1}</h4>
                {products.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeProduct(index)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2">
                  <Label>Product Name</Label>
                  <Input
                    value={product.name}
                    onChange={(e) => updateProduct(index, 'name', e.target.value)}
                    placeholder="Product name"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Category</Label>
                  <Input
                    value={product.category}
                    onChange={(e) => updateProduct(index, 'category', e.target.value)}
                    placeholder="Category"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Price</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={product.price}
                    onChange={(e) => updateProduct(index, 'price', parseFloat(e.target.value))}
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Initial Stock</Label>
                  <Input
                    type="number"
                    value={product.stock}
                    onChange={(e) => updateProduct(index, 'stock', parseInt(e.target.value))}
                    placeholder="0"
                  />
                </div>
              </div>
            </Card>
          ))}

          <Button type="button" variant="outline" onClick={addProduct} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Add Another Product
          </Button>
        </div>
      )}

      <div className="flex gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onBack} disabled={loading}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Button onClick={handleComplete} className="flex-1" disabled={loading}>
          {loading ? 'Creating your business...' : 'Complete Setup'}
        </Button>
      </div>
    </div>
  );
}
