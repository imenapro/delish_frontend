import { ReactNode, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStoreContext } from '@/contexts/StoreContext';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Store, Calendar } from 'lucide-react';

interface TenantAwareLayoutProps {
  children: ReactNode;
}

export function TenantAwareLayout({ children }: TenantAwareLayoutProps) {
  const { storeSlug } = useParams<{ storeSlug: string }>();
  const { store, loading, isExpired, daysUntilExpiration } = useStoreContext();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && storeSlug && !store) {
      navigate(`/${storeSlug}/login`);
    }
  }, [store, loading, storeSlug, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!store && storeSlug) {
    return null;
  }

  // Tenant mode: show store branding
  if (store && storeSlug) {
    return (
      <div className="min-h-screen bg-background">
        {/* Tenant Header */}
        <header className="border-b bg-card">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {store.logoUrl && (
                  <img 
                    src={store.logoUrl} 
                    alt={store.name}
                    className="h-10 w-10 object-contain rounded-lg"
                  />
                )}
                <div>
                  <h1 className="text-xl font-bold flex items-center gap-2">
                    {store.name}
                    <Badge variant="secondary" className="text-xs">
                      {store.planType}
                    </Badge>
                  </h1>
                  {store.slogan && (
                    <p className="text-sm text-muted-foreground">{store.slogan}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-4">
                {!isExpired && daysUntilExpiration <= 7 && (
                  <Badge variant="destructive" className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {daysUntilExpiration} days left
                  </Badge>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/${storeSlug}/dashboard`)}
                >
                  <Store className="mr-2 h-4 w-4" />
                  Dashboard
                </Button>
              </div>
            </div>
          </div>
        </header>
        
        {/* Content with standard Layout */}
        <Layout>
          {children}
        </Layout>
      </div>
    );
  }

  // Legacy mode: standard layout
  return <Layout>{children}</Layout>;
}
