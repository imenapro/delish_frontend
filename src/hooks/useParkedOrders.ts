import { useState, useEffect } from 'react';
import { CartItem } from '@/components/pos/POSCart';
import { toast } from 'sonner';

export interface ParkedOrder {
  id: string;
  code: string;
  timestamp: number;
  items: CartItem[];
  note?: string;
  total: number;
}

export function useParkedOrders(shopId?: string) {
  const [parkedOrders, setParkedOrders] = useState<ParkedOrder[]>([]);
  
  const storageKey = shopId ? `pos_parked_orders_${shopId}` : 'pos_parked_orders';

  useEffect(() => {
    // Load from local storage on mount
    const loadOrders = () => {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          const parsed: ParkedOrder[] = JSON.parse(saved);
          
          // Filter out expired orders (older than 2 hours)
          const now = Date.now();
          const twoHours = 2 * 60 * 60 * 1000;
          const active = parsed.filter(order => (now - order.timestamp) < twoHours);
          
          // If we filtered out any orders, update storage
          if (active.length !== parsed.length) {
              localStorage.setItem(storageKey, JSON.stringify(active));
          }
          
          setParkedOrders(active);
        } catch (e) {
          console.error('Failed to parse parked orders', e);
        }
      }
    };

    loadOrders();

    // Check for expired orders every minute
    const interval = setInterval(() => {
        setParkedOrders(currentOrders => {
            const now = Date.now();
            const twoHours = 2 * 60 * 60 * 1000;
            const active = currentOrders.filter(order => (now - order.timestamp) < twoHours);
            
            if (active.length !== currentOrders.length) {
                localStorage.setItem(storageKey, JSON.stringify(active));
                return active;
            }
            return currentOrders;
        });
    }, 60000);

    return () => clearInterval(interval);
  }, [storageKey]);

  const saveToStorage = (orders: ParkedOrder[]) => {
    localStorage.setItem(storageKey, JSON.stringify(orders));
    setParkedOrders(orders);
  };

  const generateCode = (): string => {
    return Math.floor(1000 + Math.random() * 9000).toString();
  };

  const parkOrder = (items: CartItem[], note?: string) => {
    if (items.length === 0) return null;

    const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const code = generateCode();
    
    const newOrder: ParkedOrder = {
      id: crypto.randomUUID(),
      code,
      timestamp: Date.now(),
      items,
      note,
      total,
    };

    const updatedOrders = [newOrder, ...parkedOrders];
    saveToStorage(updatedOrders);
    toast.success(`Order parked successfully. Code: ${code}`);
    return code;
  };

  const removeOrder = (id: string) => {
    const updatedOrders = parkedOrders.filter(o => o.id !== id);
    saveToStorage(updatedOrders);
    toast.success('Parked order removed');
  };

  const retrieveOrder = (id: string) => {
    const order = parkedOrders.find(o => o.id === id);
    if (order) {
      removeOrder(id);
      return order;
    }
    return null;
  };

  return {
    parkedOrders,
    parkOrder,
    removeOrder,
    retrieveOrder
  };
}
