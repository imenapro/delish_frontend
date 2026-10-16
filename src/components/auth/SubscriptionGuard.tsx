import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStoreContext } from '@/contexts/StoreContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Clock, Mail, ShieldAlert } from 'lucide-react';
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
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!store) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Store Not Found</CardTitle>
            <CardDescription>The store you&apos;re looking for doesn&apos;t exist.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleGoHome}>Go to Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isExpired) {
    const rawSuspensionDate = store.suspensionDate || store.subscriptionEndDate;
    const parsedSuspensionDate = rawSuspensionDate ? new Date(rawSuspensionDate) : null;
    const suspensionDate = parsedSuspensionDate && !Number.isNaN(parsedSuspensionDate.getTime())
      ? parsedSuspensionDate.toLocaleDateString()
      : '—';

    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-muted/50 p-4 sm:p-8">
        <Card className="w-full max-w-2xl overflow-hidden border-border/70 shadow-lg">
          <div className="h-1.5 bg-amber-500" aria-hidden="true" />
          <CardHeader className="items-center gap-4 px-6 pt-8 text-center sm:px-10 sm:pt-10">
            <div className="rounded-full bg-amber-500/10 p-4 text-amber-700 dark:text-amber-400">
              <ShieldAlert className="h-8 w-8" aria-hidden="true" />
            </div>
            <div className="space-y-2">
              <CardTitle className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Service Temporarily Suspended
              </CardTitle>
              <CardDescription className="mx-auto max-w-lg text-base leading-relaxed">
                Access to your store is currently suspended due to an outstanding payment.
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-6 px-6 pb-8 sm:px-10 sm:pb-10">
            <dl className="divide-y rounded-lg border bg-muted/30 px-4 sm:px-5">
              <div className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <dt className="text-sm text-muted-foreground">Store</dt>
                <dd className="break-words text-sm font-medium text-foreground sm:text-right">{store.name}</dd>
              </div>
              <div className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <dt className="text-sm text-muted-foreground">Status</dt>
                <dd className="text-sm font-medium text-foreground sm:text-right">Payment overdue</dd>
              </div>
              <div className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <dt className="text-sm text-muted-foreground">Suspended</dt>
                <dd className="text-sm font-medium text-foreground sm:text-right">{suspensionDate}</dd>
              </div>
            </dl>

            <p className="text-center text-sm leading-relaxed text-muted-foreground">
              Please contact support to regularize your account and restore access.
            </p>

            <div className="rounded-lg border bg-card px-4 py-4 text-center">
              <p className="text-sm font-medium text-foreground">Need help?</p>
              <a
                href="mailto:imenabrain@gmail.com"
                className="mt-1 inline-flex max-w-full items-center justify-center gap-2 break-all text-sm text-primary underline-offset-4 hover:underline"
              >
                <Mail className="h-4 w-4 shrink-0" aria-hidden="true" />
                Contact support at imenabrain@gmail.com.
              </a>
            </div>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (store.status.trim().toLowerCase() !== 'bought' && daysUntilExpiration <= 7 && daysUntilExpiration > 0) {
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
