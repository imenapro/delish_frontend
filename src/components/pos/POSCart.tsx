import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { ShoppingCart, Minus, Plus, Trash2, CreditCard, Save } from 'lucide-react';

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
  isProcessing?: boolean;
}

export function POSCart({ 
  items, 
  onUpdateQuantity, 
  onRemoveItem, 
  onClearCart,
  onCheckout,
  onPark,
  isProcessing 
}: POSCartProps) {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tax = 0; // Can be configured
  const total = subtotal + tax;

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
          <ScrollArea className="h-[300px] px-4">
            <div className="space-y-3">
              {items.map(item => (
                <div key={item.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.price.toLocaleString()} RWF each
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <Input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => onUpdateQuantity(item.id, parseInt(e.target.value) || 0)}
                      className="w-12 h-7 text-center p-0"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="text-right min-w-[80px]">
                    <p className="font-semibold text-sm">
                      {(item.price * item.quantity).toLocaleString()} RWF
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive"
                    onClick={() => onRemoveItem(item.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
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
              <span>{subtotal.toLocaleString()} RWF</span>
            </div>
            {tax > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tax</span>
                <span>{tax.toLocaleString()} RWF</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between font-bold text-lg">
              <span>Total</span>
              <span className="text-primary">{total.toLocaleString()} RWF</span>
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
            <Button 
              className="col-span-2"
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
