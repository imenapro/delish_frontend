import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, Package, Plus } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { playSound } from '@/utils/sounds';

interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  image_url?: string;
  stock?: number;
  discount_price?: number | null;
  promotion_description?: string | null;
}

interface POSProductGridProps {
  products: Product[];
  loading: boolean;
  onAddToCart: (product: Product) => void;
}

export function POSProductGrid({ products, loading, onAddToCart }: POSProductGridProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<'all' | 'discount' | 'promotion' | 'regular'>('all');

  const categories = [...new Set(products.map(p => p.category))];
  
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || product.category === selectedCategory;
    
    let matchesType = true;
    if (typeFilter === 'discount') {
      matchesType = !!product.discount_price;
    } else if (typeFilter === 'promotion') {
      matchesType = !!product.promotion_description;
    } else if (typeFilter === 'regular') {
      matchesType = !product.discount_price && !product.promotion_description;
    }

    return matchesSearch && matchesCategory && matchesType;
  });

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Type Filter */}
      <div className="flex gap-2 flex-wrap">
        <Badge
          variant={typeFilter === 'all' ? "default" : "outline"}
          className="cursor-pointer"
          onClick={() => setTypeFilter('all')}
        >
          All Types
        </Badge>
        <Badge
          variant={typeFilter === 'discount' ? "default" : "outline"}
          className="cursor-pointer"
          onClick={() => setTypeFilter('discount')}
        >
          Discounted
        </Badge>
        <Badge
          variant={typeFilter === 'promotion' ? "default" : "outline"}
          className="cursor-pointer"
          onClick={() => setTypeFilter('promotion')}
        >
          Promotions
        </Badge>
        <Badge
          variant={typeFilter === 'regular' ? "default" : "outline"}
          className="cursor-pointer"
          onClick={() => setTypeFilter('regular')}
        >
          Regular Price
        </Badge>
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 flex-wrap">
        <Badge
          variant={selectedCategory === null ? "default" : "outline"}
          className="cursor-pointer"
          onClick={() => setSelectedCategory(null)}
        >
          All
        </Badge>
        {categories.map(category => (
          <Badge
            key={category}
            variant={selectedCategory === category ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => setSelectedCategory(category)}
          >
            {category}
          </Badge>
        ))}
      </div>

      {/* Product Grid */}
      {filteredProducts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Package className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="font-semibold text-lg">No products found</h3>
          <p className="text-muted-foreground">Try adjusting your search or filter</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredProducts.map(product => (
            <Card 
              key={product.id} 
              className="cursor-pointer hover:shadow-md transition-shadow group"
              onClick={() => {
                playSound('product-click');
                onAddToCart(product);
                playSound('add-to-cart');
              }}
            >
              <CardContent className="p-4">
                <div className="aspect-square bg-muted rounded-lg mb-3 flex items-center justify-center overflow-hidden relative">
                  {product.image_url ? (
                    <img 
                      src={product.image_url} 
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Package className="h-12 w-12 text-muted-foreground" />
                  )}
                  <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Plus className="h-8 w-8 text-primary" />
                  </div>
                </div>
                <h3 className="font-medium text-sm truncate">{product.name}</h3>
                {product.promotion_description && (
                  <Badge variant="secondary" className="mt-1 text-xs bg-orange-100 text-orange-800 hover:bg-orange-200">
                    {product.promotion_description}
                  </Badge>
                )}
                <div className="flex items-center justify-between mt-2">
                  <div className="flex flex-col">
                    {product.discount_price ? (
                      <>
                        <span className="font-bold text-red-600">
                          {product.discount_price.toLocaleString()} RWF
                        </span>
                        <span className="text-xs text-muted-foreground line-through">
                          {product.price.toLocaleString()} RWF
                        </span>
                      </>
                    ) : (
                      <span className="font-bold text-primary">
                        {product.price.toLocaleString()} RWF
                      </span>
                    )}
                  </div>
                  {product.stock !== undefined && (
                    <Badge variant={product.stock > 0 ? "secondary" : "destructive"} className="text-xs">
                      {product.stock > 0 ? `${product.stock}` : 'Out'}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
