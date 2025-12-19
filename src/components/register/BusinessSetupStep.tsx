import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { RegistrationData } from '@/pages/Register';
import { ArrowLeft } from 'lucide-react';

interface BusinessSetupStepProps {
  data: Partial<RegistrationData>;
  onNext: (data: Partial<RegistrationData>) => void;
  onBack: () => void;
}

const businessTypes = [
  'Grocery Store',
  'Restaurant',
  'Smoke Shop',
  'Butcher Shop',
  'Printing House',
  'Electronics Store',
  'Home Décor',
  'Liquor Store',
  'Pharmacy',
  'Other',
];

export function BusinessSetupStep({ data, onNext, onBack }: BusinessSetupStepProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    businessName: data.businessName || '',
    businessType: data.businessType || '',
    businessSlug: data.businessSlug || '',
    customDomain: data.customDomain || '',
    country: data.country || 'United States',
    timezone: data.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
  });

  useEffect(() => {
    if (formData.businessName && !data.businessSlug) {
      const slug = formData.businessName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      setFormData(prev => ({ ...prev, businessSlug: slug }));
    }
  }, [formData.businessName, data.businessSlug]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.businessName || !formData.businessType) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    onNext(formData);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Set Up Your Business</h2>
        <p className="text-muted-foreground">Tell us about your business</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="businessName">Business Name *</Label>
          <Input
            id="businessName"
            value={formData.businessName}
            onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
            placeholder="Mike's Grocery Store"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="businessType">Business Type *</Label>
          <Select
            value={formData.businessType}
            onValueChange={(value) => setFormData({ ...formData, businessType: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select business type" />
            </SelectTrigger>
            <SelectContent>
              {businessTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="customDomain">Custom Domain (Optional)</Label>
          <Input
            id="customDomain"
            value={formData.customDomain}
            onChange={(e) => setFormData({ ...formData, customDomain: e.target.value })}
            placeholder="e.g. delish.rw"
          />
          <p className="text-xs text-muted-foreground">
            If you have your own domain, enter it here. You'll need to configure your DNS settings.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="businessSlug">Business URL *</Label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">kazimas.com/</span>
            <Input
              id="businessSlug"
              value={formData.businessSlug}
              onChange={(e) => setFormData({ ...formData, businessSlug: e.target.value.toLowerCase() })}
              placeholder="mikes-grocery"
              required
            />
          </div>
          <p className="text-xs text-muted-foreground">
            This will be your unique business URL
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="country">Country *</Label>
          <Input
            id="country"
            value={formData.country}
            onChange={(e) => setFormData({ ...formData, country: e.target.value })}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="timezone">Timezone</Label>
          <Input
            id="timezone"
            value={formData.timezone}
            onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
            disabled
          />
        </div>

        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Button type="submit" className="flex-1">
            Continue
          </Button>
        </div>
      </form>
    </div>
  );
}
