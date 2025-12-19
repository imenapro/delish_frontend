import { ReactNode, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStoreContext } from '@/contexts/StoreContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Clock } from 'lucide-react';
import { MAIN_DOMAIN, isCustomDomain } from '@/utils/domainMapping';

interface SubscriptionGuardProps {
  children: ReactNode;
}

export function SubscriptionGuard({ children }: SubscriptionGuardProps) {
  const { store, loading, isExpired, daysUntilExpiration } = useStoreContext();
  const navigate = useNavigate();

  const handleGoHome = () => {
    if (isCustomDomain(window.location.hostname)) {
      window.location.href = `https://${MAIN_DOMAIN}`;
    } else {
      navigate('/');
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!store) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Store Not Found</CardTitle>
            <CardDescription>The store you're looking for doesn't exist.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleGoHome}>Go to Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show blocking screen if subscription is expired
  if (isExpired) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-6 w-6 text-destructive" />
              <CardTitle>Subscription Expired</CardTitle>
            </div>
            <CardDescription>
              Your subscription for {store.name} has expired.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Access to your store is currently blocked. Please renew your subscription to continue.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Store: <span className="font-medium text-foreground">{store.name}</span>
              </p>
              <p className="text-sm text-muted-foreground">
                Plan: <span className="font-medium text-foreground">{store.planType.toUpperCase()}</span>
              </p>
              <p className="text-sm text-muted-foreground">
                Expired: <span className="font-medium text-foreground">
                  {new Date(store.subscriptionEndDate).toLocaleDateString()}
                </span>
              </p>
            </div>

            <div className="flex gap-2">
              <Button className="flex-1">
                Renew Subscription
              </Button>
              <Button variant="outline" onClick={handleGoHome}>
                Go Home
              </Button>
            </div>

            <p className="text-xs text-center text-muted-foreground">
              Need help? Contact support at support@storesync.com
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show warning banner if expiring soon
  if (daysUntilExpiration <= 7 && daysUntilExpiration > 0) {
    return (
      <>
        <Alert variant="default" className="rounded-none border-x-0 border-t-0">
          <Clock className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>
              ⚠️ Your subscription expires in {daysUntilExpiration} day{daysUntilExpiration !== 1 ? 's' : ''}. 
              <span className="font-medium"> Renew now to avoid interruption.</span>
            </span>
            <Button size="sm" variant="default">
              Renew Now
            </Button>
          </AlertDescription>
        </Alert>
        {children}
      </>
    );
  }

  return <>{children}</>;
}
