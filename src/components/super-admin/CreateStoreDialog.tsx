import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Store } from '@/contexts/StoreContext';
import { toast } from 'sonner';

interface CreateStoreDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (store: Omit<Store, 'id'>) => void;
}

export function CreateStoreDialog({ open, onOpenChange, onSubmit }: CreateStoreDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    ownerEmail: '',
    planType: 'trial' as 'trial' | 'monthly' | 'quarterly' | 'annual',
    slogan: '',
    logoUrl: '',
    bgImageUrl: '',
    primaryColor: '#8B4513',
    secondaryColor: '#D2691E',
    locale: 'en' as 'pt' | 'en' | 'fr',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.slug || !formData.ownerEmail) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Calculate subscription dates based on plan
    const daysMap = {
      trial: 14,
      monthly: 30,
      quarterly: 90,
      annual: 365,
    };

    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + daysMap[formData.planType]);

    const newStore: Omit<Store, 'id'> = {
      ...formData,
      subscriptionStartDate: startDate.toISOString(),
      subscriptionEndDate: endDate.toISOString(),
      status: 'active',
    };

    onSubmit(newStore);
    toast.success('Store created successfully!');

    // Reset form
    setFormData({
      name: '',
      slug: '',
      ownerEmail: '',
      planType: 'trial',
      slogan: '',
      logoUrl: '',
      bgImageUrl: '',
      primaryColor: '#8B4513',
      secondaryColor: '#D2691E',
      locale: 'en',
    });
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Store</DialogTitle>
          <DialogDescription>
            Add a new store to the platform. Fill in the details below.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Store Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => {
                  const name = e.target.value;
                  setFormData({
                    ...formData,
                    name,
                    slug: generateSlug(name),
                  });
                }}
                placeholder="Bakery Heaven"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">URL Slug *</Label>
              <Input
                id="slug"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                placeholder="bakery-heaven"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ownerEmail">Owner Email *</Label>
            <Input
              id="ownerEmail"
              type="email"
              value={formData.ownerEmail}
              onChange={(e) => setFormData({ ...formData, ownerEmail: e.target.value })}
              placeholder="owner@bakery.com"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="slogan">Slogan</Label>
            <Input
              id="slogan"
              value={formData.slogan}
              onChange={(e) => setFormData({ ...formData, slogan: e.target.value })}
              placeholder="Fresh baked goods daily"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="planType">Subscription Plan *</Label>
              <Select
                value={formData.planType}
                onValueChange={(value: any) => setFormData({ ...formData, planType: value })}
              >
                <SelectTrigger id="planType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="trial">Trial (14 days)</SelectItem>
                  <SelectItem value="monthly">Monthly ($29.99)</SelectItem>
                  <SelectItem value="quarterly">Quarterly ($79.99)</SelectItem>
                  <SelectItem value="annual">Annual ($299.99)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="locale">Language</Label>
              <Select
                value={formData.locale}
                onValueChange={(value: any) => setFormData({ ...formData, locale: value })}
              >
                <SelectTrigger id="locale">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="pt">Português</SelectItem>
                  <SelectItem value="fr">Français</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="logoUrl">Logo URL</Label>
            <Input
              id="logoUrl"
              value={formData.logoUrl}
              onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
              placeholder="https://example.com/logo.png"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bgImageUrl">Background Image URL</Label>
            <Input
              id="bgImageUrl"
              value={formData.bgImageUrl}
              onChange={(e) => setFormData({ ...formData, bgImageUrl: e.target.value })}
              placeholder="https://example.com/background.jpg"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="primaryColor">Primary Color</Label>
              <div className="flex gap-2">
                <Input
                  id="primaryColor"
                  type="color"
                  value={formData.primaryColor}
                  onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                  className="h-10 w-20"
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
                  className="h-10 w-20"
                />
                <Input
                  value={formData.secondaryColor}
                  onChange={(e) => setFormData({ ...formData, secondaryColor: e.target.value })}
                  placeholder="#D2691E"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Create Store</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
