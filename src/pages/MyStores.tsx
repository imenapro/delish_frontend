import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUserBusinesses } from '@/hooks/useUserBusinesses';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Building2, ArrowRight, Loader2, Plus } from 'lucide-react';
import { getAbsoluteUrlForStore } from '@/utils/domainMapping';

export default function MyStores() {
  const { user, loading: authLoading } = useAuth();
  const { data: businesses, isLoading: businessesLoading } = useUserBusinesses();
  const navigate = useNavigate();

  const navigateToStore = (slug: string) => {
    const url = getAbsoluteUrlForStore(slug);
    if (url.startsWith('http')) {
      window.location.href = url;
    } else {
      navigate(url);
    }
  };

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    // Auto-redirect if user has only 1 business
    if (!businessesLoading && businesses && businesses.length === 1) {
      const business = businesses[0];
      if (business.slug) {
        navigateToStore(business.slug);
      }
    }
  }, [businesses, businessesLoading, navigate]);

  if (authLoading || businessesLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!businesses || businesses.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-8">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Nenhuma Loja Encontrada</CardTitle>
            <CardDescription>
              Você ainda não tem acesso a nenhuma loja.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/create-first-shop')} className="w-full">
              <Plus className="mr-2 h-4 w-4" />
              Criar Primeira Loja
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12">
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-4xl font-bold text-foreground">Minhas Lojas</h1>
          <p className="text-muted-foreground">
            Selecione uma loja para acessar o dashboard
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {businesses.map((business) => (
            <Card
              key={business.id}
              className="transition-all hover:shadow-lg hover:border-primary/50"
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {business.logo_url ? (
                      <img
                        src={business.logo_url}
                        alt={business.name}
                        className="h-12 w-12 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                        <Building2 className="h-6 w-6 text-primary" />
                      </div>
                    )}
                    <div>
                      <CardTitle className="text-lg">{business.name}</CardTitle>
                      {business.status && (
                        <Badge
                          variant={business.status === 'active' ? 'default' : 'secondary'}
                          className="mt-1"
                        >
                          {business.status}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {business.slogan && (
                  <p className="mb-4 text-sm text-muted-foreground">
                    {business.slogan}
                  </p>
                )}
                <Button
                  onClick={() => {
                    if (business.slug) {
                      navigateToStore(business.slug);
                    }
                  }}
                  className="w-full"
                  disabled={!business.slug}
                >
                  Abrir Dashboard
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-8 text-center">
          <Button
            variant="outline"
            onClick={() => navigate('/create-first-shop')}
          >
            <Plus className="mr-2 h-4 w-4" />
            Criar Nova Loja
          </Button>
        </div>
      </div>
    </div>
  );
}
