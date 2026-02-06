import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { TenantPageWrapper } from '@/components/tenant/TenantPageWrapper';
import { POSProductGrid } from '@/components/pos/POSProductGrid';
import { POSCart, CartItem } from '@/components/pos/POSCart';
import { POSPaymentDialog } from '@/components/pos/POSPaymentDialog';
import { OpenShiftDialog } from '@/components/pos/OpenShiftDialog';
import { CloseShiftDialog } from '@/components/pos/CloseShiftDialog';
import { BarcodeScanner } from '@/components/pos/BarcodeScanner';
import { Receipt } from '@/components/pos/Receipt';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useStoreContext } from '@/contexts/StoreContext';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Printer, Wifi, WifiOff, CreditCard, ShoppingCart, Calculator, Clock, LogOut, Store, Maximize, Minimize, ShoppingBag, RotateCcw } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import { format, formatDistanceToNow } from 'date-fns';
import { formatCurrency, DEFAULT_SYSTEM_CURRENCY } from '@/utils/currency';
import { PostSaleData } from '@/components/pos/POSPostSaleDialog';
import { POSCalculator } from '@/components/pos/POSCalculator';
import { useParkedOrders } from '@/hooks/useParkedOrders';
import { POSParkedOrdersDialog } from '@/components/pos/POSParkedOrdersDialog';
import { POSParkOrderDialog } from '@/components/pos/POSParkOrderDialog';
import { POSRefundDialog } from '@/components/pos/POSRefundDialog';
import { POSMuteToggle } from '@/components/pos/POSMuteToggle';

interface POSProduct {
  id: string;
  name: string;
  price: number;
  category: string;
  image_url: string | null;
  stock?: number;
  barcode: string | null;
  discount_price: number | null;
  promotion_description: string | null;
}

interface TenantTax {
  id: string;
  name: string;
  rate: number;
  is_compound: boolean;
  shop_id: string | null;
  effective_from: string | null;
  effective_to: string | null;
  is_active: boolean;
  type?: string;
}

interface WakeLockSentinel {
  release: () => Promise<void>;
}

interface NavigatorWithWakeLock extends Navigator {
  wakeLock: {
    request: (type: 'screen') => Promise<WakeLockSentinel>;
  };
}

interface Shop {
  id: string;
  name: string;
  business?: Record<string, unknown>;
}

export default function TenantPOS() {
  const { store, loading: storeLoading } = useStoreContext();
  const { user, roles } = useAuth();
  const queryClient = useQueryClient();

  const [cart, setCart] = useState<CartItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [closeShiftDialogOpen, setCloseShiftDialogOpen] = useState(false);
  const [openShiftDialogOpen, setOpenShiftDialogOpen] = useState(true);
  const [lastOrder, setLastOrder] = useState<unknown>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const receiptRef = useRef<HTMLDivElement>(null);
  const [calculatorOpen, setCalculatorOpen] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [parkedOrdersDialogOpen, setParkedOrdersDialogOpen] = useState(false);
  const [parkOrderDialogOpen, setParkOrderDialogOpen] = useState(false);
  const [refundDialogOpen, setRefundDialogOpen] = useState(false);
  const [postSaleDialogOpen, setPostSaleDialogOpen] = useState(false);
  const [lastSaleData, setLastSaleData] = useState<any>(null);
  const [lastTaxBreakdown, setLastTaxBreakdown] = useState<{ name: string; rate: number; amount: number }[]>([]);
  const wakeLock = useRef<WakeLockSentinel | null>(null);
  const currency = store?.currency || DEFAULT_SYSTEM_CURRENCY;


  useEffect(() => {
    const handleFullScreenChange = () => {
      setIsFullScreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullScreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullScreenChange);
    };
  }, []);

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  useEffect(() => {
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLock.current = await (navigator as unknown as NavigatorWithWakeLock).wakeLock.request('screen');
        }
      } catch (err) {
        console.error('Wake Lock error:', err);
      }
    };

    const releaseWakeLock = async () => {
      if (wakeLock.current) {
        try {
          await wakeLock.current.release();
          wakeLock.current = null;
        } catch (err) {
          console.error('Wake Lock release error:', err);
        }
      }
    };

    const handleVisibilityChange = async () => {
      if (isFullScreen && document.visibilityState === 'visible') {
        await requestWakeLock();
      }
    };

    if (isFullScreen) {
      requestWakeLock();
      document.addEventListener('visibilitychange', handleVisibilityChange);
    } else {
      releaseWakeLock();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    }

    return () => {
      releaseWakeLock();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isFullScreen]);

  // Fetch shops for this business
  const { data: shops = [], isLoading: shopsLoading } = useQuery({
    queryKey: ['tenant-shops', store?.id, user?.id],
    queryFn: async () => {
      if (!store?.id || !user?.id) return [];

      const { data, error } = await supabase
        .from('shops')
        .select('id, name')
        .eq('is_active', true)
        .eq('business_id', store.id);
      
      if (error) throw error;

      return data || [];
    },
    enabled: !!store?.id && !!user?.id,
  });

  const isAdminLike = roles.some(r =>
    ['super_admin', 'admin', 'store_owner', 'branch_manager', 'accountant', 'manager'].includes(r.role) &&
    (r.business_id ? r.business_id === store?.id : true)
  );

  const assignedShopIds = roles
    .filter(r => r.shop_id && (r.business_id ? r.business_id === store?.id : true))
    .map(r => r.shop_id as string);

  const visibleShops = isAdminLike || assignedShopIds.length === 0
    ? shops
    : shops.filter(s => assignedShopIds.includes(s.id));
  // Diagnostic: Fetch specific shop details if assigned (always declare hooks before any conditional returns)
  const { data: assignedShopDetails } = useQuery({
    queryKey: ['diagnostic-shop', roles],
    queryFn: async () => {
      const assignedShopId = roles.find(r => r.shop_id)?.shop_id;
      if (!assignedShopId) return null;

      const { data, error } = await supabase
        .from('shops')
        .select('id, name, business_id, is_active')
        .eq('id', assignedShopId)
        .maybeSingle();
      
      if (error) {
        console.error('Diagnostic fetch error:', error);
        return null;
      }
      return data;
    },
    enabled: shops.length === 0 && roles.some(r => r.shop_id),
  });

  // Check for active POS session
  const { data: activeSession, isLoading: sessionLoading, error: sessionError } = useQuery({
    queryKey: ['active-pos-session', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('pos_sessions')
        .select(`
          *,
          user:profiles(id, name),
          shop:shops(id, name, logo_url, address, phone, owner_email)
        `)
        .eq('user_id', user.id)
            .eq('status', 'open')
            .order('opened_at', { ascending: false })
            .limit(1);
            
      if (error) {
        console.error('[TenantPOS] Error fetching session:', error);
        throw error;
      }
      return data?.[0] || null;
    },
    enabled: !!user?.id,
  });

  const { data: tenantTaxes } = useQuery({
    queryKey: ['tenant-taxes', store?.id, activeSession?.shop_id],
    queryFn: async () => {
      if (!store?.id) return [];
      const { data, error } = await supabase
        .from('tenant_taxes' as any)
        .select('*')
        .eq('business_id', store.id)
        .eq('is_active', true);
      if (error) {
        console.warn('Error fetching tenant taxes:', error);
        return [];
      }
      return data || [];
    },
    enabled: !!store?.id,
  });

  const calculateTaxBreakdown = (items: CartItem[]) => {
    const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const now = new Date();
    
    const applicable = (tenantTaxes || []).filter((t: TenantTax) => {
      const forShop = !t.shop_id || t.shop_id === activeSession?.shop_id;
      const fromOk = !t.effective_from || new Date(t.effective_from) <= now;
      const toOk = !t.effective_to || new Date(t.effective_to) >= now;
      return forShop && fromOk && toOk && t.is_active;
    });

    const getTaxType = (t: TenantTax) => {
        if (t.type?.toLowerCase() === 'deducted' || t.name.toLowerCase().includes('deducted') || t.name.toLowerCase().includes('withholding')) return 'deducted';
        if (t.is_compound) return 'compound';
        return 'single';
    };

    // Sort: Single/Deducted first, then Compound
    applicable.sort((a: TenantTax, b: TenantTax) => {
       const typeA = getTaxType(a);
       const typeB = getTaxType(b);
       
       const score = (type: string) => {
           if (type === 'single') return 1;
           if (type === 'deducted') return 1; 
           if (type === 'compound') return 2;
           return 0;
       };

       return score(typeA) - score(typeB);
    });

    const breakdown: { name: string; rate: number; amount: number; type: string }[] = [];
    let currentTotal = subtotal;
    // We are dealing with tenant
    applicable.forEach((t: TenantTax) => {
      const rate = Number(t.rate) / 100;
      let amount = 0;
      const type = getTaxType(t);

      if (type === 'single') {
          amount = subtotal * rate;
          currentTotal += amount;
      } else if (type === 'deducted') {
          amount = -1 * subtotal * rate; 
          currentTotal += amount;
      } else if (type === 'compound') {
          amount = currentTotal * rate;
          currentTotal += amount;
      }

      breakdown.push({ name: t.name, rate: Number(t.rate), amount, type });
    });

    return breakdown;
  };

  // Fetch products from the active session's shop
  const selectedShop = activeSession?.shop_id || '';
  
  const { parkedOrders, parkOrder, removeOrder, retrieveOrder, transferOrder } = useParkedOrders(selectedShop, activeSession?.user_id, activeSession?.user?.name);

  const handleParkOrder = () => {
    if (cart.length === 0) {
      toast.error("Cart is empty");
      return;
    }
    setParkOrderDialogOpen(true);
  };

  const handleConfirmParkOrder = async (note: string) => {
    const code = await parkOrder(cart, note || undefined);
    if (code) {
      setCart([]);
    }
  };

  const handleResumeOrder = async (order: { items: CartItem[]; id: string }) => {
      setCart(order.items);
      await removeOrder(order.id);
      toast.success("Order resumed");
  };
  
  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ['tenant-pos-products', store?.id, selectedShop],
    queryFn: async () => {
      if (!store?.id || !selectedShop) return [];
      
      // 1. Fetch all active products for the business
      const { data: allProducts, error: prodError } = await supabase
        .from('products')
        .select('id, name, category, image_url, barcode, discount_price, promotion_description, price')
        .eq('business_id', store.id)
        .eq('is_active', true);

      if (prodError) throw prodError;

      // 2. Fetch inventory for this shop
      const { data: inventory, error: invError } = await supabase
        .from('shop_inventory')
        .select('product_id, price, stock')
        .eq('shop_id', selectedShop);

      if (invError) throw invError;

      // 3. Merge
      const invMap = new Map(inventory?.map(i => [i.product_id, i]));

      return (allProducts || []).map(p => {
        const inv = invMap.get(p.id);
        return {
          id: p.id,
          name: p.name,
          price: p.price, // Use master price
          category: p.category,
          image_url: p.image_url,
          stock: inv ? inv.stock : undefined, // undefined stock means "no limit/unknown"
          barcode: p.barcode,
          discount_price: p.discount_price,
          promotion_description: p.promotion_description,
        };
      });
    },
    enabled: !!store?.id && !!selectedShop,
    staleTime: 0, // Always fetch fresh data on mount/focus to ensure price updates are immediate
    gcTime: 1000 * 60 * 10,   // Keep in garbage collection for 10 minutes
  });

  // Diagnostic logging for tenant product loading
  useEffect(() => {
    if (!productsLoading && selectedShop) {
      console.log(`[TenantPOS] Loaded ${products.length} products for shop ${selectedShop}`);
      if (products.length === 0) {
        console.warn('[TenantPOS] No products found. Check shop_inventory table for shop_id:', selectedShop);
        // Optional: Toast for visibility if debugging
        // toast.info("No products found for this shop. Please check inventory.");
      }
    }
  }, [productsLoading, products.length, selectedShop]);

  // Today's sales stats for current session
  const { data: sessionStats } = useQuery({
    queryKey: ['session-stats', activeSession?.id],
    queryFn: async () => {
      if (!activeSession?.id) return { sales: 0, orders: 0 };
      return {
        sales: activeSession.total_sales || 0,
        orders: activeSession.total_orders || 0,
      };
    },
    enabled: !!activeSession?.id,
  });


  // Create order mutation - OPTIMIZED
  const createOrderMutation = useMutation({
    mutationFn: async ({ 
      paymentMethod, 
      customerPhone,
      extras 
    }: { 
      paymentMethod: string; 
      customerPhone?: string;
      extras?: PostSaleData;
    }) => {
      const startTime = performance.now();
      console.log(`[Checkout] Started at ${new Date().toISOString()}`);

      if (!user?.id) throw new Error('Not authenticated');
      if (!activeSession) throw new Error('No active shift');
      if (!store?.id) throw new Error('Store context missing');

      let total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const taxBreakdown = calculateTaxBreakdown(cart);
      const taxTotal = taxBreakdown.reduce((sum, t) => sum + t.amount, 0);
      total += taxTotal;
      
      if (extras) {
        total = extras.finalTotal;
      }

      // Prepare items for RPC
      const rpcItems = cart.map(item => ({
        product_id: item.id,
        quantity: item.quantity,
        unit_price: item.price,
        name: item.name
      }));

      // Handle Extras (Fees)
      if (extras) {
        const feePromises = [];
        if (extras.chargeSms) feePromises.push({ name: 'SMS Fee', price: extras.smsFee });
        if (extras.packaging) feePromises.push({ name: 'Packaging Fee', price: extras.packagingFee });

        if (feePromises.length > 0) {
            const getServiceProductId = async (name: string, price: number) => {
                const { data: existing } = await supabase
                  .from('products')
                  .select('id')
                  .eq('name', name)
                  .eq('business_id', store.id)
                  .limit(1);
                  
                if (existing && existing.length > 0) return existing[0].id;
                
                const { data: newProduct, error } = await supabase
                  .from('products')
                  .insert({
                    name: name,
                    business_id: store.id,
                    category: 'Services',
                    price: price,
                    is_active: true,
                    description: 'System generated fee',
                    barcode: `SVC-${Date.now()}-${Math.floor(Math.random() * 1000)}` 
                  })
                  .select()
                  .single();
                  
                if (error) throw error;
                return newProduct.id;
            };

            for (const fee of feePromises) {
                const feeId = await getServiceProductId(fee.name, fee.price);
                rpcItems.push({
                    product_id: feeId,
                    quantity: 1,
                    unit_price: fee.price,
                    name: fee.name
                });
            }
        }
      }

      const apiRequestTime = performance.now();
      console.log(`[Checkout] Sending API Request after ${(apiRequestTime - startTime).toFixed(2)}ms`);

      // CALL RPC FUNCTION (Single Transaction)
      const { data: result, error } = await supabase.rpc('process_pos_sale', {
        p_shop_id: activeSession.shop_id,
        p_user_id: user.id,
        p_session_id: activeSession.id,
        p_total_amount: total,
        p_payment_method: paymentMethod,
        p_customer_phone: customerPhone || null,
        p_items: rpcItems,
        p_tax_amount: taxTotal,
        p_extras: {
            notes: (extras ? `Receipt: ${extras.needReceipt}, Print: ${extras.printReceipt}, SMS: ${extras.smsReceipt}` : ''),
            customer_name: 'Walk-in Customer'
        }
      });

      const dbWriteTime = performance.now();
      console.log(`[Checkout] DB Write Completed after ${(dbWriteTime - apiRequestTime).toFixed(2)}ms`);

      if (error) {
        console.error('[Checkout] RPC Error:', error);
        if (error.message.includes('function process_pos_sale') || error.code === '42883') {
            throw new Error('System update required: Run migration 20251230000001');
        }
        throw error;
      }

      const order = {
        id: result.order_id,
        order_code: result.order_code,
        items: rpcItems.map(i => ({ ...i, price: i.unit_price, subtotal: i.unit_price * i.quantity })),
        total_amount: total,
        extras,
        invoice_number: result.invoice_number,
        created_at: result.created_at || new Date().toISOString(),
        payment_method: paymentMethod,
        customer_phone: customerPhone
      };

      console.log(`[Checkout] Total Duration: ${(performance.now() - startTime).toFixed(2)}ms`);
      return order;
    },
    onSuccess: (data) => {
      const breakdown = calculateTaxBreakdown(data.items as any[]);
      setLastTaxBreakdown(breakdown);
      setLastOrder(data);
      setCart([]);
      setPaymentDialogOpen(false);
      
      queryClient.invalidateQueries({ queryKey: ['active-pos-session'] });
      queryClient.invalidateQueries({ queryKey: ['session-stats'] });
      queryClient.invalidateQueries({ queryKey: ['tenant-pos-products'] });
      
      if (data.extras?.printReceipt) {
         setTimeout(() => {
             handlePrint();
         }, 500);
      }
      
      if (data.extras?.smsReceipt) {
          toast.success(`Receipt sent to ${data.extras.smsPhone}`);
      }
      if (data.extras?.emailReceipt) {
          toast.success(`Receipt sent to ${data.extras.email}`);
      }

      toast.success('Order completed successfully!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create order');
    },
  });

  const addToCart = (product: POSProduct) => {
    if (product.stock !== undefined && product.stock <= 0) {
      toast.error('Product is out of stock');
      return;
    }

    const effectivePrice = product.discount_price || product.price;

    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        if (product.stock !== undefined && existing.quantity + 1 > product.stock) {
          toast.error(`Cannot add more. Only ${product.stock} in stock.`);
          return prev;
        }
        return prev.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { id: product.id, name: product.name, price: effectivePrice, quantity: 1 }];
    });
  };

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity < 1) return;

    const product = products.find(p => p.id === id);
    if (product && product.stock !== undefined && quantity > product.stock) {
      toast.error(`Cannot update quantity. Only ${product.stock} in stock.`);
      return;
    }

    setCart(prev => prev.map(item =>
      item.id === id ? { ...item, quantity } : item
    ));
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const handleBarcodeScanned = (barcode: string) => {
    const product = products.find(p => p.barcode === barcode);
    if (product) {
      addToCart(product);
      toast.success(`Added ${product.name} to cart`);
    } else {
      toast.error('Product not found');
    }
  };

  const handlePrint = useReactToPrint({
    contentRef: receiptRef,
  });

  const handleShiftOpened = (_session: unknown) => {
    setOpenShiftDialogOpen(false);
    queryClient.invalidateQueries({ queryKey: ['active-pos-session'] });
  };

  const handleShiftClosed = () => {
    setCart([]);
    queryClient.invalidateQueries({ queryKey: ['active-pos-session'] });
  };

  const cartSubtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const currentTaxBreakdown = calculateTaxBreakdown(cart);
  const currentTaxTotal = currentTaxBreakdown.reduce((sum, t) => sum + t.amount, 0);
  const cartTotal = cartSubtotal + currentTaxTotal;

  // Show loading while checking for active session
  if (storeLoading || sessionLoading || shopsLoading) {
    console.log('[TenantPOS] Loading state:', { storeLoading, sessionLoading, shopsLoading });
    return (
      <TenantPageWrapper title="Point of Sale" description="Loading...">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </TenantPageWrapper>
    );
  }

  if (!store) {
    return (
      <TenantPageWrapper title="Point of Sale" description="Store Not Found">
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <Store className="h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Store Not Found</h2>
          <p className="text-muted-foreground mb-4">
            The store you are looking for does not exist or is not available.
          </p>
          <Button onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
      </TenantPageWrapper>
    );
  }

  if (shops.length === 0 && !shopsLoading) {
    return (
      <TenantPageWrapper>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
          <h2 className="text-2xl font-bold mb-2">No Shops Assigned</h2>
          <p className="text-muted-foreground mb-8">
            You are not assigned to any shop in this business. Please contact your administrator.
          </p>

          {/* Diagnostic Info */}
          <div className="mt-8 p-4 bg-muted/50 rounded-lg text-left max-w-lg w-full text-xs font-mono border">
            <h3 className="font-semibold mb-2 border-b pb-1">Diagnostic Info</h3>
            <div className="grid grid-cols-[100px_1fr] gap-1">
              <span className="text-muted-foreground">User ID:</span>
              <span className="break-all">{user?.id}</span>
              
              <span className="text-muted-foreground">Business ID:</span>
              <span className="break-all">{store?.id}</span>
              
              <span className="text-muted-foreground">Roles:</span>
              <div>
                {roles.map((r, i) => (
                  <div key={i}>
                    {r.role} {r.shop_id ? `(Shop: ${r.shop_id})` : '(No Shop)'}
                  </div>
                ))}
              </div>
              
              <span className="text-muted-foreground">Shops Found:</span>
              <span>{shops.length} (Expected &gt; 0)</span>

              {assignedShopDetails && (
                <>
                  <div className="col-span-2 border-t my-1 pt-1 font-semibold text-amber-600">
                    Target Shop Analysis:
                  </div>
                  <span className="text-muted-foreground">Shop ID:</span>
                  <span className="break-all">{assignedShopDetails.id}</span>
                  <span className="text-muted-foreground">Name:</span>
                  <span>{assignedShopDetails.name}</span>
                  <span className="text-muted-foreground">Is Active:</span>
                  <span className={assignedShopDetails.is_active ? "text-green-600" : "text-red-600"}>
                    {String(assignedShopDetails.is_active)}
                  </span>
                  <span className="text-muted-foreground">Shop Biz ID:</span>
                  <span className={assignedShopDetails.business_id === store?.id ? "text-green-600" : "text-red-600 font-bold"}>
                    {assignedShopDetails.business_id || 'NULL'}
                  </span>
                  {assignedShopDetails.business_id !== store?.id && (
                    <div className="col-span-2 text-red-600 mt-1">
                      MISMATCH: Shop belongs to different business!
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="mt-2 text-muted-foreground italic">
              Note: Access is determined by your role assignment. If you have a business-level role (e.g. Admin, Owner, HQ Staff), you should see all shops. If you have a shop-specific role, you only see assigned shops.
            </div>
          </div>
        </div>
      </TenantPageWrapper>
    );
  }

  // If there was an error checking the active session, surface it clearly
  if (sessionError && store?.id) {
    return (
      <TenantPageWrapper title="Point of Sale" description="Process sales and manage transactions">
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <Clock className="h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Unable to check active shift</h2>
          <p className="text-muted-foreground mb-4 max-w-md">
            There was an error while checking your POS shift status. This is usually caused
            by missing Supabase policies or migrations for the <code>pos_sessions</code> table.
          </p>
          <p className="text-xs text-muted-foreground max-w-md mb-4">
            Technical details: {sessionError.message}
          </p>
          <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['active-pos-session'] })}>
            Retry
          </Button>
        </div>
      </TenantPageWrapper>
    );
  }

  // Show open shift dialog if no active session (and loading is finished)
  if (!sessionLoading && !activeSession && store?.id) {
    return (
      <>
        <TenantPageWrapper title="Point of Sale" description="Process sales and manage transactions">
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <Clock className="h-16 w-16 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">No Active Shift</h2>
            <p className="text-muted-foreground mb-4">
              You need to open a shift before you can process sales.
            </p>
            <Button onClick={() => setOpenShiftDialogOpen(true)}>
              Open Shift
            </Button>
          </div>
        </TenantPageWrapper>
        <OpenShiftDialog
          open={openShiftDialogOpen}
          onOpenChange={setOpenShiftDialogOpen}
          shops={visibleShops}
          businessId={store.id}
          onShiftOpened={handleShiftOpened}
          currency={store.currency}
        />
      </>
    );
  }

  const currentShop = shops.find(s => s.id === activeSession?.shop_id);

  const posActions = (
    <div className="flex items-center gap-2">
      <Badge variant={isOnline ? 'secondary' : 'destructive'} className="gap-1">
        {isOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
        {isOnline ? 'Online' : 'Offline'}
      </Badge>
      <BarcodeScanner onScanSuccess={handleBarcodeScanned} />
      
      <Button 
        variant="outline" 
        size="sm" 
        onClick={() => setRefundDialogOpen(true)}
        className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
      >
        <RotateCcw className="mr-2 h-4 w-4" />
        Refund
      </Button>

      <Button 
        variant="outline" 
        size="sm" 
        onClick={() => setParkedOrdersDialogOpen(true)}
        className={parkedOrders.length > 0 ? "border-orange-500 text-orange-600" : ""}
      >
        <ShoppingBag className="mr-2 h-4 w-4" />
        Parked
        {parkedOrders.length > 0 && (
          <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 flex items-center justify-center rounded-full text-xs">
            {parkedOrders.length}
          </Badge>
        )}
      </Button>

      <Button variant="outline" size="sm" onClick={() => setCalculatorOpen(true)}>
        <Calculator className="mr-2 h-4 w-4" />
        Calculator
      </Button>

      <Button variant="outline" size="sm" onClick={toggleFullScreen}>
        {isFullScreen ? (
          <>
            <Minimize className="mr-2 h-4 w-4" />
            Exit Full Screen
          </>
        ) : (
          <>
            <Maximize className="mr-2 h-4 w-4" />
            Full Screen
          </>
        )}
      </Button>

      {lastOrder && (
        <Button variant="outline" size="sm" onClick={() => handlePrint()}>
          <Printer className="mr-2 h-4 w-4" />
          Print Receipt
        </Button>
      )}
      <Button 
        variant="outline" 
        size="sm" 
        onClick={() => setCloseShiftDialogOpen(true)}
        className="text-orange-600 border-orange-600 hover:bg-orange-50"
      >
        <LogOut className="mr-2 h-4 w-4" />
        Close Shift
      </Button>
    </div>
  );

  const content = (
    <>
      {!isFullScreen && activeSession && (
        <Card className="mb-6 bg-primary/5 border-primary/20">
          <CardContent className="py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">
                    Shift started {formatDistanceToNow(new Date(activeSession.opened_at), { addSuffix: true })}
                  </span>
                </div>
                <Badge variant="outline">{currentShop?.name || 'Unknown Shop'}</Badge>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>Opening: {formatCurrency(activeSession.opening_cash || 0, currency)}</span>
                <span>•</span>
                <span>Sales: {formatCurrency(activeSession.total_sales || 0, currency)}</span>
                <span>•</span>
                <span>{activeSession.total_orders || 0} orders</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!isFullScreen && (
        <div className="grid gap-4 md:grid-cols-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Shift Sales</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(sessionStats?.sales || 0, currency)}</div>
              <p className="text-xs text-muted-foreground">{sessionStats?.orders || 0} orders this shift</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cart Items</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{cart.length}</div>
              <p className="text-xs text-muted-foreground">items in cart</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cart Total</CardTitle>
              <Calculator className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(cartTotal, currency)}</div>
              <p className="text-xs text-muted-foreground">current total</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Expected Cash</CardTitle>
              <Calculator className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency((activeSession?.opening_cash || 0) + (activeSession?.total_sales || 0), currency)}
              </div>
              <p className="text-xs text-muted-foreground">in drawer</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main POS Interface */}
      <div className={`grid lg:grid-cols-3 gap-6 ${isFullScreen ? 'h-full' : 'h-auto lg:h-[calc(100vh-22rem)] lg:min-h-[600px]'}`}>
        {/* Product Grid - 2 columns */}
        <div className="lg:col-span-2 h-[600px] lg:h-full overflow-hidden flex flex-col">
          <Card className="h-full flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle>Products</CardTitle>
              <POSMuteToggle />
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto">
              <POSProductGrid
                products={products}
                loading={productsLoading}
                onAddToCart={addToCart}
                currency={currency}
              />
            </CardContent>
          </Card>
        </div>

        {/* Cart - 1 column */}
        <div className="lg:col-span-1 h-[500px] lg:h-full">
          <POSCart
              items={cart}
              onUpdateQuantity={updateQuantity}
              onRemoveItem={removeFromCart}
              onClearCart={() => setCart([])}
              onCheckout={() => setPaymentDialogOpen(true)}
              onPark={handleParkOrder}
              isProcessing={createOrderMutation.isPending}
              currency={currency}
              tax={currentTaxTotal}
              total={cartTotal}
            />
        </div>
      </div>

      {/* Payment Dialog */}
      <POSPaymentDialog 
        open={paymentDialogOpen} 
        onOpenChange={setPaymentDialogOpen}
        cartItems={cart}
        total={cartTotal}
        onComplete={(method, phone, extras) => createOrderMutation.mutate({ 
          paymentMethod: method, 
          customerPhone: phone,
          extras
        })}
        isProcessing={createOrderMutation.isPending}
        currency={currency}
      />

      {/* Close Shift Dialog */}
      {activeSession && (
        <CloseShiftDialog
          open={closeShiftDialogOpen}
          onOpenChange={setCloseShiftDialogOpen}
          session={{
            ...activeSession,
            user: {
                ...activeSession.user,
                email: user?.email || ''
            }
          }}
          onShiftClosed={() => {
            setCloseShiftDialogOpen(false);
            setOpenShiftDialogOpen(true);
          }}
        />
      )}

      {/* Receipt Component (Hidden) */}
      <div className="hidden">
        <Receipt 
          ref={receiptRef} 
          order={lastOrder as any} 
          items={lastOrder?.items || []} 
          shop={{
            name: activeSession?.shop?.name || '',
            address: activeSession?.shop?.address || '',
            phone: activeSession?.shop?.phone || '',
            city: 'Kigali', // TODO: Get from shop data
            country: store?.country || 'Rwanda'
          }}
          business={{
            website: `www.${store?.slug}.kazimas.com`,
            logo_url: store?.logoUrl,
            metadata: { registration_number: '123456789' } // TODO: Get from business settings
          }}
          currency={currency}
          taxBreakdown={lastTaxBreakdown}
          invoiceSettings={store?.invoiceSettings}
          templateId={store?.invoiceTemplateId}
        />
      </div>

      {/* Calculator Dialog */}
      <POSCalculator open={calculatorOpen} onOpenChange={setCalculatorOpen} />

      {/* Parked Orders Dialog */}
      <POSParkedOrdersDialog 
        open={parkedOrdersDialogOpen}
        onOpenChange={setParkedOrdersDialogOpen}
        orders={parkedOrders}
        onResume={handleResumeOrder}
        onDelete={removeOrder}
        inventory={products}
        currency={currency}
        currentUserId={activeSession?.user_id}
        onTransfer={transferOrder}
      />

      {/* Park Order Confirmation Dialog */}
      <POSParkOrderDialog
        open={parkOrderDialogOpen}
        onOpenChange={setParkOrderDialogOpen}
        onConfirm={handleConfirmParkOrder}
      />

      {/* Refund Dialog */}
      <POSRefundDialog 
        open={refundDialogOpen} 
        onOpenChange={setRefundDialogOpen}
        currentUserId={activeSession?.user_id}
        currency={currency}
      />
    </>
  );

  if (isFullScreen) {
    return (
      <div className="h-screen w-screen bg-background flex flex-col p-4 overflow-auto fixed inset-0 z-50">
        <div className="flex justify-between items-center mb-4 shrink-0">
          <div className="flex items-center gap-4">
             <h1 className="text-xl font-bold">POS</h1>
             {currentShop && <Badge variant="outline">{currentShop.name}</Badge>}
          </div>
          {posActions}
        </div>
        <div className="flex-1 min-h-0">
           {content}
        </div>
      </div>
    );
  }

  return (
    <TenantPageWrapper
      title="Point of Sale"
      description="Process sales and manage transactions"
      actions={posActions}
    >
      {content}
    </TenantPageWrapper>
  );
}
