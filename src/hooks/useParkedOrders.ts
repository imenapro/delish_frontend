import { useState, useEffect } from 'react';
import { CartItem } from '@/components/pos/POSCart';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export interface ParkedOrder {
  id: string;
  code: string;
  timestamp: number;
  items: CartItem[];
  note?: string;
  total: number;
  sellerId?: string;
  sellerName?: string;
}

export function useParkedOrders(shopId?: string, currentUserId?: string, currentUserName?: string) {
  const [parkedOrders, setParkedOrders] = useState<ParkedOrder[]>([]);

  useEffect(() => {
    if (!shopId) return;

    const fetchOrders = async () => {
      const { data, error } = await supabase
        .from('parked_orders')
        .select('*, seller:seller_id(name)')
        .eq('shop_id', shopId)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching parked orders:', error);
        return;
      }

      if (data) {
        const mappedOrders: ParkedOrder[] = data.map((order: any) => ({
          id: order.id,
          code: order.code,
          timestamp: new Date(order.created_at).getTime(),
          items: order.items as CartItem[],
          note: order.note,
          total: order.total,
          sellerId: order.seller_id,
          sellerName: order.seller?.name || 'Unknown',
        }));
        setParkedOrders(mappedOrders);
      }
    };

    fetchOrders();

    const channel = supabase
      .channel('parked_orders_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'parked_orders',
          filter: `shop_id=eq.${shopId}`
        },
        () => {
           fetchOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [shopId]);

  const parkOrder = async (items: CartItem[], note?: string) => {
    if (items.length === 0 || !shopId) return null;

    try {
      const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const code = Math.floor(1000 + Math.random() * 9000).toString();
      
      const { error } = await supabase
        .from('parked_orders')
        .insert({
          shop_id: shopId,
          seller_id: currentUserId,
          code,
          items,
          note,
          total,
          status: 'active'
        });

      if (error) throw error;

      toast.success('Order parked successfully');
      return code;
    } catch (error) {
      console.error('Failed to park order:', error);
      toast.error('Failed to park order');
      return null;
    }
  };

  const removeOrder = async (id: string) => {
    try {
      const { error } = await supabase
        .from('parked_orders')
        .update({ 
            status: 'resumed',
            resumed_by: currentUserId,
            resumed_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;
      
      // Optimistic update? No, let the subscription handle it.
    } catch (error) {
      console.error('Failed to remove order:', error);
      toast.error('Failed to remove order');
    }
  };

  const transferOrder = async (orderId: string, newSellerId: string) => {
    try {
      const { error } = await supabase
        .from('parked_orders')
        .update({ seller_id: newSellerId })
        .eq('id', orderId);

      if (error) throw error;
      toast.success('Order transferred successfully');
    } catch (error) {
      console.error('Failed to transfer order:', error);
      toast.error('Failed to transfer order');
    }
  };

  const retrieveOrder = (id: string) => {
    return parkedOrders.find(o => o.id === id) || null;
  };

  return {
    parkedOrders,
    parkOrder,
    removeOrder,
    transferOrder,
    retrieveOrder
  };
}
