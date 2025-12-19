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
        .from('businesses' as any)
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
          custom_domain: data.customDomain || null,
        } as any)
        .select()
        .single() as any;

      if (businessError) throw businessError;

      // 3. Create user role (store_owner)
      const { error: roleError } = await supabase
        .from('user_roles' as any)
        .insert({
          user_id: authData.user.id,
          business_id: business?.id,
          role: 'store_owner',
        } as any);

      if (roleError) throw roleError;

      // 4. Create first shop/location
      if (data.shops && data.shops.length > 0) {
        const { data: shopsData, error: shopsError } = await supabase
          .from('shops' as any)
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
            })) as any
          )
          .select() as any;

        if (shopsError) throw shopsError;

        // 5. Create products if provided
        if (option === 'manual' && products[0].name) {
          const { error: productsError } = await supabase
            .from('products' as any)
            .insert(
              products
                .filter((p) => p.name)
                .map((product) => ({
                  name: product.name,
                  category: product.category,
                  price: product.price,
                  business_id: business?.id,
                  is_active: true,
                })) as any
            );

          if (productsError) throw productsError;

          // Create inventory for products
          if (shopsData && shopsData.length > 0) {
            const inventoryRecords = products
              .filter((p) => p.name)
              .map((product) => ({
                shop_id: shopsData[0].id,
                stock: product.stock,
              }));

            // We'll need to get product IDs first, then create inventory
            // For now, skip inventory creation
          }
        }
      }

      toast({
        title: 'Success!',
        description: 'Your business has been created successfully',
      });

      onComplete({ products: option === 'manual' ? products : [] });
    } catch (error: any) {
      console.error('Registration error:', error);
      toast({
        title: 'Registration Error',
        description: error.message || 'Failed to create business',
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

      <RadioGroup value={option} onValueChange={(val) => setOption(val as any)}>
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
