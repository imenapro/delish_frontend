import { useState, useEffect } from 'react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Store } from '@/contexts/StoreContext';
import { format } from 'date-fns';
import { CheckCircle2, AlertCircle, XCircle, PauseCircle, Edit, Plus, Trash2, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { SubscriptionPlan, BusinessSubscription } from '@/types/subscription';

interface SubscriptionManagementProps {
  stores: Store[];
  onUpdateStore: (store: Store) => void;
}

export function SubscriptionManagement({ stores, onUpdateStore }: SubscriptionManagementProps) {
  const [activeTab, setActiveTab] = useState('subscriptions');
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [subscriptions, setSubscriptions] = useState<BusinessSubscription[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch data
  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch plans
      const { data: plansData, error: plansError } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .is('deleted_at', null)
        .order('price');
      
      if (plansError) throw plansError;
      setPlans(plansData || []);

      // Fetch subscriptions
      // We join with businesses to get names, but since we have stores prop, we can map locally
      const { data: subsData, error: subsError } = await supabase
        .from('subscription_statuses')
        .select('*')
        .is('deleted_at', null);

      if (subsError) throw subsError;
      setSubscriptions(subsData || []);

    } catch (error: any) {
      console.error('Error fetching subscription data:', error);
      toast.error('Failed to load subscription data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
          <TabsTrigger value="plans">Plans</TabsTrigger>
        </TabsList>

        <TabsContent value="subscriptions" className="space-y-4">
          <SubscriptionsList 
            stores={stores} 
            subscriptions={subscriptions} 
            plans={plans}
            onUpdate={fetchData}
            onUpdateStore={onUpdateStore}
          />
        </TabsContent>

        <TabsContent value="plans" className="space-y-4">
          <PlansList 
            plans={plans} 
            onUpdate={fetchData} 
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// --- Subscriptions List Component ---

function SubscriptionsList({ 
  stores, 
  subscriptions, 
  plans, 
  onUpdate,
  onUpdateStore
}: { 
  stores: Store[], 
  subscriptions: BusinessSubscription[], 
  plans: SubscriptionPlan[], 
  onUpdate: () => void,
  onUpdateStore: (store: Store) => void
}) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [formData, setFormData] = useState({
    planId: '',
    status: '',
    startDate: '',
    endDate: ''
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Active':
      case 'active':
        return <Badge className="bg-green-500 hover:bg-green-600"><CheckCircle2 className="w-3 h-3 mr-1" /> Active</Badge>;
      case 'Bought':
        return <Badge className="bg-blue-600 hover:bg-blue-700"><ShieldCheck className="w-3 h-3 mr-1" /> Bought</Badge>;
      case 'expiring_soon':
        return <Badge variant="secondary" className="bg-yellow-500 text-white hover:bg-yellow-600"><AlertCircle className="w-3 h-3 mr-1" /> Expiring</Badge>;
      case 'Expired':
      case 'expired':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" /> Expired</Badge>;
      case 'Suspended':
      case 'suspended':
        return <Badge variant="outline"><PauseCircle className="w-3 h-3 mr-1" /> Suspended</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleEditClick = (store: Store) => {
    const sub = subscriptions.find(s => s.business_id === store.id);
    setSelectedStore(store);
    setFormData({
      planId: sub?.plan_id || '',
      status: sub?.status || store.status || 'Active',
      startDate: sub?.start_date ? new Date(sub.start_date).toISOString().split('T')[0] : (store.subscriptionStartDate ? new Date(store.subscriptionStartDate).toISOString().split('T')[0] : ''),
      endDate: sub?.end_date ? new Date(sub.end_date).toISOString().split('T')[0] : (store.subscriptionEndDate ? new Date(store.subscriptionEndDate).toISOString().split('T')[0] : ''),
    });
    setEditDialogOpen(true);
  };

  const handleSave = async () => {
    if (!selectedStore) return;

    try {
      // 1. Upsert subscription_statuses
      const { error: subError } = await supabase
        .from('subscription_statuses')
        .upsert({
          business_id: selectedStore.id,
          plan_id: formData.planId || null,
          status: formData.status,
          start_date: new Date(formData.startDate).toISOString(),
          end_date: formData.endDate ? new Date(formData.endDate).toISOString() : null,
          updated_at: new Date().toISOString()
        }, { onConflict: 'business_id' }); // Assuming one active sub per business logic for now

      if (subError) throw subError;

      // 2. Update businesses table for backward compatibility and Context
      // This ensures 'Bought' status propagates to the UI immediately
      const { error: busError } = await supabase
        .from('businesses')
        .update({
          status: formData.status, // Sync status
          plan_type: plans.find(p => p.id === formData.planId)?.name.toLowerCase() || 'custom',
          subscription_start_date: new Date(formData.startDate).toISOString(),
          subscription_end_date: formData.endDate ? new Date(formData.endDate).toISOString() : null
        })
        .eq('id', selectedStore.id);

      if (busError) throw busError;

      // 3. Update parent state
      onUpdateStore({
        ...selectedStore,
        status: formData.status as any,
        subscriptionStartDate: new Date(formData.startDate).toISOString(),
        subscriptionEndDate: formData.endDate ? new Date(formData.endDate).toISOString() : ''
      });

      toast.success('Subscription updated successfully');
      setEditDialogOpen(false);
      onUpdate();

    } catch (error: any) {
      console.error('Error saving subscription:', error);
      toast.error('Failed to update subscription: ' + error.message);
    }
  };

  // Combine store data with subscription data
  const combinedData = stores.map(store => {
    const sub = subscriptions.find(s => s.business_id === store.id);
    // Prefer subscription table data, fall back to store data
    return {
      ...store,
      currentStatus: sub?.status || store.status,
      currentPlanId: sub?.plan_id,
      currentStartDate: sub?.start_date || store.subscriptionStartDate,
      currentEndDate: sub?.end_date || store.subscriptionEndDate
    };
  });

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Business Subscriptions</CardTitle>
          <CardDescription>Manage subscriptions and statuses.</CardDescription>
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
              {combinedData.map((store) => (
                <TableRow key={store.id}>
                  <TableCell className="font-medium">{store.name}</TableCell>
                  <TableCell className="capitalize">
                    {plans.find(p => p.id === store.currentPlanId)?.name || store.planType}
                  </TableCell>
                  <TableCell>{getStatusBadge(store.currentStatus)}</TableCell>
                  <TableCell>{store.currentStartDate ? format(new Date(store.currentStartDate), 'MMM d, yyyy') : '-'}</TableCell>
                  <TableCell>{store.currentEndDate ? format(new Date(store.currentEndDate), 'MMM d, yyyy') : '-'}</TableCell>
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
              <Label htmlFor="plan" className="text-right">Plan</Label>
              <Select
                value={formData.planId}
                onValueChange={(value) => setFormData({ ...formData, planId: value })}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select a plan" />
                </SelectTrigger>
                <SelectContent>
                  {plans.map(plan => (
                    <SelectItem key={plan.id} value={plan.id}>{plan.name} (${plan.price})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="status" className="text-right">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Bought">Bought (Lifetime)</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Expired">Expired</SelectItem>
                  <SelectItem value="Suspended">Suspended</SelectItem>
                  <SelectItem value="Cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="startDate" className="text-right">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                className="col-span-3"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="endDate" className="text-right">End Date</Label>
              <Input
                id="endDate"
                type="date"
                className="col-span-3"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// --- Plans List Component ---

function PlansList({ plans, onUpdate }: { plans: SubscriptionPlan[], onUpdate: () => void }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    price: 0,
    duration_days: 30,
    description: '',
    features: ''
  });

  const handleCreate = () => {
    setEditingPlan(null);
    setFormData({ name: '', price: 0, duration_days: 30, description: '', features: '' });
    setDialogOpen(true);
  };

  const handleEdit = (plan: SubscriptionPlan) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name,
      price: plan.price,
      duration_days: plan.duration_days,
      description: plan.description || '',
      features: Array.isArray(plan.features) ? plan.features.join('\n') : ''
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this plan?')) return;
    try {
      const { error } = await supabase
        .from('subscription_plans')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      
      if (error) throw error;
      toast.success('Plan deleted successfully');
      onUpdate();
    } catch (error: any) {
      toast.error('Failed to delete plan: ' + error.message);
    }
  };

  const handleSave = async () => {
    try {
      const featuresArray = formData.features.split('\n').filter(f => f.trim() !== '');
      const payload = {
        name: formData.name,
        price: formData.price,
        duration_days: formData.duration_days,
        description: formData.description,
        features: featuresArray, // Supabase handles array to jsonb mapping usually
        is_active: true
      };

      if (editingPlan) {
        const { error } = await supabase
          .from('subscription_plans')
          .update(payload)
          .eq('id', editingPlan.id);
        if (error) throw error;
        toast.success('Plan updated');
      } else {
        const { error } = await supabase
          .from('subscription_plans')
          .insert(payload);
        if (error) throw error;
        toast.success('Plan created');
      }
      setDialogOpen(false);
      onUpdate();
    } catch (error: any) {
      console.error(error);
      toast.error('Failed to save plan: ' + error.message);
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Subscription Plans</CardTitle>
            <CardDescription>Create and manage available subscription plans.</CardDescription>
          </div>
          <Button onClick={handleCreate}><Plus className="w-4 h-4 mr-2" /> Create Plan</Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Duration (Days)</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plans.map((plan) => (
                <TableRow key={plan.id}>
                  <TableCell className="font-medium">{plan.name}</TableCell>
                  <TableCell>${plan.price}</TableCell>
                  <TableCell>{plan.duration_days}</TableCell>
                  <TableCell>{plan.description}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(plan)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700" onClick={() => handleDelete(plan.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingPlan ? 'Edit Plan' : 'Create Plan'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="planName" className="text-right">Name</Label>
              <Input id="planName" className="col-span-3" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="planPrice" className="text-right">Price</Label>
              <Input id="planPrice" type="number" className="col-span-3" value={formData.price} onChange={e => setFormData({...formData, price: Number(e.target.value)})} />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="planDuration" className="text-right">Duration (Days)</Label>
              <Input id="planDuration" type="number" className="col-span-3" value={formData.duration_days} onChange={e => setFormData({...formData, duration_days: Number(e.target.value)})} />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="planDesc" className="text-right">Description</Label>
              <Input id="planDesc" className="col-span-3" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="planFeatures" className="text-right">Features</Label>
              <textarea 
                id="planFeatures" 
                className="col-span-3 flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="One feature per line"
                value={formData.features}
                onChange={e => setFormData({...formData, features: e.target.value})}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
