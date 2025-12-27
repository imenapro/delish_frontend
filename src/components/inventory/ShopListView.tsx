
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, MapPin, Package, DollarSign, Layers, ChevronRight } from 'lucide-react';
import { useState } from 'react';

interface Shop {
  id: string;
  name: string;
  address?: string;
}

interface InventoryItem {
  shop_id: string;
  stock: number | string;
  price: number | string;
  product?: {
    category?: string;
  };
}

interface ShopListViewProps {
  shops: Shop[];
  inventory: InventoryItem[];
  onSelectShop: (shopId: string) => void;
}

export function ShopListView({ shops, inventory, onSelectShop }: ShopListViewProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const getShopStats = (shopId: string) => {
    const shopItems = inventory?.filter((i) => i.shop_id === shopId) || [];
    const totalProducts = shopItems.length;
    const totalValue = shopItems.reduce((sum, item) => {
      const stock = Number(item.stock) || 0;
      const price = Number(item.price) || 0;
      return sum + (stock * price);
    }, 0);
    const categories = [...new Set(shopItems.map((i) => i.product?.category).filter((c): c is string => !!c))].slice(0, 3);
    
    return { totalProducts, totalValue, categories };
  };

  const filteredShops = shops?.filter((shop) =>
    shop.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    shop.address?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search shops..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredShops.map((shop) => {
          const stats = getShopStats(shop.id);
          
          return (
            <Card 
              key={shop.id} 
              className="cursor-pointer hover:shadow-lg transition-shadow border-primary/10"
              onClick={() => onSelectShop(shop.id)}
            >
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-xl font-bold">{shop.name}</CardTitle>
                    <CardDescription className="flex items-center gap-1 mt-1">
                      <MapPin className="h-3 w-3" />
                      {shop.address || 'No address'}
                    </CardDescription>
                  </div>
                  <Button variant="ghost" size="icon">
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Package className="h-3 w-3" /> Total Products
                      </div>
                      <div className="text-lg font-bold">{stats.totalProducts}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <DollarSign className="h-3 w-3" /> Inventory Value
                      </div>
                      <div className="text-lg font-bold">
                        {stats.totalValue.toLocaleString()} RWF
                      </div>
                    </div>
                  </div>

                  {stats.categories.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Layers className="h-3 w-3" /> Top Categories
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {stats.categories.map((cat) => (
                          <Badge key={cat} variant="secondary" className="text-xs">
                            {cat}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
