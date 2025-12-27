import { TenantAwareLayout } from '@/components/TenantAwareLayout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useParams } from 'react-router-dom';
import { useStoreContext } from '@/contexts/StoreContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

export default function Orders() {
  const { storeSlug } = useParams<{ storeSlug?: string }>();
  const { store } = useStoreContext();

  const { data: orders, isLoading } = useQuery({
    queryKey: ['orders', store?.id],
    queryFn: async () => {
      const query = supabase
        .from('orders')
        .select(`
          *,
          customer:profiles!orders_customer_id_fkey(name),
          shop_origin:shops!orders_shop_id_origin_fkey(name)
        `);
      
      // Note: Store filtering will be implemented after database migration
      // when store_id is added to shops table
      
      const { data, error } = await query
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data;
    },
    enabled: !storeSlug || !!store,
  });

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-warning text-warning-foreground',
      confirmed: 'bg-primary text-primary-foreground',
      preparing: 'bg-accent text-accent-foreground',
      ready: 'bg-success text-success-foreground',
      out_for_delivery: 'bg-primary text-primary-foreground',
      delivered: 'bg-success text-success-foreground',
      cancelled: 'bg-destructive text-destructive-foreground',
    };
    return colors[status] || 'bg-secondary';
  };

  return (
    <ProtectedRoute>
      <TenantAwareLayout>
        <div className="p-8">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Orders</h1>
              <p className="text-muted-foreground mt-1">
                View and manage customer orders
              </p>
            </div>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Order
            </Button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : orders && orders.length > 0 ? (
            <div className="space-y-4">
              {orders.map((order) => (
                <Card key={order.id} className="shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-medium)] transition-shadow">
                  <CardContent className="flex items-center justify-between p-6">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-semibold text-lg">
                          {order.order_code}
                        </span>
                        <Badge className={getStatusColor(order.status)}>
                          {order.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Customer: {order.customer?.name || 'Unknown'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Origin: {order.shop_origin?.name || 'Unknown'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-primary">
                        ${Number(order.total_amount).toFixed(2)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(order.created_at), 'MMM dd, yyyy HH:mm')}
                      </p>
                      <Button variant="outline" size="sm" className="mt-2">
                        View Details
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="shadow-[var(--shadow-medium)]">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <p className="text-muted-foreground mb-4">No orders found</p>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Your First Order
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </TenantAwareLayout>
    </ProtectedRoute>
  );
}
