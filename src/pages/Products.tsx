import { useState } from 'react';
import { TenantAwareLayout } from '@/components/TenantAwareLayout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useParams } from 'react-router-dom';
import { useStoreContext } from '@/contexts/StoreContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AddProductDialog } from '@/components/products/AddProductDialog';
import breadIcon from '@/assets/bread-icon.png';
import croissantIcon from '@/assets/croissant-icon.png';
import cakeIcon from '@/assets/cake-icon.png';

export default function Products() {
  const { storeSlug } = useParams<{ storeSlug?: string }>();
  const { store } = useStoreContext();
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const { data: products, isLoading } = useQuery({
    queryKey: ['products', store?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .order('category, name');
      
      // Note: Store filtering will be implemented after database migration
      // when store_id is added to products table
      
      if (error) throw error;
      return data;
    },
    enabled: !storeSlug || !!store,
  });

  const getProductIcon = (category: string) => {
    const lower = category.toLowerCase();
    if (lower.includes('bread')) return breadIcon;
    if (lower.includes('pastry') || lower.includes('croissant')) return croissantIcon;
    if (lower.includes('cake')) return cakeIcon;
    return breadIcon;
  };

  return (
    <ProtectedRoute>
      <TenantAwareLayout>
        <div className="p-8">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Products</h1>
              <p className="text-muted-foreground mt-1">
                Manage your bakery product catalog
              </p>
            </div>
            <Button onClick={() => setAddDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Product
            </Button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : products && products.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {products.map((product) => (
                <Card key={product.id} className="shadow-[var(--shadow-medium)] hover:shadow-[var(--shadow-strong)] transition-shadow">
                  <CardHeader>
                    <div className="mb-4 flex items-center justify-center">
                      <img
                        src={product.image_url || getProductIcon(product.category)}
                        alt={product.name}
                        className="h-24 w-24 object-contain rounded-lg"
                      />
                    </div>
                    <CardTitle className="text-lg">{product.name}</CardTitle>
                    <CardDescription>
                      <Badge variant="secondary" className="mt-2">
                        {product.category}
                      </Badge>
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold text-primary">
                        ${Number(product.price).toFixed(2)}
                      </span>
                      <Button variant="outline" size="sm">
                        View
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="shadow-[var(--shadow-medium)]">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <p className="text-muted-foreground mb-4">No products found</p>
                <Button onClick={() => setAddDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Product
                </Button>
              </CardContent>
            </Card>
          )}

          {store && (
            <AddProductDialog
              open={addDialogOpen}
              onOpenChange={setAddDialogOpen}
              businessId={store.id}
            />
          )}
        </div>
      </TenantAwareLayout>
    </ProtectedRoute>
  );
}
