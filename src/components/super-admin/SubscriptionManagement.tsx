import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Store } from '@/contexts/StoreContext';
import { format } from 'date-fns';
import { CheckCircle2, AlertCircle, XCircle, PauseCircle, Edit } from 'lucide-react';
import { toast } from 'sonner';

interface SubscriptionManagementProps {
  stores: Store[];
  onUpdateStore: (store: Store) => void;
}

const PLANS = {
  trial: { name: 'Trial', price: 0, duration: 14 },
  monthly: { name: 'Monthly', price: 29.99, duration: 30 },
  quarterly: { name: 'Quarterly', price: 79.99, duration: 90 },
  annual: { name: 'Annual', price: 299.99, duration: 365 },
};

export function SubscriptionManagement({ stores, onUpdateStore }: SubscriptionManagementProps) {
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<Store>>({});

  const activeCount = stores.filter(s => s.status === 'active').length;
  const expiringCount = stores.filter(s => s.status === 'expiring_soon').length;
  const expiredCount = stores.filter(s => s.status === 'expired').length;
  
  // Calculate estimated MRR (Monthly Recurring Revenue)
  const mrr = stores.reduce((acc, store) => {
    if (store.status === 'active' || store.status === 'expiring_soon') {
        if (store.planType === 'monthly') return acc + PLANS.monthly.price;
        if (store.planType === 'quarterly') return acc + (PLANS.quarterly.price / 3);
        if (store.planType === 'annual') return acc + (PLANS.annual.price / 12);
    }
    return acc;
  }, 0);

  const handleEditClick = (store: Store) => {
    setSelectedStore(store);
    setFormData({
      planType: store.planType,
      status: store.status,
      subscriptionStartDate: store.subscriptionStartDate,
      subscriptionEndDate: store.subscriptionEndDate,
    });
    setEditDialogOpen(true);
  };

  const handleSave = () => {
    if (selectedStore && formData) {
      const updatedStore = { ...selectedStore, ...formData } as Store;
      onUpdateStore(updatedStore);
      setEditDialogOpen(false);
      toast.success('Subscription updated successfully');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500 hover:bg-green-600"><CheckCircle2 className="w-3 h-3 mr-1" /> Active</Badge>;
      case 'expiring_soon':
        return <Badge variant="secondary" className="bg-yellow-500 text-white hover:bg-yellow-600"><AlertCircle className="w-3 h-3 mr-1" /> Expiring</Badge>;
      case 'expired':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" /> Expired</Badge>;
      case 'suspended':
        return <Badge variant="outline"><PauseCircle className="w-3 h-3 mr-1" /> Suspended</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estimated MRR</CardTitle>
            <span className="text-2xl font-bold text-green-600">${mrr.toFixed(2)}</span>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">Monthly Recurring Revenue</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
            <span className="text-2xl font-bold">{activeCount}</span>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">Businesses with active plans</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
            <span className="text-2xl font-bold text-yellow-600">{expiringCount}</span>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">Expiring within 7 days</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expired/Churned</CardTitle>
            <span className="text-2xl font-bold text-red-600">{expiredCount}</span>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">Past due subscriptions</div>
          </CardContent>
        </Card>
      </div>

      {/* Subscription List */}
      <Card>
        <CardHeader>
          <CardTitle>Subscriptions</CardTitle>
          <CardDescription>Manage business subscriptions and billing cycles.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Business</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>End Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stores.map((store) => (
                <TableRow key={store.id}>
                  <TableCell className="font-medium">{store.name}</TableCell>
                  <TableCell className="capitalize">{store.planType}</TableCell>
                  <TableCell>{getStatusBadge(store.status)}</TableCell>
                  <TableCell>{format(new Date(store.subscriptionStartDate), 'MMM d, yyyy')}</TableCell>
                  <TableCell>{format(new Date(store.subscriptionEndDate), 'MMM d, yyyy')}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleEditClick(store)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Subscription</DialogTitle>
            <DialogDescription>
              Update subscription details for {selectedStore?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="plan" className="text-right">
                Plan
              </Label>
              <Select
                value={formData.planType}
                onValueChange={(value: any) => setFormData({ ...formData, planType: value })}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select a plan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="trial">Trial (Free)</SelectItem>
                  <SelectItem value="monthly">Monthly ($29.99)</SelectItem>
                  <SelectItem value="quarterly">Quarterly ($79.99)</SelectItem>
                  <SelectItem value="annual">Annual ($299.99)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="status" className="text-right">
                Status
              </Label>
              <Select
                value={formData.status}
                onValueChange={(value: any) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="expiring_soon">Expiring Soon</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="startDate" className="text-right">
                Start Date
              </Label>
              <Input
                id="startDate"
                type="date"
                className="col-span-3"
                value={formData.subscriptionStartDate ? new Date(formData.subscriptionStartDate).toISOString().split('T')[0] : ''}
                onChange={(e) => setFormData({ ...formData, subscriptionStartDate: new Date(e.target.value).toISOString() })}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="endDate" className="text-right">
                End Date
              </Label>
              <Input
                id="endDate"
                type="date"
                className="col-span-3"
                value={formData.subscriptionEndDate ? new Date(formData.subscriptionEndDate).toISOString().split('T')[0] : ''}
                onChange={(e) => setFormData({ ...formData, subscriptionEndDate: new Date(e.target.value).toISOString() })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
