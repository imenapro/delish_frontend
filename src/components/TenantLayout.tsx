import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useStoreContext } from '@/contexts/StoreContext';
import { useAuth } from '@/hooks/useAuth';
import { SubscriptionGuard } from '@/components/auth/SubscriptionGuard';
import { TenantSidebar } from '@/components/navigation/TenantSidebar';
import { Button } from '@/components/ui/button';
import { Loader2, Menu } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

export function TenantLayout() {
  const { loading } = useStoreContext();
  const { loading: authLoading } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  if (loading || authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <SubscriptionGuard>
      <div className="flex min-h-screen w-full bg-background">
        {/* Desktop Sidebar */}
        <div className="hidden md:block relative">
          <TenantSidebar 
            collapsed={sidebarCollapsed} 
            onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} 
          />
        </div>

        {/* Mobile Sidebar */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button 
              variant="ghost" 
              size="icon" 
              className="fixed top-4 left-4 z-50"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64">
            <TenantSidebar 
              collapsed={false} 
              onToggle={() => setMobileOpen(false)} 
            />
          </SheetContent>
        </Sheet>

        {/* Main Content */}
        <main className={cn("flex-1 overflow-y-auto")}>
          <Outlet />
        </main>
      </div>
    </SubscriptionGuard>
  );
}
