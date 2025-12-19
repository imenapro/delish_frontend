import { ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { 
  LayoutDashboard, 
  Store, 
  Package, 
  ShoppingCart, 
  Truck, 
  MessageSquare,
  Wallet,
  LogOut,
  ChefHat,
  Shield,
  CreditCard,
  DollarSign,
  Calendar,
  PackageOpen,
  FileText
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { user, roles, signOut } = useAuth();
  const location = useLocation();

  const hasRole = (role: string) => roles.some(r => r.role === role);
  const isAdmin = hasRole('admin');

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard, show: true },
    { name: 'POS', href: '/pos', icon: CreditCard, show: hasRole('seller') || isAdmin || hasRole('manager') || hasRole('super_admin') || hasRole('branch_manager') },
    { name: 'Staff', href: '/staff', icon: Shield, show: hasRole('super_admin') || hasRole('branch_manager') },
    { name: 'Admin', href: '/admin', icon: Shield, show: isAdmin },
    { name: 'Shops', href: '/shops', icon: Store, show: isAdmin || hasRole('super_admin') || hasRole('branch_manager') },
    { name: 'Products', href: '/products', icon: Package, show: isAdmin || hasRole('manager') || hasRole('super_admin') || hasRole('branch_manager') },
    { name: 'Orders', href: '/orders', icon: ShoppingCart, show: true },
    { name: 'Kitchen', href: '/kitchen', icon: ChefHat, show: hasRole('manager') || isAdmin || hasRole('super_admin') || hasRole('branch_manager') },
    { name: 'Inventory', href: '/inventory', icon: PackageOpen, show: hasRole('store_keeper') || isAdmin || hasRole('super_admin') || hasRole('branch_manager') },
    { name: 'Finance', href: '/finance', icon: DollarSign, show: hasRole('accountant') || isAdmin || hasRole('super_admin') },
    { name: 'Workforce', href: '/workforce', icon: Calendar, show: isAdmin || hasRole('super_admin') || hasRole('branch_manager') },
    { name: 'Reports', href: '/reports', icon: FileText, show: hasRole('accountant') || isAdmin || hasRole('super_admin') || hasRole('branch_manager') },
    { name: 'Delivery', href: '/delivery', icon: Truck, show: hasRole('delivery') || isAdmin || hasRole('super_admin') },
    { name: 'Chat', href: '/chat', icon: MessageSquare, show: true },
    { name: 'Wallet', href: '/wallet', icon: Wallet, show: true },
  ];

  const getInitials = () => {
    return user?.email?.charAt(0).toUpperCase() || 'U';
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card">
        <div className="flex h-16 items-center border-b border-border px-6">
          <h1 className="text-xl font-bold text-primary">BakeSync</h1>
        </div>
        <nav className="space-y-1 p-4">
          {navigation.map((item) => {
            if (!item.show) return null;
            const isActive = location.pathname === item.href;
            return (
              <Link key={item.name} to={item.href}>
                <Button
                  variant={isActive ? 'secondary' : 'ghost'}
                  className="w-full justify-start"
                >
                  <item.icon className="mr-3 h-5 w-5" />
                  {item.name}
                </Button>
              </Link>
            );
          })}
        </nav>
        <div className="absolute bottom-0 w-64 border-t border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarFallback className="bg-primary text-primary-foreground">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-sm font-medium">{user?.email}</p>
              <p className="text-xs text-muted-foreground capitalize">
                {roles[0]?.role || 'User'}
              </p>
            </div>
            <NotificationBell />
            <Button
              variant="ghost"
              size="icon"
              onClick={signOut}
              title="Sign out"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
