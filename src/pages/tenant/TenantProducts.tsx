import { useState } from 'react';
import { TenantPageWrapper } from '@/components/tenant/TenantPageWrapper';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Package, Tag, Plus, Search, MoreVertical, Pencil, Trash2, AlertTriangle } from 'lucide-react';
import { AddProductDialog } from '@/components/products/AddProductDialog';
import { EditProductDialog } from '@/components/products/EditProductDialog';
import { SetDiscountDialog } from '@/components/products/SetDiscountDialog';
import { SetPromotionDialog } from '@/components/products/SetPromotionDialog';
import { useStoreContext } from '@/contexts/StoreContext';
import { useBusinessProducts, useDeleteProduct } from '@/hooks/useBusinessProducts';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: string;
  image_url: string | null;
  business_id: string;
  is_active: boolean;
  barcode: string | null;
  discount_price: number | null;
  promotion_description: string | null;
}

export default function TenantProducts() {
  const { store } = useStoreContext();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteProductId, setDeleteProductId] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [discountDialogOpen, setDiscountDialogOpen] = useState(false);
  const [promotionDialogOpen, setPromotionDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  
  const { data: products = [], isLoading, refetch } = useBusinessProducts(store?.id);
  const deleteProduct = useDeleteProduct();

  const filteredProducts = products.filter(
    (product) =>
      product.is_active &&
      (product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.category.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const categories = [...new Set(filteredProducts.map((p) => p.category))];

  const handleDeleteProduct = async () => {
    if (!deleteProductId) return;
    
    try {
      await deleteProduct.mutateAsync(deleteProductId);
      toast.success('Product deleted successfully');
      setDeleteProductId(null);
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Failed to delete product';
      toast.error(msg);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-RW', {
      style: 'currency',
      currency: 'RWF',
      minimumFractionDigits: 0,
    }).format(price);
  };

  return (
    <TenantPageWrapper
      title="Products"
      description="Manage your product catalog"
      actions={
        <Button onClick={() => setAddDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Product
        </Button>
      }
    >
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredProducts.length}</div>
            <p className="text-xs text-muted-foreground">In catalog</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categories</CardTitle>
            <Tag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{categories.length}</div>
            <p className="text-xs text-muted-foreground">Product categories</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">Need restocking</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredProducts.length}</div>
            <p className="text-xs text-muted-foreground">Available for sale</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative mt-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search products by name or category..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Products Grid */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Product Catalog</CardTitle>
          <CardDescription>Your complete product inventory</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center min-h-[200px]">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex items-center justify-center min-h-[300px]">
              <div className="text-center space-y-4">
                <Package className="h-16 w-16 mx-auto text-muted-foreground" />
                <div>
                  <h3 className="font-semibold text-lg">No Products Yet</h3>
                  <p className="text-muted-foreground">Start building your catalog by adding products</p>
                </div>
                <Button onClick={() => setAddDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Your First Product
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredProducts.map((product) => (
                <Card key={product.id} className="overflow-hidden">
                  <div className="aspect-square relative bg-muted">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="h-12 w-12 text-muted-foreground/50" />
                      </div>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="secondary"
                          size="icon"
                          className="absolute top-2 right-2 h-8 w-8"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedProduct(product);
                            setEditDialogOpen(true);
                          }}
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedProduct(product);
                            setDiscountDialogOpen(true);
                          }}
                        >
                          <Tag className="mr-2 h-4 w-4" />
                          Discount
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedProduct(product);
                            setPromotionDialogOpen(true);
                          }}
                        >
                          <AlertTriangle className="mr-2 h-4 w-4" />
                          Promotion
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setDeleteProductId(product.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold line-clamp-1">{product.name}</h3>
                      </div>
                      <Badge variant="secondary" className="text-xs mb-1 w-fit">
                        {product.category}
                      </Badge>
                      {product.promotion_description && (
                        <Badge variant="outline" className="text-xs mb-1 bg-orange-50 text-orange-700 border-orange-200 w-fit">
                          {product.promotion_description}
                        </Badge>
                      )}
                      <div className="flex flex-col">
                        {product.discount_price ? (
                          <>
                            <p className="text-lg font-bold text-red-600">
                              {formatPrice(product.discount_price)}
                            </p>
                            <p className="text-xs text-muted-foreground line-through">
                              {formatPrice(product.price)}
                            </p>
                          </>
                        ) : (
                          <p className="text-lg font-bold text-primary">
                            {formatPrice(product.price)}
                          </p>
                        )}
                      </div>
                      {product.barcode && (
                        <p className="text-xs text-muted-foreground truncate">
                          Barcode: {product.barcode}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Product Dialog */}
      {store && (
        <AddProductDialog
          open={addDialogOpen}
          onOpenChange={setAddDialogOpen}
          businessId={store.id}
          onSuccess={() => refetch()}
        />
      )}
      
      {/* Edit Product Dialog */}
      {selectedProduct && (
        <>
          <EditProductDialog
            open={editDialogOpen}
            onOpenChange={(open) => {
              setEditDialogOpen(open);
              if (!open && !discountDialogOpen && !promotionDialogOpen) setSelectedProduct(null);
            }}
            product={selectedProduct}
            onSuccess={() => {
              refetch();
              setSelectedProduct(null);
            }}
          />
          <SetDiscountDialog
            open={discountDialogOpen}
            onOpenChange={(open) => {
              setDiscountDialogOpen(open);
              if (!open && !editDialogOpen && !promotionDialogOpen) setSelectedProduct(null);
            }}
            product={selectedProduct}
            onSuccess={() => {
              refetch();
              setSelectedProduct(null);
            }}
          />
          <SetPromotionDialog
            open={promotionDialogOpen}
            onOpenChange={(open) => {
              setPromotionDialogOpen(open);
              if (!open && !editDialogOpen && !discountDialogOpen) setSelectedProduct(null);
            }}
            product={selectedProduct}
            onSuccess={() => {
              refetch();
              setSelectedProduct(null);
            }}
          />
        </>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteProductId} onOpenChange={() => setDeleteProductId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this product? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteProduct} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TenantPageWrapper>
  );
}
