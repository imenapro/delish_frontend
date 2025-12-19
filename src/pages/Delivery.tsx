import { Layout } from '@/components/Layout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Truck, MapPin, Clock, CheckCircle2, Plus, DollarSign } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState } from 'react';

export default function Delivery() {
  const { user, roles } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isZoneDialogOpen, setIsZoneDialogOpen] = useState(false);
  const [newZone, setNewZone] = useState({
    zone_name: '',
    delivery_fee: '',
    estimated_time_minutes: '',
    shop_id: '',
  });

  const isManager = roles.some(r => r.role === 'admin' || r.role === 'super_admin' || r.role === 'branch_manager');

  const { data: tasks, isLoading } = useQuery({
    queryKey: ['delivery-tasks', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('delivery_tasks')
        .select(`
          *,
          order:orders(
            order_code,
            total_amount,
            customer:profiles!orders_customer_id_fkey(name, phone),
            shop_origin:shops!orders_shop_id_origin_fkey(name, address),
            shop_fulfill:shops!orders_shop_id_fulfill_fkey(name, address)
          )
        `)
        .eq('delivery_user_id', user?.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: shops } = useQuery({
    queryKey: ['shops'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shops')
        .select('*')
        .eq('is_active', true);
      if (error) throw error;
      return data;
    },
  });

  const { data: deliveryZones } = useQuery({
    queryKey: ['delivery-zones'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('delivery_zones')
        .select('*, shop:shops(name)')
        .order('zone_name');
      if (error) throw error;
      return data;
    },
  });

  const updateTaskStatusMutation = useMutation({
    mutationFn: async ({ taskId, status, time }: { taskId: string; status: string; time: string }) => {
      const update: any = { status };
      if (time === 'pickup') update.pickup_time = new Date().toISOString();
      if (time === 'delivered') update.delivered_time = new Date().toISOString();

      const { error } = await supabase
        .from('delivery_tasks')
        .update(update)
        .eq('id', taskId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-tasks'] });
      toast({ title: 'Status updated successfully' });
    },
  });

  const createZoneMutation = useMutation({
    mutationFn: async (zoneData: typeof newZone) => {
      const { error } = await supabase
        .from('delivery_zones')
        .insert([{
          zone_name: zoneData.zone_name,
          delivery_fee: parseFloat(zoneData.delivery_fee),
          estimated_time_minutes: parseInt(zoneData.estimated_time_minutes),
          shop_id: zoneData.shop_id,
        }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-zones'] });
      toast({ title: 'Delivery zone created successfully' });
      setIsZoneDialogOpen(false);
      setNewZone({ zone_name: '', delivery_fee: '', estimated_time_minutes: '', shop_id: '' });
    },
  });

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      assigned: 'bg-secondary text-secondary-foreground',
      picked_up: 'bg-primary text-primary-foreground',
      in_transit: 'bg-warning text-warning-foreground',
      delivered: 'bg-success text-success-foreground',
      failed: 'bg-destructive text-destructive-foreground',
    };
    return colors[status] || 'bg-secondary';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered':
        return <CheckCircle2 className="h-5 w-5" />;
      case 'in_transit':
        return <Truck className="h-5 w-5" />;
      default:
        return <MapPin className="h-5 w-5" />;
    }
  };

  return (
    <ProtectedRoute requiredRoles={['admin', 'delivery', 'manager', 'super_admin', 'branch_manager']}>
      <Layout>
        <div className="p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Truck className="h-8 w-8" />
              Delivery Dashboard
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage deliveries and zones
            </p>
          </div>

          <Tabs defaultValue="tasks" className="space-y-6">
            <TabsList>
              <TabsTrigger value="tasks">My Tasks</TabsTrigger>
              {isManager && <TabsTrigger value="zones">Delivery Zones</TabsTrigger>}
            </TabsList>

            <TabsContent value="tasks" className="space-y-4">

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : tasks && tasks.length > 0 ? (
            <div className="space-y-4">
              {tasks.map((task) => (
                <Card key={task.id} className="shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-medium)] transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <CardTitle className="text-xl font-mono">
                            {task.order?.order_code}
                          </CardTitle>
                          <Badge className={getStatusColor(task.status)}>
                            <span className="flex items-center gap-1">
                              {getStatusIcon(task.status)}
                              {task.status.replace('_', ' ')}
                            </span>
                          </Badge>
                        </div>
                        <CardDescription className="space-y-2 mt-3">
                          <div className="flex items-start gap-2">
                            <MapPin className="h-4 w-4 mt-0.5 text-primary" />
                            <div>
                              <p className="font-medium text-foreground">Pickup Location</p>
                              <p className="text-sm">{task.order?.shop_fulfill?.name}</p>
                              <p className="text-xs">{task.order?.shop_fulfill?.address}</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-2">
                            <MapPin className="h-4 w-4 mt-0.5 text-success" />
                            <div>
                              <p className="font-medium text-foreground">Customer</p>
                              <p className="text-sm">{task.order?.customer?.name}</p>
                              <p className="text-xs">{task.order?.customer?.phone}</p>
                            </div>
                          </div>
                        </CardDescription>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-primary">
                          ${Number(task.order?.total_amount).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {task.pickup_time && (
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Picked up:</span>
                          <span className="font-medium">
                            {format(new Date(task.pickup_time), 'MMM dd, HH:mm')}
                          </span>
                        </div>
                      )}
                      {task.delivered_time && (
                        <div className="flex items-center gap-2 text-sm">
                          <CheckCircle2 className="h-4 w-4 text-success" />
                          <span className="text-muted-foreground">Delivered:</span>
                          <span className="font-medium">
                            {format(new Date(task.delivered_time), 'MMM dd, HH:mm')}
                          </span>
                        </div>
                      )}
                      {task.notes && (
                        <div className="text-sm p-3 bg-muted rounded-lg">
                          <p className="font-medium mb-1">Notes:</p>
                          <p className="text-muted-foreground">{task.notes}</p>
                        </div>
                      )}
                      <div className="flex gap-2 pt-2">
                        {task.status === 'assigned' && (
                          <Button 
                            size="sm" 
                            className="flex-1"
                            onClick={() => updateTaskStatusMutation.mutate({ 
                              taskId: task.id, 
                              status: 'picked_up', 
                              time: 'pickup' 
                            })}
                            disabled={updateTaskStatusMutation.isPending}
                          >
                            Mark as Picked Up
                          </Button>
                        )}
                        {task.status === 'picked_up' && (
                          <Button 
                            size="sm" 
                            className="flex-1"
                            onClick={() => updateTaskStatusMutation.mutate({ 
                              taskId: task.id, 
                              status: 'in_transit', 
                              time: '' 
                            })}
                            disabled={updateTaskStatusMutation.isPending}
                          >
                            Start Delivery
                          </Button>
                        )}
                        {task.status === 'in_transit' && (
                          <Button 
                            size="sm" 
                            className="flex-1"
                            onClick={() => updateTaskStatusMutation.mutate({ 
                              taskId: task.id, 
                              status: 'delivered', 
                              time: 'delivered' 
                            })}
                            disabled={updateTaskStatusMutation.isPending}
                          >
                            Mark as Delivered
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="shadow-[var(--shadow-medium)]">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Truck className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">No delivery tasks assigned</p>
                <p className="text-sm text-muted-foreground">
                  Check back later for new assignments
                </p>
              </CardContent>
            </Card>
          )}
            </TabsContent>

            {isManager && (
              <TabsContent value="zones" className="space-y-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-semibold">Delivery Zones</h3>
                  <Dialog open={isZoneDialogOpen} onOpenChange={setIsZoneDialogOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Zone
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Create Delivery Zone</DialogTitle>
                        <DialogDescription>Add a new delivery zone with pricing</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Zone Name</Label>
                          <Input
                            placeholder="Downtown"
                            value={newZone.zone_name}
                            onChange={(e) => setNewZone({ ...newZone, zone_name: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Delivery Fee (RWF)</Label>
                          <Input
                            type="number"
                            placeholder="5000"
                            value={newZone.delivery_fee}
                            onChange={(e) => setNewZone({ ...newZone, delivery_fee: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Estimated Time (minutes)</Label>
                          <Input
                            type="number"
                            placeholder="30"
                            value={newZone.estimated_time_minutes}
                            onChange={(e) => setNewZone({ ...newZone, estimated_time_minutes: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Shop</Label>
                          <Select value={newZone.shop_id} onValueChange={(value) => setNewZone({ ...newZone, shop_id: value })}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select shop" />
                            </SelectTrigger>
                            <SelectContent>
                              {shops?.map((shop) => (
                                <SelectItem key={shop.id} value={shop.id}>
                                  {shop.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <Button
                          className="w-full"
                          onClick={() => createZoneMutation.mutate(newZone)}
                          disabled={createZoneMutation.isPending || !newZone.zone_name || !newZone.delivery_fee || !newZone.shop_id}
                        >
                          Create Zone
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {deliveryZones?.map((zone) => (
                    <Card key={zone.id}>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <MapPin className="h-5 w-5" />
                          {zone.zone_name}
                        </CardTitle>
                        <CardDescription>{zone.shop?.name}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Delivery Fee</span>
                            <Badge variant="outline" className="flex items-center gap-1">
                              <DollarSign className="h-3 w-3" />
                              {Number(zone.delivery_fee).toLocaleString()} RWF
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Est. Time</span>
                            <Badge variant="outline" className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {zone.estimated_time_minutes} min
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Status</span>
                            <Badge variant={zone.is_active ? 'default' : 'secondary'}>
                              {zone.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            )}
          </Tabs>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
