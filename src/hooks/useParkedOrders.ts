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
  sellerId?: string; // ID of the seller who parked the order
  sellerName?: string; // Name of the seller
}

export function useParkedOrders(shopId?: string, currentUserId?: string, currentUserName?: string) {
  const [parkedOrders, setParkedOrders] = useState<ParkedOrder[]>([]);
  
  const storageKey = shopId ? `pos_parked_orders_${shopId}` : 'pos_parked_orders';

  useEffect(() => {
    // Load from local storage on mount
    const loadOrders = () => {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          
          if (Array.isArray(parsed)) {
            // Filter out expired orders (older than 2 hours)
            const now = Date.now();
            const twoHours = 2 * 60 * 60 * 1000;
            const active = parsed.filter(order => (now - order.timestamp) < twoHours);
            
            // If we filtered out any orders, update storage
            if (active.length !== parsed.length) {
                localStorage.setItem(storageKey, JSON.stringify(active));
            }
            
            setParkedOrders(active);
          } else {
            // Invalid data structure, reset
            setParkedOrders([]);
            localStorage.removeItem(storageKey);
          }
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
    try {
      localStorage.setItem(storageKey, JSON.stringify(orders));
      setParkedOrders(orders);
    } catch (error) {
      console.error('Failed to save to storage:', error);
      toast.error('Failed to save order to local storage (Storage might be full)');
      // Update state anyway so it works in current session
      setParkedOrders(orders);
    }
  };

  const generateCode = (): string => {
    return Math.floor(1000 + Math.random() * 9000).toString();
  };

  const parkOrder = (items: CartItem[], note?: string) => {
    if (items.length === 0) return null;

    try {
      const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const code = generateCode();
      
      const newOrder: ParkedOrder = {
        id: Math.random().toString(36).substring(2) + Date.now().toString(36),
        code,
        timestamp: Date.now(),
        items,
        note,
        total,
        sellerId: currentUserId,
        sellerName: currentUserName || 'Unknown Seller',
      };

      const updatedOrders = [newOrder, ...parkedOrders];
      saveToStorage(updatedOrders);
      toast.success(`Order parked successfully. Code: ${code}`);
      return code;
    } catch (error) {
      console.error('Failed to park order:', error);
      toast.error('An error occurred while parking the order');
      return null;
    }
  };

  const removeOrder = (id: string) => {
    const updatedOrders = parkedOrders.filter(o => o.id !== id);
    saveToStorage(updatedOrders);
    toast.success('Parked order removed');
  };

  const retrieveOrder = (id: string, keepInStorage: boolean = false) => {
    const order = parkedOrders.find(o => o.id === id);
    if (order) {
      if (!keepInStorage) {
        removeOrder(id);
      }
      return order;
    }
    return null;
  };

  const transferOrder = (orderId: string, targetSellerId: string, targetSellerName: string) => {
    const orderIndex = parkedOrders.findIndex(o => o.id === orderId);
    if (orderIndex === -1) return false;

    const updatedOrders = [...parkedOrders];
    updatedOrders[orderIndex] = {
      ...updatedOrders[orderIndex],
      sellerId: targetSellerId,
      sellerName: targetSellerName
    };
    
    saveToStorage(updatedOrders);
    toast.success(`Order transferred to ${targetSellerName}`);
    return true;
  };

  return {
    parkedOrders,
    parkOrder,
    removeOrder,
    retrieveOrder,
    transferOrder
  };
}
