import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { ShoppingCart, Trash2, CreditCard, Save, Package } from 'lucide-react';
import { formatCurrency, DEFAULT_SYSTEM_CURRENCY } from '@/utils/currency';
import { POSCartItemRow } from './POSCartItemRow';

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface POSCartProps {
  items: CartItem[];
  onUpdateQuantity: (id: string, quantity: number) => void;
  onRemoveItem: (id: string) => void;
  onClearCart: () => void;
  onCheckout: () => void;
  onPark: () => void;
  onCommand?: () => void;
  isProcessing?: boolean;
  currency?: string;
  tax?: number;
  total?: number;
}

export function POSCart({ 
  items, 
  onUpdateQuantity, 
  onRemoveItem, 
  onClearCart,
  onCheckout,
  onPark,
  onCommand,
  isProcessing,
  currency = DEFAULT_SYSTEM_CURRENCY,
  tax = 0,
  total
}: POSCartProps) {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const displayTotal = total ?? (subtotal + tax);

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <ShoppingCart className="h-5 w-5" />
          Cart ({items.length})
        </CardTitle>
      </CardHeader>
      
      <CardContent className="flex-1 overflow-hidden p-0">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center">
            <ShoppingCart className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Cart is empty</p>
            <p className="text-sm text-muted-foreground">Add products to get started</p>
          </div>
        ) : (
          <ScrollArea className="flex-1 px-4 h-full">
            <div className="space-y-3">
              {items.map(item => (
                <POSCartItemRow
                  key={item.id}
                  id={item.id}
                  name={item.name}
                  price={item.price}
                  quantity={item.quantity}
                  subtotal={item.price * item.quantity}
                  currency={currency}
                  onUpdateQuantity={(qty) => onUpdateQuantity(item.id, qty)}
                  onRemove={() => onRemoveItem(item.id)}
                />
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>

      {items.length > 0 && (
        <CardFooter className="flex-col gap-3 border-t pt-4">
          <div className="w-full space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatCurrency(subtotal, currency)}</span>
            </div>
            {tax !== 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tax</span>
                <span>{formatCurrency(tax, currency)}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between font-bold text-lg">
              <span>Total</span>
              <span className="text-primary">{formatCurrency(displayTotal, currency)}</span>
            </div>
          </div>
          
          <div className="grid grid-cols-4 gap-2 w-full">
            <Button 
              variant="outline" 
              className="col-span-1 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={onClearCart}
              title="Clear Cart"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              className="col-span-1 text-orange-600 border-orange-200 hover:bg-orange-50 hover:text-orange-700"
              onClick={onPark}
              title="Park Order"
            >
              <Save className="h-4 w-4" />
            </Button>
            {onCommand && (
              <Button 
                variant="outline" 
                className="col-span-1 text-purple-600 border-purple-200 hover:bg-purple-50 hover:text-purple-700"
                onClick={onCommand}
                title="Create Command with Advance Payment"
                disabled={isProcessing}
              >
                <Package className="h-4 w-4" />
              </Button>
            )}
            <Button 
              className={onCommand ? 'col-span-1' : 'col-span-2'}
              onClick={onCheckout}
              disabled={isProcessing}
            >
              <CreditCard className="mr-2 h-4 w-4" />
              {isProcessing ? 'Processing...' : 'Pay Now'}
            </Button>
          </div>
        </CardFooter>
      )}
    </Card>
  );
}
