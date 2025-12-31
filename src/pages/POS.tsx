import React, { useState, useRef, useEffect } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Plus, Minus, Trash2, ShoppingCart, Printer, Search, X, Wifi, WifiOff, Cloud, CloudOff, Calculator } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import { Receipt } from '@/components/pos/Receipt';
import { BarcodeScanner } from '@/components/pos/BarcodeScanner';
import { ProductManagementDialog } from '@/components/pos/ProductManagementDialog';
import { POSCalculator } from '@/components/pos/POSCalculator';
import { 
  useOfflineSync, 
  cacheProducts, 
  getCachedProducts, 
  cacheShops, 
  getCachedShops,
  saveCart,
  loadCart,
  clearCart
} from '@/hooks/useOfflineSync';
import { formatCurrency, DEFAULT_SYSTEM_CURRENCY } from '@/utils/currency';
import { useStoreContext } from '@/contexts/StoreContext';

interface CartItem {
  product_id: string;
  name: string;
  price: number;
  quantity: number;
  subtotal: number;
}

interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  image_url: string | null;
  barcode: string | null;
  description: string | null;
  discount_price: number | null;
  promotion_description: string | null;
}

interface Order {
  id: string;
  order_code: string;
  total_amount: number;
  payment_method: string;
  created_at: string;
  queued?: boolean;
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

export default function POS() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { isOnline, isSyncing, queueOrder, syncQueuedOrders, getQueuedOrders } = useOfflineSync();
  const { store } = useStoreContext();

  const { data: shops } = useQuery({
    queryKey: ['shops'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('shops')
          .select('*')
          .eq('is_active', true);
        if (error) throw error;
        cacheShops(data || []);
        return data;
      } catch (error) {
        if (!isOnline) {
          const cached = getCachedShops();
          if (cached) {
            toast.info('Using cached shops (offline mode)');
            return cached;
          }
        }
        throw error;
      }
    },
  });
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedShop, setSelectedShop] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'wallet'>('cash');
  const [customerPhone, setCustomerPhone] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [lastOrder, setLastOrder] = useState<Order | null>(null);
  const [lastItems, setLastItems] = useState<CartItem[]>([]);
  const [lastPayment, setLastPayment] = useState<{amountPaid: number, change: number} | null>(null);
  const [amountTendered, setAmountTendered] = useState<string>('');
  const [calculatorOpen, setCalculatorOpen] = useState(false);
  const [lastTaxBreakdown, setLastTaxBreakdown] = useState<{ name: string; rate: number; amount: number }[]>([]);
  const receiptRef = useRef<HTMLDivElement>(null);

  const currentShop = shops?.find(s => s.id === selectedShop);
  const currency = currentShop?.business?.currency || DEFAULT_SYSTEM_CURRENCY;

  const { data: tenantTaxes } = useQuery({
    queryKey: ['tenant-taxes', store?.id, selectedShop],
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

  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = loadCart();
    if (savedCart.length > 0) {
      setCart(savedCart);
      toast.info('Cart restored from previous session');
    }
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    saveCart(cart);
  }, [cart]);

  const { data: products } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*, business:businesses(currency)')
          .eq('is_active', true)
          .order('name');
        if (error) throw error;
        cacheProducts(data || []);
        return data;
      } catch (error) {
        if (!isOnline) {
          const cached = getCachedProducts();
          if (cached) {
            toast.info('Using cached products (offline mode)');
            return cached;
          }
        }
        throw error;
      }
    },
  });



  const createOrderMutation = useMutation({
    mutationFn: async (orderData: {
      shop_id: string;
      items: CartItem[];
      total: number;
      payment_method: string;
      customer_phone: string;
    }) => {
      // If offline, queue the order
      if (!isOnline) {
        const queuedId = queueOrder({
          customer_id: user?.id || '',
          seller_id: user?.id,
          shop_id: orderData.shop_id,
          items: orderData.items,
          total: orderData.total,
          payment_method: orderData.payment_method,
          customer_phone: orderData.customer_phone,
        });
        return { id: queuedId, order_code: queuedId, queued: true } as Order;
      }

      // Generate order code
      const { data: codeData } = await supabase.rpc('generate_order_code');
      
      // Generate Invoice Number
      const { data: invoiceNumData, error: invNumError } = await supabase.rpc('generate_shop_invoice_number', { 
        p_shop_id: orderData.shop_id 
      });

      if (invNumError) throw invNumError;

      const subtotal = calculateSubtotal(orderData.items);
      const taxBreakdown = calculateTaxBreakdown(orderData.items);
      const taxTotal = taxBreakdown.reduce((s, t) => s + t.amount, 0);

      // Create Invoice explicitly (Decoupled from Order)
      const { error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          invoice_number: invoiceNumData,
          shop_id: orderData.shop_id,
          staff_id: user?.id,
          total_amount: subtotal + taxTotal,
          subtotal: subtotal,
          tax_amount: taxTotal,
          payment_method: orderData.payment_method,
          status: 'paid', // POS invoices are paid immediately
          items_snapshot: orderData.items,
          customer_info: { phone: orderData.customer_phone, id: user?.id, tax_breakdown: taxBreakdown },
        });

      if (invoiceError) throw invoiceError;

      // Create order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          customer_id: user?.id || '',
          seller_id: user?.id,
          shop_id_origin: orderData.shop_id,
          shop_id_fulfill: orderData.shop_id,
          total_amount: orderData.total,
          payment_method: orderData.payment_method,
          customer_phone: orderData.customer_phone || undefined,
          status: 'confirmed',
          order_code: codeData,
          items_snapshot: orderData.items,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const items = orderData.items.map(item => ({
        order_id: order.id,
        product_id: item.product_id,
        quantity: item.quantity,
        price: item.price,
        subtotal: item.subtotal
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(items);

      if (itemsError) throw itemsError;

      return order;
    },
    onSuccess: (order: Order, variables) => {
      // Calculate and save tax breakdown for the receipt
      const breakdown = calculateTaxBreakdown(variables.items);
      setLastTaxBreakdown(breakdown);

      if (order.queued) {
        toast.success('Order queued for sync (offline mode)');
      } else {
        toast.success('Order created successfully!');
      }
      setLastOrder(order);
      setLastItems(variables.items);
      setLastPayment({
        amountPaid: Number(amountTendered) || order.total_amount,
        change: Math.max(0, (Number(amountTendered) || order.total_amount) - order.total_amount)
      });
      setCart([]);
      clearCart();
      setCustomerPhone('');
      setAmountTendered('');
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: (error: Error) => {
      toast.error('Failed to create order: ' + error.message);
    },
  });

  const handlePrint = useReactToPrint({
    contentRef: receiptRef,
  });

  const addToCart = (product: Product) => {
    const existingItem = cart.find(item => item.product_id === product.id);
    
    if (existingItem) {
      setCart(cart.map(item =>
        item.product_id === product.id
          ? { ...item, quantity: item.quantity + 1, subtotal: (item.quantity + 1) * item.price }
          : item
      ));
    } else {
      setCart([...cart, {
        product_id: product.id,
        name: product.name,
        price: Number(product.price),
        quantity: 1,
        subtotal: Number(product.price),
      }]);
    }
    toast.success(`${product.name} added to cart`);
  };

  const updateQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity < 1) {
      removeFromCart(productId);
      return;
    }
    setCart(cart.map(item =>
      item.product_id === productId
        ? { ...item, quantity: newQuantity, subtotal: newQuantity * item.price }
        : item
    ));
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.product_id !== productId));
  };

  const calculateSubtotal = (items: CartItem[] = cart) => {
    return items.reduce((sum, item) => sum + item.subtotal, 0);
  };

  const calculateTaxBreakdown = (items: CartItem[] = cart) => {
    const subtotal = calculateSubtotal(items);
    const now = new Date();
    
    const applicable = (tenantTaxes || []).filter((t: TenantTax) => {
      const forShop = !t.shop_id || t.shop_id === selectedShop;
      const fromOk = !t.effective_from || new Date(t.effective_from) <= now;
      const toOk = !t.effective_to || new Date(t.effective_to) >= now;
      return forShop && fromOk && toOk && t.is_active;
    });

    const getTaxType = (t: TenantTax) => {
        if (t.type?.toLowerCase() === 'deducted' || t.name.toLowerCase().includes('deducted') || t.name.toLowerCase().includes('withholding')) return 'deducted';
        if (t.is_compound) return 'compound';
        return 'single';
    };

    // Sort: Single/Deducted first (base-based), then Compound (total-based)
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

    applicable.forEach((t: TenantTax) => {
      const rate = Number(t.rate) / 100;
      let amount = 0;
      const type = getTaxType(t);

      if (type === 'single') {
          // 1. Single Tax: Add the specified percentage to the base amount
          amount = subtotal * rate;
          currentTotal += amount;
      } else if (type === 'deducted') {
          // 3. Deducted Tax: Subtract the specified percentage from the base amount
          amount = -1 * subtotal * rate; 
          currentTotal += amount;
      } else if (type === 'compound') {
          // 2. Compound Tax: Apply the percentage to the current total (including previous taxes)
          amount = currentTotal * rate;
          currentTotal += amount;
      }

      breakdown.push({ name: t.name, rate: Number(t.rate), amount, type });
    });
    
    return breakdown;
  };

  const calculateTaxTotal = () => {
    return calculateTaxBreakdown().reduce((sum, t) => sum + t.amount, 0);
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTaxTotal();
  };

  const handleBarcodeScanned = async (barcode: string) => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('barcode', barcode)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      toast.error('Product not found with barcode: ' + barcode);
      return;
    }

    addToCart(data);
  };

  const handleCheckout = () => {
    if (!selectedShop) {
      toast.error('Please select a shop');
      return;
    }
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    createOrderMutation.mutate({
      shop_id: selectedShop,
      items: cart,
      total: calculateTotal(),
      payment_method: paymentMethod,
      customer_phone: customerPhone,
    });
  };

  const handleCreateBalanceCase = () => {
    const caseRef = `CASE-${Date.now()}`;
    // In a real app, this would create a record in a 'cases' table
    toast.success(`Balance Case created: ${caseRef}`);
    console.log('Balance Case created:', {
      ref: caseRef,
      orderCode: lastOrder?.order_code,
      amount: lastPayment?.change || 0,
      timestamp: new Date().toISOString()
    });
  };

  const filteredProducts = products?.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const calculatedChange = Math.max(0, (Number(amountTendered) || 0) - calculateTotal());

  return (
    <ProtectedRoute>
      <div className="fixed inset-0 bg-background z-50 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="border-b border-border bg-card px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
              Point of Sale
              {/* Online/Offline Indicator */}
              <Badge 
                variant={isOnline ? "default" : "secondary"}
                className="flex items-center gap-1"
              >
                {isOnline ? (
                  <>
                    <Wifi className="h-3 w-3" />
                    Online
                  </>
                ) : (
                  <>
                    <WifiOff className="h-3 w-3" />
                    Offline
                  </>
                )}
              </Badge>
              {/* Sync Status */}
              {isSyncing && (
                <Badge variant="outline" className="flex items-center gap-1">
                  <Cloud className="h-3 w-3 animate-pulse" />
                  Syncing...
                </Badge>
              )}
              {getQueuedOrders().length > 0 && (
                <Badge variant="outline" className="flex items-center gap-1">
                  <CloudOff className="h-3 w-3" />
                  {getQueuedOrders().length} queued
                </Badge>
              )}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isOnline 
                ? 'Create and manage orders' 
                : 'Working offline - orders will sync when connected'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isOnline && getQueuedOrders().length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={syncQueuedOrders}
                disabled={isSyncing}
              >
                <Cloud className="mr-2 h-4 w-4" />
                Sync Now
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => setCalculatorOpen(true)}>
              <Calculator className="h-4 w-4" />
            </Button>
            <BarcodeScanner onScanSuccess={handleBarcodeScanned} />
            <ProductManagementDialog />
            <Button variant="ghost" size="icon" onClick={() => window.history.back()}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full p-6">
            {/* Products Section */}
            <div className="lg:col-span-2 space-y-4 overflow-y-auto">
              <Card>
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <Label htmlFor="search">Search Products</Label>
                      <div className="relative mt-1">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="search"
                          placeholder="Search by name or category..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-9"
                        />
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {filteredProducts?.map((product) => (
                      <Card
                        key={product.id}
                        className="cursor-pointer hover:shadow-[var(--shadow-medium)] transition-shadow"
                        onClick={() => addToCart(product)}
                      >
                        <CardContent className="p-4">
                          {product.image_url && (
                            <img
                              src={product.image_url}
                              alt={product.name}
                              className="w-full h-32 object-cover rounded-md mb-2"
                            />
                          )}
                          <h3 className="font-semibold text-sm mb-1">{product.name}</h3>
                          <div className="flex flex-col gap-1 mb-2">
                            <Badge variant="secondary" className="text-xs w-fit">
                              {product.category}
                            </Badge>
                            {product.promotion_description && (
                              <Badge variant="outline" className="text-xs w-fit bg-orange-50 text-orange-700 border-orange-200">
                                {product.promotion_description}
                              </Badge>
                            )}
                          </div>
                          <div className="flex flex-col">
                            {product.discount_price ? (
                              <>
                                <p className="text-lg font-bold text-red-600">
                                  {formatCurrency(Number(product.discount_price), currency)}
                                </p>
                                <p className="text-sm text-muted-foreground line-through">
                                  {formatCurrency(Number(product.price), currency)}
                                </p>
                              </>
                            ) : (
                              <p className="text-lg font-bold text-primary">
                                {formatCurrency(Number(product.price), currency)}
                              </p>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Cart and Checkout Section */}
            <div className="space-y-4 overflow-y-auto">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5" />
                    Cart ({cart.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Shop Selection */}
                  <div>
                    <Label htmlFor="shop">Select Shop *</Label>
                    <Select value={selectedShop} onValueChange={setSelectedShop}>
                      <SelectTrigger id="shop">
                        <SelectValue placeholder="Choose shop" />
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

                  {/* Customer Phone */}
                  <div>
                    <Label htmlFor="phone">Customer Phone (Optional)</Label>
                    <Input
                      id="phone"
                      placeholder="078XXXXXXX"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                    />
                  </div>

                  {/* Payment Method */}
                  <div>
                    <Label htmlFor="payment">Payment Method *</Label>
                    <Select value={paymentMethod} onValueChange={(v: 'cash' | 'card' | 'wallet') => setPaymentMethod(v)}>
                      <SelectTrigger id="payment">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="card">Card</SelectItem>
                        <SelectItem value="wallet">Wallet</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Separator />

                  {/* Cart Items */}
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {cart.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">Cart is empty</p>
                    ) : (
                      cart.map((item) => (
                        <Card key={item.product_id}>
                          <CardContent className="p-3">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <p className="font-medium text-sm">{item.name}</p>
                                <p className="text-sm text-muted-foreground">
                                  {formatCurrency(item.price, currency)}
                                </p>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeFromCart(item.product_id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                                >
                                  <Minus className="h-3 w-3" />
                                </Button>
                                <span className="w-8 text-center font-medium">{item.quantity}</span>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </div>
                              <p className="font-bold">
                                {formatCurrency(item.subtotal, currency)}
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>

                  <Separator />

                  {/* Totals */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal:</span>
                      <span>{formatCurrency(calculateSubtotal(), currency)}</span>
                    </div>
                    {calculateTaxBreakdown().map((t, idx) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{t.name} ({t.rate.toFixed(2)}%)</span>
                        <span>{formatCurrency(t.amount, currency)}</span>
                      </div>
                    ))}
                    <Separator />
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total:</span>
                      <span className="text-primary">{formatCurrency(calculateTotal(), currency)}</span>
                    </div>
                  </div>

                  {/* Checkout Button */}
                  <Button
                    className="w-full"
                    size="lg"
                    onClick={handleCheckout}
                    disabled={cart.length === 0 || !selectedShop || createOrderMutation.isPending}
                  >
                    {createOrderMutation.isPending ? 'Processing...' : 'Complete Order'}
                  </Button>

                  {/* Print Receipt Button */}
                  {lastOrder && (
                    <Button
                      className="w-full"
                      variant="outline"
                      onClick={handlePrint}
                    >
                      <Printer className="mr-2 h-4 w-4" />
                      Print Receipt
                    </Button>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Hidden Receipt for Printing */}
        <div style={{ display: 'none' }}>
          <Receipt
            ref={receiptRef}
            order={lastOrder}
            items={lastOrder ? lastItems : cart}
            shop={shops?.find(s => s.id === selectedShop)}
            business={shops?.find(s => s.id === selectedShop)?.business}
            payment={lastPayment || undefined}
            onCreateBalanceCase={handleCreateBalanceCase}
            currency={currency}
            taxBreakdown={lastTaxBreakdown}
          />
        </div>

        <POSCalculator open={calculatorOpen} onOpenChange={setCalculatorOpen} />
      </div>
    </ProtectedRoute>
  );
}
