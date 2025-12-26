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
import { PostSaleData } from '@/components/pos/POSPostSaleDialog';
import { POSCalculator } from '@/components/pos/POSCalculator';
import { useParkedOrders } from '@/hooks/useParkedOrders';
import { POSParkedOrdersDialog } from '@/components/pos/POSParkedOrdersDialog';
import { POSParkOrderDialog } from '@/components/pos/POSParkOrderDialog';
import { POSRefundDialog } from '@/components/pos/POSRefundDialog';

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
  const { store } = useStoreContext();
  const { user, roles } = useAuth();
  const queryClient = useQueryClient();
  const [cart, setCart] = useState<CartItem[]>([]);
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
  const wakeLock = useRef<WakeLockSentinel | null>(null);


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
      if (!store?.id) return [];
      
      const { data, error } = await supabase
        .from('shops')
        .select('id, name')
        .eq('business_id', store.id)
        .eq('is_active', true);
        
      if (error) throw error;
      
      const allShops = data || [];
      
      // Check permissions
      const isGlobalAdmin = roles.some(r => ['super_admin', 'admin', 'store_owner', 'branch_manager'].includes(r.role));
      
      if (isGlobalAdmin) {
        return allShops;
      }
      
      // Filter shops based on user assignments
      const allowedShopIds = roles
        .map(r => r.shop_id)
        .filter((id): id is string => !!id);
        
      if (allowedShopIds.length > 0) {
        return allShops.filter(shop => allowedShopIds.includes(shop.id));
      }
      
      // If no explicit assignments and not admin, user might not have access to any shop
      return [];
    },
    enabled: !!store?.id && !!user?.id && roles.length > 0,
  });

  // Check for active POS session
  const { data: activeSession, isLoading: sessionLoading } = useQuery({
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
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch products from the active session's shop
  const selectedShop = activeSession?.shop_id || '';
  
  const { parkedOrders, parkOrder, removeOrder } = useParkedOrders(selectedShop);

  const handleParkOrder = () => {
    if (cart.length === 0) {
      toast.error("Cart is empty");
      return;
    }
    setParkOrderDialogOpen(true);
  };

  const handleConfirmParkOrder = (note: string) => {
    parkOrder(cart, note || undefined);
    setCart([]);
  };

  const handleResumeOrder = (order: { items: CartItem[]; id: string }) => {
      setCart(order.items);
      removeOrder(order.id);
      toast.success("Order resumed");
  };
  
  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ['tenant-pos-products', store?.id, selectedShop],
    queryFn: async () => {
      if (!store?.id || !selectedShop) return [];
      
      const { data, error } = await supabase
        .from('shop_inventory')
        .select(`
          id,
          price,
          stock,
          product:products(id, name, category, image_url, barcode, discount_price, promotion_description)
        `)
        .eq('shop_id', selectedShop);
      if (error) throw error;
      
      // Filter out items where product is null (deleted/inactive)
      const validItems = (data || []).filter(item => item.product);
      
      return validItems.map(item => ({
        id: item.product!.id,
        name: item.product!.name,
        price: item.price,
        category: item.product!.category,
        image_url: item.product!.image_url,
        stock: item.stock,
        barcode: item.product!.barcode,
        discount_price: item.product!.discount_price,
        promotion_description: item.product!.promotion_description,
      }));
    },
    enabled: !!store?.id && !!selectedShop,
  });

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


  // Create order mutation
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
      if (!user?.id) throw new Error('Not authenticated');
      if (!activeSession) throw new Error('No active shift');
      if (!store?.id) throw new Error('Store context missing');

      let total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
      
      // Add extras to total
      if (extras) {
        total = extras.finalTotal;
      }

      const orderCode = `ORD-${Date.now().toString(36).toUpperCase()}`;

      // Create order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          order_code: orderCode,
          customer_id: user.id,
          seller_id: user.id,
          shop_id_origin: activeSession.shop_id,
          shop_id_fulfill: activeSession.shop_id,
          total_amount: total,
          payment_method: paymentMethod,
          customer_phone: customerPhone,
          status: 'confirmed',
          confirmed_at: new Date().toISOString(),
          source: 'pos',
          // Store receipt options if possible, or just note it
          notes: (extras ? `Receipt: ${extras.needReceipt}, Print: ${extras.printReceipt}, SMS: ${extras.smsReceipt}, Email: ${extras.emailReceipt}` : '') + ' [Source: POS]'
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Generate Invoice for POS transactions
      let invoiceNumber = null;
      try {
        const { data: invNum, error: invGenError } = await supabase.rpc('generate_shop_invoice_number', {
          p_shop_id: activeSession.shop_id
        });
        if (invGenError) throw invGenError;
        
        invoiceNumber = invNum;

        const { error: invoiceError } = await supabase
          .from('invoices')
          .insert({
            invoice_number: invoiceNumber,
            shop_id: activeSession.shop_id,
            staff_id: user.id,
            customer_info: { 
                id: user.id, 
                phone: customerPhone || 'Walk-in',
                name: 'Walk-in Customer' // Could be enhanced if we had customer selection
            },
            items_snapshot: cart.map(item => ({
                id: item.id,
                name: item.name,
                price: item.price,
                quantity: item.quantity,
                subtotal: item.price * item.quantity
            })),
            subtotal: total, // Assuming tax is included or calculated elsewhere
            tax_amount: 0, // Should be calculated if needed
            total_amount: total,
            payment_method: paymentMethod,
            status: 'paid'
          });

        if (invoiceError) {
            console.error("Failed to create invoice record:", invoiceError);
            toast.error("Order created but invoice generation failed.");
        }
      } catch (err) {
        console.error("Invoice generation error (likely migration missing):", err);
        // Fallback: Proceed without invoice number, relying on Order Code
      }

      // Prepare order items
      const orderItems = cart.map(item => ({
        order_id: order.id,
        product_id: item.id,
        quantity: item.quantity,
        unit_price: item.price,
        subtotal: item.price * item.quantity,
      }));

      // Prepare items for receipt (preserve names)
      const receiptItems = cart.map(item => ({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        subtotal: item.price * item.quantity
      }));

      // Add extra items (Fees)
      if (extras) {
        const getServiceProductId = async (name: string, price: number) => {
            // Try to find existing service product
            const { data: existing } = await supabase
              .from('products')
              .select('id')
              .eq('name', name)
              .eq('business_id', store.id)
              .limit(1);
              
            if (existing && existing.length > 0) return existing[0].id;
            
            // Create new service product if not found
            // Use a random barcode to avoid unique constraint issues if any
            const { data: newProduct, error } = await supabase
              .from('products')
              .insert({
                name: name,
                business_id: store.id,
                category: 'Services',
                price: price,
                is_active: true,
                description: 'System generated service fee',
                barcode: `SVC-${Date.now()}-${Math.floor(Math.random() * 1000)}` 
              })
              .select()
              .single();
              
            if (error) {
                console.error("Error creating service product:", error);
                // Fallback: search for ANY product to attach fee to (risky but better than failing)
                // Ideally this shouldn't happen.
                throw error;
            }
            return newProduct.id;
        };

        if (extras.chargeSms) {
            const smsProdId = await getServiceProductId('SMS Fee', extras.smsFee);
            orderItems.push({
                order_id: order.id,
                product_id: smsProdId,
                quantity: 1,
                unit_price: extras.smsFee,
                subtotal: extras.smsFee
            });
            
            receiptItems.push({
                id: smsProdId,
                name: 'SMS Fee',
                price: extras.smsFee,
                quantity: 1,
                subtotal: extras.smsFee
            });
        }

        if (extras.packaging) {
            const pkgProdId = await getServiceProductId('Packaging Fee', extras.packagingFee);
            orderItems.push({
                order_id: order.id,
                product_id: pkgProdId,
                quantity: 1,
                unit_price: extras.packagingFee,
                subtotal: extras.packagingFee
            });
            
            receiptItems.push({
                id: pkgProdId,
                name: 'Packaging Fee',
                price: extras.packagingFee,
                quantity: 1,
                subtotal: extras.packagingFee
            });
        }
      }

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Update inventory stock
      for (const item of cart) {
        // Fetch current stock to ensure accuracy
        const { data: inventoryItem, error: fetchError } = await supabase
          .from('shop_inventory')
          .select('id, stock')
          .eq('shop_id', activeSession.shop_id)
          .eq('product_id', item.id)
          .single();
          
        if (fetchError) {
          console.error(`Error fetching inventory for product ${item.id}:`, fetchError);
          continue;
        }
        
        if (inventoryItem && inventoryItem.stock !== null) {
          const newStock = Math.max(0, inventoryItem.stock - item.quantity);
          
          const { error: updateError } = await supabase
            .from('shop_inventory')
            .update({ stock: newStock })
            .eq('id', inventoryItem.id);
            
          if (updateError) {
             console.error(`Error updating stock for product ${item.id}:`, updateError);
          }
        }
      }

      // Update session totals
      // If payment was cash, we assume the user collected the full amount including fees
      const newSales = (activeSession.total_sales || 0) + (paymentMethod === 'cash' ? total : 0);
      const newOrders = (activeSession.total_orders || 0) + 1;

      await supabase
        .from('pos_sessions')
        .update({
          total_sales: newSales,
          total_orders: newOrders,
        })
        .eq('id', activeSession.id);

      return { ...order, items: receiptItems, extras, invoice_number: invoiceNumber };
    },
    onSuccess: (data) => {
      setLastOrder(data);
      setCart([]);
      setPaymentDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['active-pos-session'] });
      queryClient.invalidateQueries({ queryKey: ['session-stats'] });
      queryClient.invalidateQueries({ queryKey: ['tenant-pos-products'] });
      
      // Handle receipt printing
      if (data.extras?.printReceipt) {
         // Trigger print after a short delay to ensure state is updated
         setTimeout(() => {
             handlePrint();
         }, 500);
      }
      
      // Handle SMS/Email notifications (Mock for now)
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
    if (quantity <= 0) {
      setCart(prev => prev.filter(item => item.id !== id));
    } else {
      const product = products.find(p => p.id === id);
      if (product && product.stock !== undefined && quantity > product.stock) {
        toast.error(`Cannot update quantity. Only ${product.stock} in stock.`);
        return;
      }

      setCart(prev => prev.map(item =>
        item.id === id ? { ...item, quantity } : item
      ));
    }
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

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // Show loading while checking for active session
  if (sessionLoading || shopsLoading) {
    return (
      <TenantPageWrapper title="Point of Sale" description="Loading...">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </TenantPageWrapper>
    );
  }

  // Show error if no shops assigned
  if (shops.length === 0) {
    return (
      <TenantPageWrapper title="Point of Sale" description="Access Denied">
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <Store className="h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">No Shops Assigned</h2>
          <p className="text-muted-foreground mb-4">
            You are not assigned to any shop in this business. Please contact your administrator.
          </p>
        </div>
      </TenantPageWrapper>
    );
  }

  // Show open shift dialog if no active session
  if (!activeSession && store?.id) {
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
          shops={shops}
          businessId={store.id}
          onShiftOpened={handleShiftOpened}
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
                <span>Opening: {(activeSession.opening_cash || 0).toLocaleString()} RWF</span>
                <span>•</span>
                <span>Sales: {(activeSession.total_sales || 0).toLocaleString()} RWF</span>
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
              <div className="text-2xl font-bold">{(sessionStats?.sales || 0).toLocaleString()} RWF</div>
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
              <div className="text-2xl font-bold">{cartTotal.toLocaleString()} RWF</div>
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
                {((activeSession?.opening_cash || 0) + (activeSession?.total_sales || 0)).toLocaleString()} RWF
              </div>
              <p className="text-xs text-muted-foreground">in drawer</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main POS Interface */}
      <div className={`grid lg:grid-cols-3 gap-6 ${isFullScreen ? 'h-full' : ''}`}>
        {/* Product Grid - 2 columns */}
        <div className={`lg:col-span-2 ${isFullScreen ? 'h-full overflow-hidden flex flex-col' : ''}`}>
          <Card className={isFullScreen ? 'h-full flex flex-col' : ''}>
            <CardHeader>
              <CardTitle>Products</CardTitle>
            </CardHeader>
            <CardContent className={isFullScreen ? 'flex-1 overflow-y-auto' : ''}>
              <POSProductGrid
                products={products}
                loading={productsLoading}
                onAddToCart={addToCart}
              />
            </CardContent>
          </Card>
        </div>

        {/* Cart - 1 column */}
        <div className={`lg:col-span-1 ${isFullScreen ? 'h-full' : ''}`}>
          <POSCart
            items={cart}
            onUpdateQuantity={updateQuantity}
            onRemoveItem={removeFromCart}
            onClearCart={() => setCart([])}
            onCheckout={() => setPaymentDialogOpen(true)}
            onPark={handleParkOrder}
            isProcessing={createOrderMutation.isPending}
          />
        </div>
      </div>

      {/* Payment Dialog */}
      <POSPaymentDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        cartItems={cart}
        total={cartTotal}
        onComplete={(paymentMethod, customerPhone, extras) => 
          createOrderMutation.mutate({ paymentMethod, customerPhone, extras })
        }
        isProcessing={createOrderMutation.isPending}
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

      {/* Hidden Receipt for Printing */}
      <div className="hidden">
        {lastOrder && (
          <Receipt
            ref={receiptRef}
            order={lastOrder}
            items={lastOrder.items?.map((item: CartItem) => ({
              name: item.name,
              quantity: item.quantity,
              price: item.price,
              subtotal: item.price * item.quantity,
            })) || []}
            shop={shops?.find((s: Shop) => s.id === selectedShop) || { name: store?.name, address: '', phone: '', id: '' }}
            business={shops?.find((s: Shop) => s.id === selectedShop)?.business}
          />
        )}
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
        currentUserId={user?.id}
      />
    </>
  );

  if (isFullScreen) {
    return (
      <div className="h-screen w-screen bg-background flex flex-col p-4 overflow-hidden fixed inset-0 z-50">
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
