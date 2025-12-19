import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RegistrationData } from '@/pages/Register';
import { ArrowLeft, Store } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface BrandingCustomizationStepProps {
  data: Partial<RegistrationData>;
  onNext: (data: Partial<RegistrationData>) => void;
  onBack: () => void;
}

export function BrandingCustomizationStep({ data, onNext, onBack }: BrandingCustomizationStepProps) {
  const [formData, setFormData] = useState({
    logoUrl: data.logoUrl || '',
    primaryColor: data.primaryColor || '#8B4513',
    secondaryColor: data.secondaryColor || '#F5DEB3',
    slogan: data.slogan || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onNext(formData);
  };

  const handleSkip = () => {
    onNext({});
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Customize Your Branding</h2>
        <p className="text-muted-foreground">Make your business stand out (optional)</p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="primaryColor">Primary Color</Label>
            <div className="flex gap-2">
              <Input
                id="primaryColor"
                type="color"
                value={formData.primaryColor}
                onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                className="w-20 h-10"
              />
              <Input
                value={formData.primaryColor}
                onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                placeholder="#8B4513"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="secondaryColor">Secondary Color</Label>
            <div className="flex gap-2">
              <Input
                id="secondaryColor"
                type="color"
                value={formData.secondaryColor}
                onChange={(e) => setFormData({ ...formData, secondaryColor: e.target.value })}
                className="w-20 h-10"
              />
              <Input
                value={formData.secondaryColor}
                onChange={(e) => setFormData({ ...formData, secondaryColor: e.target.value })}
                placeholder="#F5DEB3"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="slogan">Business Slogan</Label>
            <Input
              id="slogan"
              value={formData.slogan}
              onChange={(e) => setFormData({ ...formData, slogan: e.target.value })}
              placeholder="Quality products, exceptional service"
              maxLength={100}
            />
            <p className="text-xs text-muted-foreground">
              {formData.slogan.length}/100 characters
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <Button type="button" variant="ghost" onClick={handleSkip} className="flex-1">
              Skip for now
            </Button>
            <Button type="submit" className="flex-1">
              Continue
            </Button>
          </div>
        </form>

        <div>
          <Label className="mb-3 block">Preview</Label>
          <Card 
            className="p-6 border-2"
            style={{ 
              borderColor: formData.primaryColor,
              backgroundColor: `${formData.secondaryColor}20`
            }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div 
                className="h-12 w-12 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: formData.primaryColor }}
              >
                <Store className="h-6 w-6" style={{ color: formData.secondaryColor }} />
              </div>
              <div>
                <h3 className="font-bold text-lg">{data.businessName || 'Your Business'}</h3>
                {formData.slogan && (
                  <p className="text-sm text-muted-foreground">{formData.slogan}</p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Button 
                style={{ 
                  backgroundColor: formData.primaryColor,
                  color: formData.secondaryColor 
                }}
                className="w-full"
              >
                Sample Button
              </Button>
              <div 
                className="p-3 rounded"
                style={{ backgroundColor: formData.secondaryColor }}
              >
                <p className="text-sm">Sample content area</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
