import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CartItem {
  product_id: string;
  name: string;
  price: number;
  quantity: number;
  subtotal: number;
}

interface OrderData {
  customer_id?: string;
  seller_id?: string;
  shop_id: string;
  items: CartItem[];
  total: number;
  payment_method: string;
  customer_phone?: string;
}

interface QueuedOrder {
  id: string;
  timestamp: number;
  orderData: OrderData;
}

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);

  // Defined before useEffect to be used in it
  const getQueuedOrders = useCallback((): QueuedOrder[] => {
    const stored = localStorage.getItem('pos_queued_orders');
    return stored ? JSON.parse(stored) : [];
  }, []);

  const syncQueuedOrders = useCallback(async () => {
    const queued = getQueuedOrders();
    if (queued.length === 0) return;

    setIsSyncing(true);
    const successful: string[] = [];
    
    for (const queuedOrder of queued) {
      try {
        // Generate order code
        const { data: codeData } = await supabase.rpc('generate_order_code');
        
        // Create order
        const { data: order, error: orderError } = await supabase
          .from('orders')
          .insert({
            customer_id: queuedOrder.orderData.customer_id,
            seller_id: queuedOrder.orderData.seller_id,
            shop_id_origin: queuedOrder.orderData.shop_id,
            shop_id_fulfill: queuedOrder.orderData.shop_id,
            total_amount: queuedOrder.orderData.total,
            payment_method: queuedOrder.orderData.payment_method,
            customer_phone: queuedOrder.orderData.customer_phone || undefined,
            status: 'confirmed',
            order_code: codeData || 'ORD-' + Date.now(),
          })
          .select()
          .single();

        if (orderError) throw orderError;

        // Create order items
        const items = queuedOrder.orderData.items.map((item) => ({
          order_id: order.id,
          product_id: item.product_id,
          quantity: item.quantity,
          price: item.price,
          subtotal: item.subtotal,
        }));

        const { error: itemsError } = await supabase
          .from('order_items')
          .insert(items);

        if (itemsError) throw itemsError;

        successful.push(queuedOrder.id);
        toast.success(`Order synced: ${order.order_code}`);
      } catch (error: unknown) {
        console.error('Failed to sync order:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        toast.error(`Failed to sync order: ${message}`);
      }
    }

    // Remove successfully synced orders
    const remaining = queued.filter(q => !successful.includes(q.id));
    localStorage.setItem('pos_queued_orders', JSON.stringify(remaining));
    
    setIsSyncing(false);
    
    if (successful.length > 0) {
      toast.success(`Successfully synced ${successful.length} order(s)`);
    }
  }, [getQueuedOrders]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('Connection restored - syncing data...');
      syncQueuedOrders();
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.warning('Working offline - orders will be synced when connection is restored');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncQueuedOrders]);

  const queueOrder = useCallback((orderData: OrderData) => {
    const queued = getQueuedOrders();
    const newOrder: QueuedOrder = {
      id: `offline-${Date.now()}`,
      timestamp: Date.now(),
      orderData,
    };
    queued.push(newOrder);
    localStorage.setItem('pos_queued_orders', JSON.stringify(queued));
    toast.info('Order queued for sync');
    return newOrder.id;
  }, [getQueuedOrders]);

  return {
    isOnline,
    isSyncing,
    queueOrder,
    syncQueuedOrders,
    getQueuedOrders,
  };
}

export function cacheProducts(products: Record<string, unknown>[]) {
  localStorage.setItem('pos_products_cache', JSON.stringify({
    timestamp: Date.now(),
    products,
  }));
}

export function getCachedProducts(): Record<string, unknown>[] | null {
  const cached = localStorage.getItem('pos_products_cache');
  if (!cached) return null;
  
  const { timestamp, products } = JSON.parse(cached);
  // Cache valid for 24 hours
  if (Date.now() - timestamp > 24 * 60 * 60 * 1000) {
    return null;
  }
  
  return products;
}

export function cacheShops(shops: Record<string, unknown>[]) {
  localStorage.setItem('pos_shops_cache', JSON.stringify({
    timestamp: Date.now(),
    shops,
  }));
}

export function getCachedShops(): Record<string, unknown>[] | null {
  const cached = localStorage.getItem('pos_shops_cache');
  if (!cached) return null;
  
  const { timestamp, shops } = JSON.parse(cached);
  if (Date.now() - timestamp > 24 * 60 * 60 * 1000) {
    return null;
  }
  
  return shops;
}

export function saveCart(cart: CartItem[]) {
  localStorage.setItem('pos_cart', JSON.stringify(cart));
}

export function loadCart(): CartItem[] {
  const stored = localStorage.getItem('pos_cart');
  return stored ? JSON.parse(stored) : [];
}

export function clearCart() {
  localStorage.removeItem('pos_cart');
}
