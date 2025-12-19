import { Layout } from '@/components/Layout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, MapPin, Phone, Clock } from 'lucide-react';
import { AddShopDialog } from '@/components/shops/AddShopDialog';
import { useUserShops } from '@/hooks/useUserShops';

export default function Shops() {
  const { data: shops, isLoading } = useUserShops();

  return (
    <ProtectedRoute requiredRole="admin">
      <Layout>
        <div className="p-8">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Shops Management</h1>
              <p className="text-muted-foreground mt-1">
                Manage your bakery locations and branches
              </p>
            </div>
            <AddShopDialog />
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : shops && shops.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {shops.map((shop) => (
                <Card key={shop.id} className="shadow-[var(--shadow-medium)] hover:shadow-[var(--shadow-strong)] transition-shadow">
                  <CardHeader>
                    <CardTitle>{shop.name}</CardTitle>
                    <CardDescription className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      {shop.address}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {shop.phone && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Phone className="h-4 w-4" />
                        {shop.phone}
                      </div>
                    )}
                    {shop.open_hours && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        {shop.open_hours}
                      </div>
                    )}
                    <div className="pt-4">
                      <Button variant="outline" className="w-full">
                        View Details
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="shadow-[var(--shadow-medium)]">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground mb-4">No shops found</p>
              <AddShopDialog />
            </CardContent>
            </Card>
          )}
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
