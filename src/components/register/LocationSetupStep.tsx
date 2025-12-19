import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { RegistrationData } from '@/pages/Register';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface LocationSetupStepProps {
  data: Partial<RegistrationData>;
  onNext: (data: Partial<RegistrationData>) => void;
  onBack: () => void;
}

export function LocationSetupStep({ data, onNext, onBack }: LocationSetupStepProps) {
  const { toast } = useToast();
  const [locations, setLocations] = useState(
    data.shops || [
      {
        shopName: '',
        address: '',
        city: '',
        state: '',
        zipCode: '',
        phone: '',
      },
    ]
  );

  const addLocation = () => {
    setLocations([
      ...locations,
      {
        shopName: '',
        address: '',
        city: '',
        state: '',
        zipCode: '',
        phone: '',
      },
    ]);
  };

  const removeLocation = (index: number) => {
    if (locations.length > 1) {
      setLocations(locations.filter((_, i) => i !== index));
    }
  };

  const updateLocation = (index: number, field: string, value: string) => {
    const updated = [...locations];
    updated[index] = { ...updated[index], [field]: value };
    setLocations(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const firstLocation = locations[0];
    if (!firstLocation.shopName || !firstLocation.address || !firstLocation.city) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all required fields for at least one location',
        variant: 'destructive',
      });
      return;
    }

    onNext({ shops: locations });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Add Your First Location</h2>
        <p className="text-muted-foreground">Where will you operate from?</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {locations.map((location, index) => (
          <Card key={index} className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Location {index + 1}</h3>
              {locations.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeLocation(index)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              )}
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label>Shop Name *</Label>
                <Input
                  value={location.shopName}
                  onChange={(e) => updateLocation(index, 'shopName', e.target.value)}
                  placeholder="Main Store"
                  required={index === 0}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>Address *</Label>
                <Input
                  value={location.address}
                  onChange={(e) => updateLocation(index, 'address', e.target.value)}
                  placeholder="123 Main Street"
                  required={index === 0}
                />
              </div>

              <div className="space-y-2">
                <Label>City *</Label>
                <Input
                  value={location.city}
                  onChange={(e) => updateLocation(index, 'city', e.target.value)}
                  placeholder="New York"
                  required={index === 0}
                />
              </div>

              <div className="space-y-2">
                <Label>State *</Label>
                <Input
                  value={location.state}
                  onChange={(e) => updateLocation(index, 'state', e.target.value)}
                  placeholder="NY"
                  required={index === 0}
                />
              </div>

              <div className="space-y-2">
                <Label>ZIP Code *</Label>
                <Input
                  value={location.zipCode}
                  onChange={(e) => updateLocation(index, 'zipCode', e.target.value)}
                  placeholder="10001"
                  required={index === 0}
                />
              </div>

              <div className="space-y-2">
                <Label>Phone *</Label>
                <Input
                  value={location.phone}
                  onChange={(e) => updateLocation(index, 'phone', e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  required={index === 0}
                />
              </div>
            </div>
          </Card>
        ))}

        <Button type="button" variant="outline" onClick={addLocation} className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Add Another Location
        </Button>

        <div className="flex gap-3 pt-4">
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
